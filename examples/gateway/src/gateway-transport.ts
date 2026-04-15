import {
  readSSEStream,
  lastUserContent,
  type ChatRequest,
  type ChatTransport,
  type StreamPart,
} from '@axe-ai-sdk/core'

export type GatewayTransportState = {
  conversationId: string | null
}

export type GatewayTransportOptions = {
  /** Endpoint URL. */
  url: string
  /**
   * Build the POST body. Receives the chat request and the current transport
   * state (so you can include `conversationId` if the server tracks sessions).
   *
   * Default: `{ content: <last user message>, conversationId? }` —
   * matches the Azure ca-chatbot-backend dialect.
   */
  prepareBody?: (
    request: ChatRequest,
    state: GatewayTransportState
  ) => Record<string, unknown>
  /** Extra headers (static or resolver). */
  headers?: Record<string, string> | (() => Record<string, string>)
}

const defaultPrepareBody = (
  request: ChatRequest,
  state: GatewayTransportState
): Record<string, unknown> => {
  const body: Record<string, unknown> = { content: lastUserContent(request) }
  if (state.conversationId) body.conversationId = state.conversationId
  return body
}

/**
 * Adapter for the Azure "ca-chatbot-backend" gateway (and similar dialects).
 *
 * The gateway speaks its own SSE dialect (not `axe-wire/1`), so we implement
 * `ChatTransport.send` directly and translate each event into `StreamPart`.
 *
 * Event dialect:
 *   conversation_created → metadata { data: { conversationId } }
 *   message_created      → message-start { messageId }
 *   thinking             → thinking-step { step: { agent, status, thought } }
 *   message              → text-delta    { delta: data.content }
 *   done                 → finish        { reason: 'stop' }
 *
 * The request body shape is configurable via `prepareBody` so the same
 * adapter can talk to servers that expect `userQuery`, `prompt`, etc.
 */
export function createGatewayTransport(
  options: GatewayTransportOptions
): ChatTransport {
  const state: GatewayTransportState = { conversationId: null }
  const prepareBody = options.prepareBody ?? defaultPrepareBody

  return {
    async *send(request: ChatRequest): AsyncIterable<StreamPart> {
      const body = prepareBody(request, { ...state })
      const headers =
        typeof options.headers === 'function'
          ? options.headers()
          : (options.headers ?? {})

      const res = await fetch(options.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...headers,
        },
        body: JSON.stringify(body),
        signal: request.signal,
      })

      if (!res.ok || !res.body) {
        const text = await safeText(res)
        yield {
          type: 'error',
          error: `${res.status} ${res.statusText}${text ? ` · ${text}` : ''}`,
          code: `HTTP_${res.status}`,
        }
        yield { type: 'finish', reason: 'error' }
        return
      }

      let finished = false
      try {
        for await (const ev of readSSEStream(res.body, request.signal)) {
          const data = tryParseJson(ev.data) ?? {}

          switch (ev.event) {
            case 'conversation_created': {
              const cid = data.conversationId ?? data.conversation_id
              if (typeof cid === 'string') state.conversationId = cid
              yield { type: 'metadata', data: { conversationId: cid } }
              break
            }
            case 'message_created': {
              const mid = data.messageId ?? data.message_id
              yield { type: 'message-start', messageId: mid }
              break
            }
            case 'thinking': {
              yield {
                type: 'thinking-step',
                step: {
                  agent: data.agent ?? 'agent',
                  status: data.status === 'complete' ? 'complete' : 'running',
                  thought: data.thought,
                },
              }
              break
            }
            case 'message': {
              if (typeof data.content === 'string') {
                yield { type: 'text-delta', delta: data.content }
              }
              break
            }
            case 'done': {
              yield { type: 'finish', reason: 'stop' }
              finished = true
              break
            }
            default:
              // Unknown event — ignore, visible in devtools if needed.
              break
          }

          if (finished) break
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          yield { type: 'finish', reason: 'abort' }
          return
        }
        yield {
          type: 'error',
          error: (err as Error)?.message ?? 'Stream read error',
        }
        yield { type: 'finish', reason: 'error' }
        return
      }

      if (!finished) yield { type: 'finish', reason: 'stop' }
    },
  }
}

function tryParseJson(raw: string): any {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300)
  } catch {
    return ''
  }
}

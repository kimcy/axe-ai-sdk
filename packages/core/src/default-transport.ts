import { readSSEStream } from './sse-parser'
import { type ChatTransport } from './transport'
import { type ChatRequest, type StreamPart } from './types'

/**
 * axe-wire/1 — canonical SSE wire format.
 *
 * Each SSE event's `event:` name equals a `StreamPart.type`, and the `data:`
 * payload is a JSON object containing every other field of that StreamPart.
 *
 * Example:
 *   event: text-delta
 *   data: {"delta":"안녕"}
 *
 *   event: thinking-step
 *   data: {"step":{"agent":"planner","status":"running","thought":"..."}}
 *
 *   event: finish
 *   data: {"reason":"stop"}
 *
 * Servers that can emit this shape need no mapping configuration. Servers
 * whose format differs should implement `ChatTransport.send` directly.
 */
const KNOWN_TYPES = new Set<StreamPart['type']>([
  'message-start',
  'text-delta',
  'thinking-step',
  'tool-call',
  'tool-result',
  'citation',
  'metadata',
  'error',
  'finish',
])

export type SSEDebugEvent = {
  event: string
  data: string
  parts: StreamPart[]
  ts: number
}

export type TransportState = {
  conversationId: string | null
}

export type DefaultChatTransportOptions = {
  /** Endpoint URL. */
  api: string
  /** Extra headers (static or resolver). */
  headers?: Record<string, string> | (() => Record<string, string>)
  /**
   * Build the POST body from the chat request + transport state.
   * Default: `{ messages, conversationId? }`.
   */
  prepareBody?: (
    request: ChatRequest,
    state: TransportState
  ) => Record<string, unknown>
  /** Custom fetch (useful for SSR/testing). */
  fetch?: typeof fetch
}

const defaultPrepareBody = (
  request: ChatRequest,
  state: TransportState
): Record<string, unknown> => {
  const body: Record<string, unknown> = { messages: request.messages }
  if (state.conversationId) body.conversationId = state.conversationId
  return body
}

/**
 * HTTP+SSE chat transport speaking the canonical `axe-wire/1` format.
 *
 * - `api` 로 POST 스트리밍 호출
 * - 서버 SSE 이벤트(`event:` 이름이 `StreamPart.type`) 를 그대로 yield
 * - `metadata.conversationId` 자동 추적 → 다음 요청 body 에 포함
 * - `onSSE(listener)` 로 raw 이벤트 구독 (디버그/시각화용)
 *
 * 서버 포맷이 canonical 이 아니면 `ChatTransport.send` 를 직접 구현하세요.
 */
export class DefaultChatTransport implements ChatTransport {
  private state: TransportState = { conversationId: null }
  private listeners = new Set<(e: SSEDebugEvent) => void>()
  private fetchImpl: typeof fetch

  constructor(private opts: DefaultChatTransportOptions) {
    this.fetchImpl = opts.fetch ?? ((...args) => fetch(...args))
  }

  /** Subscribe to raw SSE events. Returns an unsubscribe function. */
  onSSE(listener: (e: SSEDebugEvent) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Current conversation id captured from metadata events. */
  getConversationId(): string | null {
    return this.state.conversationId
  }

  /** Reset conversation state (e.g. when starting a new chat). */
  reset(): void {
    this.state.conversationId = null
  }

  async *send(request: ChatRequest): AsyncIterable<StreamPart> {
    const prepareBody = this.opts.prepareBody ?? defaultPrepareBody
    const body = prepareBody(request, { ...this.state })
    const headers =
      typeof this.opts.headers === 'function'
        ? this.opts.headers()
        : (this.opts.headers ?? {})

    const res = await this.fetchImpl(this.opts.api, {
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
        const parts = interpret(ev.event, ev.data)
        this.emit({ event: ev.event, data: ev.data, parts, ts: Date.now() })
        for (const part of parts) {
          if (part.type === 'metadata') {
            const cid = part.data?.conversationId
            if (typeof cid === 'string') this.state.conversationId = cid
          }
          yield part
          if (part.type === 'finish') {
            finished = true
            break
          }
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
  }

  private emit(e: SSEDebugEvent): void {
    for (const l of this.listeners) l(e)
  }
}

function interpret(event: string, rawData: string): StreamPart[] {
  if (rawData === '[DONE]') return [{ type: 'finish', reason: 'stop' }]
  if (!KNOWN_TYPES.has(event as StreamPart['type'])) return []
  const data = tryParseJson(rawData) ?? {}
  return [{ type: event, ...data } as StreamPart]
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

/** Helper: extract the last user message's content from a chat request. */
export function lastUserContent(request: ChatRequest): string {
  for (let i = request.messages.length - 1; i >= 0; i--) {
    const m = request.messages[i]
    if (m && m.role === 'user') return m.content
  }
  return ''
}

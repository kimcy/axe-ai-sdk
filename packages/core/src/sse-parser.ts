export type SSEEvent = {
  event: string
  data: string
  id?: string
  retry?: number
}

/**
 * Incremental SSE parser. Handles partial chunks, CRLF/LF, multi-line data,
 * comments (`:`), and event field. Call push() with each decoded chunk; it
 * yields fully-formed events once an empty line terminates them.
 */
export class SSEParser {
  private buffer = ''
  private eventType = ''
  private dataLines: string[] = []
  private lastEventId: string | undefined
  private retry: number | undefined

  push(chunk: string): SSEEvent[] {
    this.buffer += chunk
    const events: SSEEvent[] = []

    while (true) {
      const nlIndex = this.buffer.indexOf('\n')
      if (nlIndex === -1) break

      let line = this.buffer.slice(0, nlIndex)
      this.buffer = this.buffer.slice(nlIndex + 1)
      if (line.endsWith('\r')) line = line.slice(0, -1)

      if (line === '') {
        if (this.dataLines.length > 0 || this.eventType) {
          events.push({
            event: this.eventType || 'message',
            data: this.dataLines.join('\n'),
            id: this.lastEventId,
            retry: this.retry,
          })
        }
        this.eventType = ''
        this.dataLines = []
        this.retry = undefined
        continue
      }

      if (line.startsWith(':')) continue

      const colonIdx = line.indexOf(':')
      let field: string
      let value: string
      if (colonIdx === -1) {
        field = line
        value = ''
      } else {
        field = line.slice(0, colonIdx)
        value = line.slice(colonIdx + 1)
        if (value.startsWith(' ')) value = value.slice(1)
      }

      switch (field) {
        case 'event':
          this.eventType = value
          break
        case 'data':
          this.dataLines.push(value)
          break
        case 'id':
          this.lastEventId = value
          break
        case 'retry': {
          const n = Number(value)
          if (Number.isFinite(n)) this.retry = n
          break
        }
        default:
          break
      }
    }

    return events
  }

  /** Flush any trailing buffered event without a blank-line terminator. */
  flush(): SSEEvent[] {
    if (this.dataLines.length === 0 && !this.eventType) return []
    const ev: SSEEvent = {
      event: this.eventType || 'message',
      data: this.dataLines.join('\n'),
      id: this.lastEventId,
      retry: this.retry,
    }
    this.eventType = ''
    this.dataLines = []
    this.retry = undefined
    return [ev]
  }

  reset(): void {
    this.buffer = ''
    this.eventType = ''
    this.dataLines = []
    this.retry = undefined
  }
}

/**
 * Convert a `ReadableStream<Uint8Array>` (e.g. from fetch().body) into an
 * async iterable of SSE events. Safe for chunks that split mid-line or
 * mid-UTF8 code point (uses TextDecoder streaming mode).
 */
export async function* readSSEStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<SSEEvent, void, void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const parser = new SSEParser()

  const onAbort = () => {
    reader.cancel().catch(() => {})
  }
  if (signal) {
    if (signal.aborted) onAbort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        const tail = decoder.decode()
        if (tail) {
          for (const ev of parser.push(tail)) yield ev
        }
        for (const ev of parser.flush()) yield ev
        return
      }
      const text = decoder.decode(value, { stream: true })
      for (const ev of parser.push(text)) yield ev
    }
  } finally {
    signal?.removeEventListener('abort', onAbort)
    try {
      reader.releaseLock()
    } catch {
      // already cancelled
    }
  }
}

export class ChatError extends Error {
  code?: string
  cause?: unknown
  constructor(message: string, opts?: { code?: string; cause?: unknown }) {
    super(message)
    this.name = 'ChatError'
    this.code = opts?.code
    this.cause = opts?.cause
  }
}

export class AbortedError extends ChatError {
  constructor() {
    super('Request aborted', { code: 'ABORTED' })
    this.name = 'AbortedError'
  }
}

export class TimeoutError extends ChatError {
  constructor(message = 'Idle timeout exceeded') {
    super(message, { code: 'TIMEOUT' })
    this.name = 'TimeoutError'
  }
}

export function isAbortError(err: unknown): boolean {
  return (
    err instanceof AbortedError ||
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  )
}

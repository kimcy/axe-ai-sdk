import { type ChatRequest, type StreamPart } from './types'

export interface ChatTransport {
  /**
   * Send a chat request and return an async iterable of stream parts.
   * The transport owns wire-format parsing; it MUST emit `finish` last
   * (or throw) and MUST honor `request.signal`.
   */
  send(request: ChatRequest): AsyncIterable<StreamPart>
}

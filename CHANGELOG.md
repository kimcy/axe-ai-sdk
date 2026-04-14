# Changelog

All notable changes to `@axe-ai-sdk/*` packages are documented here.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-04-14

### @axe-ai-sdk/core

Initial release.

- `SSEParser` — incremental Server-Sent Events parser with robust handling
  of CRLF/LF, multi-line `data:` fields, `event:` / `id:` / `retry:` fields,
  comments, and partial chunks at arbitrary byte boundaries.
- `readSSEStream(body, signal)` — async generator over `ReadableStream<Uint8Array>`,
  UTF-8 stream-safe via `TextDecoder({ stream: true })`, respects `AbortSignal`.
- `ChatTransport` interface — swap-in adapter contract. Transports emit
  `StreamPart` async iterables; they own wire-format parsing.
- `StreamPart` discriminated union — `message-start`, `text-delta`,
  `thinking-step`, `tool-call`, `tool-result`, `citation`, `metadata`,
  `error`, `finish`. Agent and RAG metadata are first-class.
- `ChatController` — request-scoped state machine.
  - Per-request isolation (no interleaved streams).
  - Idle-timeout (chunk-gap-based, not total).
  - Applies `StreamPart`s to a message with proper status transitions
    (`pending` → `streaming` → `done` / `error` / `aborted`).
  - Thinking-step merge semantics (completes in-progress `running` entries).
  - `submit(content, { metadata })`, `reload()`, `stop()`.
- Errors: `ChatError`, `AbortedError`, `TimeoutError`, `isAbortError()`.

### @axe-ai-sdk/react

Initial release.

- `useChat(options)` — returns `messages`, `input`, `handleInputChange`,
  `handleSubmit`, `submit`, `stop`, `reload`, `setMessages`, `clear`,
  `status`, `isStreaming`, `error`. Familiar Vercel-AI-SDK-style surface.
- `createStoragePersistence({ key, storage?, sanitize? })` — opt-in
  `localStorage`/`sessionStorage` persistence. Sanitizes in-flight messages
  by default so a refresh never resurrects half-streamed state.
- `onFinish` / `onError` callbacks.

### Not yet included

- Automatic reconnect with `Last-Event-ID`. Requires backend cursor support.
  Use `reload()` for manual retry after an error.
- IndexedDB persistence adapter. `localStorage` is the only built-in.
- Tool-call execution helpers. Transports may emit `tool-call` /
  `tool-result` parts; client-side execution loops are not yet abstracted.

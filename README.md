# axd-ai-sdk

React-first streaming chat SDK. Adapter-based, SSE/stream safe, agent/tool/RAG
metadata first-class.

Inspired by Vercel's `ai` SDK but adapter-centric: bring your own backend
(OpenAI, Anthropic, MCP, custom gateway) by writing one `ChatTransport`.

## Packages

| Package | Description |
| --- | --- |
| [`@axd-ai-sdk/core`](packages/core) | Transport-agnostic streaming, SSE parser, `ChatController`, errors, types |
| [`@axd-ai-sdk/react`](packages/react) | `useChat` hook, optimistic UI, localStorage persistence |

## Features

- **Robust SSE parsing** — handles CRLF/LF, multi-line `data:`, comments,
  partial chunks at arbitrary byte boundaries, UTF-8 stream-safe.
- **Adapter pattern** — implement `ChatTransport.send(request)` once,
  swap backends freely.
- **Request isolation** — per-request abort controllers, no interleaved
  streams when users fire multiple messages in quick succession.
- **Idle timeout** — chunk-gap-based, not total request timeout
  (appropriate for long-running generations).
- **Agent / tool / RAG ready** — `StreamPart` union carries `thinking-step`,
  `tool-call`, `tool-result`, `citation`, and arbitrary `metadata`.
- **Typed status machine** — each message tracks `pending` → `streaming`
  → `done` / `error` / `aborted`.
- **Persistence** — opt-in `localStorage`, with in-flight state sanitization
  on save so refreshes never resurrect half-streamed messages.
- **Tiny footprint** — core ~11 KB, react ~4 KB (minified, pre-gzip).
  React is a peer dependency; core has zero runtime dependencies.

## Local development

```bash
pnpm install
pnpm -r build
```

Each package has `pnpm build`, `pnpm dev` (watch), `pnpm typecheck`,
and `pnpm clean`.

### Consuming from another repo during dev

Two options:

**1. Tarball via `pnpm pack` + `file:` reference** (reproducible, closest to
published behavior):

```bash
cd packages/core && pnpm pack
cd ../react && pnpm pack
```

In the consumer's `package.json`:

```json
{
  "dependencies": {
    "@axd-ai-sdk/core": "file:../axd-ai-sdk/packages/core/axd-ai-sdk-core-0.0.1.tgz",
    "@axd-ai-sdk/react": "file:../axd-ai-sdk/packages/react/axd-ai-sdk-react-0.0.1.tgz"
  },
  "pnpm": {
    "overrides": {
      "@axd-ai-sdk/core": "file:../axd-ai-sdk/packages/core/axd-ai-sdk-core-0.0.1.tgz"
    }
  }
}
```

The `pnpm.overrides` entry is needed because `@axd-ai-sdk/react` depends on
`@axd-ai-sdk/core` via `workspace:*`, which pnpm rewrites to `0.0.1` on pack
and then tries to fetch from the registry. The override forces it to use the
local tarball.

**2. Symlink via `link:` protocol** (edit-and-reload dev loop, no repack):

```json
{
  "dependencies": {
    "@axd-ai-sdk/core": "link:../axd-ai-sdk/packages/core",
    "@axd-ai-sdk/react": "link:../axd-ai-sdk/packages/react"
  }
}
```

Run `pnpm -r --filter @axd-ai-sdk/* dev` in this repo for watch-mode rebuilds.
The consumer picks up changes as soon as `dist/` updates.

## Quick example

```tsx
import { useChat } from '@axd-ai-sdk/react'
import { createMyTransport } from './my-transport'

const transport = createMyTransport({ url: '/api/chat' })

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isStreaming, stop } =
    useChat({ transport, persistence: { key: 'chat-demo' } })

  return (
    <form onSubmit={handleSubmit}>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role}</strong>: {m.content}
        </div>
      ))}
      <input value={input} onChange={handleInputChange} />
      {isStreaming ? (
        <button type='button' onClick={stop}>Stop</button>
      ) : (
        <button type='submit'>Send</button>
      )}
    </form>
  )
}
```

See [`examples/gateway/`](examples/gateway) for a full runnable example that
includes a mock SSE transport, request metadata, thinking-step rendering, and
error/retry flows.

## License

[MIT](LICENSE)

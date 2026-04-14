# axd-ai-sdk

React-first streaming chat SDK. Adapter-based, SSE/stream safe, tool/thinking metadata first-class.

## Packages

- `@axd-ai-sdk/core` — transport-agnostic streaming, message store, abort/retry/timeout, SSE parser
- `@axd-ai-sdk/react` — `useChat` hook, optimistic UI, localStorage persistence

## Install (workspace dev)

```bash
pnpm install
pnpm build
```

## Quick start

```tsx
import { useChat } from '@axd-ai-sdk/react'
import { createGatewayTransport } from './gateway-transport'

const transport = createGatewayTransport({ baseUrl: '/api' })

export function Chat() {
  const { messages, input, setInput, handleSubmit, status, stop } = useChat({
    transport,
    persistence: { key: 'chat-demo' },
  })
  // ...
}
```

## Design

See `packages/core/src/types.ts` for `StreamPart` union. Transports emit parts,
core assembles them into `Message` objects with per-message `status`.

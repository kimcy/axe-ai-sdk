# @axe-ai-sdk/react

React hooks for `@axe-ai-sdk/core`. Familiar `useChat` API.

## Install

```bash
pnpm add @axe-ai-sdk/core @axe-ai-sdk/react
```

Peer dependency: `react >= 18`.

## Quick start

```tsx
import { useChat, type ChatTransport } from '@axe-ai-sdk/react'
import { createMyTransport } from './my-transport'

const transport: ChatTransport = createMyTransport({ url: '/api/chat' })

export function Chat() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isStreaming,
    stop,
    reload,
    error,
  } = useChat({
    transport,
    persistence: { key: 'chat-demo' },
    idleTimeoutMs: 30_000,
    onFinish: (message) => console.log('done', message),
  })

  return (
    <form onSubmit={handleSubmit}>
      <ul>
        {messages.map((m) => (
          <li key={m.id}>
            <strong>{m.role}</strong> [{m.status}]: {m.content}
            {m.thinkingSteps?.map((s, i) => (
              <div key={i}>
                {s.agent} — {s.status} — {s.thought}
              </div>
            ))}
          </li>
        ))}
      </ul>
      <input value={input} onChange={handleInputChange} />
      {isStreaming ? (
        <button type='button' onClick={stop}>
          Stop
        </button>
      ) : (
        <button type='submit'>Send</button>
      )}
      {error && <button onClick={() => reload()}>Retry</button>}
    </form>
  )
}
```

## API

```ts
useChat(options: UseChatOptions): {
  messages: Message[]
  input: string
  setInput(value: string): void
  handleInputChange(e: ChangeEvent): void
  handleSubmit(e?: FormEvent, options?: SubmitOptions): void
  submit(content: string, options?: SubmitOptions): void
  stop(): void
  reload(options?: { metadata? }): void
  setMessages(messages: Message[]): void
  clear(): void
  status: 'idle' | 'submitting' | 'streaming' | 'error'
  isStreaming: boolean
  error: Error | null
}
```

### Options

| Option | Type | Notes |
| --- | --- | --- |
| `transport` | `ChatTransport` | Required. Drives the wire format. |
| `initialMessages` | `Message[]` | Seed state. |
| `idleTimeoutMs` | `number` | Max ms between stream parts before abort. `0` disables. |
| `persistence` | `{ key, storage?, sanitize? }` | Opt-in `localStorage`/`sessionStorage`. |
| `onError` | `(err: Error) => void` | Fires on stream failure. |
| `onFinish` | `(msg: Message) => void` | Fires when an assistant message lands on `done` or `error`. |

### Submit metadata

Pass per-request metadata that the transport reads from `request.metadata`:

```tsx
handleSubmit(e, { metadata: { planSnapshot } })
// or
submit('Hello', { metadata: { tool: 'search' } })
```

## License

MIT

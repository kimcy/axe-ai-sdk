import { useMemo, useState } from 'react'
import {
  useChat,
  Markdown,
  lastUserContent,
  bearer,
  // bearerFromCookie, // [B] 용 — 아래 주석 참고
} from '@axe-ai-sdk/react'
// import { createMockTransport } from './mock-transport'
import { createGatewayTransport } from './gateway-transport'

const GATEWAY_URL =
  'https://ca-chatbot-backend.wittybay-7be49843.koreacentral.azurecontainerapps.io/api/v1/gateway/messages'

// const GATEWAY_TOKEN_COOKIE = 'gateway_token' // [B] 용

export function App() {
  // const transport = useMemo(() => createMockTransport(), [])
  const transport = useMemo(
    () =>
      createGatewayTransport({
        url: GATEWAY_URL,

        // [A] env 폴백 포함 (dev 편의용, 현재 활성)
        //   VITE_GATEWAY_TOKEN 이 있으면 우선, 없으면 쿠키에서 읽음
        headers: () => bearer(import.meta.env.VITE_GATEWAY_TOKEN),

        // [B] 쿠키만 쓰는 운영용 — 위 [A] 를 지우고 이 한 줄로 교체
        // headers: bearerFromCookie(GATEWAY_TOKEN_COOKIE),

        prepareBody: (request, { conversationId }) => ({
          content: lastUserContent(request),
          ...(conversationId ? { conversationId } : {}),
        }),
      }),
    []
  )

  const [input, setInput] = useState('')
  const [error, setError] = useState<Error | null>(null)

  const {
    messages,
    conversationId,
    isStreaming,
    submit,
    stop,
    resetChat,
  } = useChat({
    transport,
    conversationIdStorageKey: 'axe-ai-sdk-example-cid',
    persistence: { key: 'axe-ai-sdk-example' },
    idleTimeoutMs: 65_000,
    onError: (e) => setError(e),
    onFinish: () => setError(null),
  })

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault()
    const content = input.trim()
    if (!content) return
    setError(null)
    submit(content)
    setInput('')
  }

  const handleReset = () => {
    setError(null)
    resetChat()
  }

  return (
    <div className='app'>
      <header>
        <h1>axe-ai-sdk example</h1>
        <div className='status'>
          {isStreaming ? (
            <code>streaming</code>
          ) : (
            <code>idle</code>
          )}
          {conversationId && (
            <span className='cid'> · cid: <code>{conversationId.slice(0, 8)}</code></span>
          )}
          {error && <span className='error'> · {error.message}</span>}
          <button className='clear' onClick={handleReset} disabled={isStreaming}>
            Reset
          </button>
        </div>
      </header>

      <ul className='messages'>
        {messages.length === 0 && (
          <li className='hint'>
            Type a message to start chatting with the gateway. The
            conversation id is persisted across reloads — hit{' '}
            <code>Reset</code> to start a new session.
          </li>
        )}
        {messages.map((m) => (
          <li key={m.id} className={`msg msg-${m.role}`}>
            <div className='msg-head'>
              <strong>{m.role}</strong>
              <span className={`badge badge-${m.status}`}>{m.status}</span>
            </div>

            {m.thinkingSteps && m.thinkingSteps.length > 0 && (
              <ul className='steps'>
                {m.thinkingSteps.map((s, i) => (
                  <li key={i} className={`step step-${s.status}`}>
                    <strong>{s.agent}</strong> · {s.status}
                    {s.thought ? ` · ${s.thought}` : ''}
                  </li>
                ))}
              </ul>
            )}

            <Markdown>{m.content}</Markdown>

            {m.citations && m.citations.length > 0 && (
              <ul className='citations'>
                {m.citations.map((c) => (
                  <li key={c.id}>
                    📎{' '}
                    <a href={c.url} target='_blank' rel='noreferrer'>
                      {c.title ?? c.url}
                    </a>
                    {c.snippet && <div className='snippet'>{c.snippet}</div>}
                  </li>
                ))}
              </ul>
            )}

            {m.error && <div className='err'>⚠ {m.error}</div>}
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className='composer'>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Type a message...'
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button type='button' onClick={stop}>
            Stop
          </button>
        ) : (
          <button type='submit' disabled={!input.trim()}>
            Send
          </button>
        )}
      </form>
    </div>
  )
}

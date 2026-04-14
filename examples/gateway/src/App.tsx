import { useMemo } from 'react'
import { useChat } from '@axe-ai-sdk/react'
import { createMockTransport } from './mock-transport'

export function App() {
  const transport = useMemo(() => createMockTransport(), [])

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isStreaming,
    status,
    error,
    stop,
    reload,
    clear,
  } = useChat({
    transport,
    idleTimeoutMs: 15_000,
    persistence: { key: 'axe-ai-sdk-example' },
  })

  return (
    <div className='app'>
      <header>
        <h1>axe-ai-sdk example</h1>
        <div className='status'>
          status: <code>{status}</code>
          {error && <span className='error'> · {error.message}</span>}
          <button className='clear' onClick={clear} disabled={isStreaming}>
            Clear
          </button>
        </div>
      </header>

      <ul className='messages'>
        {messages.length === 0 && (
          <li className='hint'>
            Try typing a message. Include the word <code>fail</code> to see
            the error path, or <code>slow</code> to slow down the stream.
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

            <div className='content'>{m.content}</div>

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
          onChange={handleInputChange}
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
        {status === 'error' && (
          <button type='button' onClick={() => reload()}>
            Retry
          </button>
        )}
      </form>
    </div>
  )
}

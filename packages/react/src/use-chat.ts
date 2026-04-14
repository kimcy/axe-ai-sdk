import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ChatController,
  type ChatTransport,
  type ControllerStatus,
  type Message,
  type SubmitOptions,
} from '@axd-ai-sdk/core'
import {
  type PersistenceOptions,
  createStoragePersistence,
} from './persistence'

export type UseChatOptions = {
  transport: ChatTransport
  initialMessages?: Message[]
  idleTimeoutMs?: number
  persistence?: PersistenceOptions
  onError?: (error: Error) => void
  onFinish?: (message: Message) => void
}

export type UseChatReturn = {
  messages: Message[]
  input: string
  setInput: (value: string) => void
  handleInputChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void
  handleSubmit: (e?: FormEvent, options?: SubmitOptions) => void
  submit: (content: string, options?: SubmitOptions) => void
  stop: () => void
  reload: (options?: Pick<SubmitOptions, 'metadata'>) => void
  setMessages: (messages: Message[]) => void
  clear: () => void
  status: ControllerStatus
  isStreaming: boolean
  error: Error | null
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const optsRef = useRef(options)
  optsRef.current = options

  const persistence = useMemo(
    () =>
      options.persistence ? createStoragePersistence(options.persistence) : null,
    // Only re-create if the key changes; other fields are stable by convention.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.persistence?.key]
  )

  const [messages, setMessagesState] = useState<Message[]>(() => {
    const persisted = persistence?.load()
    return persisted ?? options.initialMessages ?? []
  })
  const [status, setStatus] = useState<ControllerStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [input, setInput] = useState('')

  const controllerRef = useRef<ChatController | null>(null)

  if (controllerRef.current === null) {
    controllerRef.current = new ChatController({
      transport: options.transport,
      idleTimeoutMs: options.idleTimeoutMs,
      initialMessages: messages,
      onMessagesChange: (next) => {
        setMessagesState(next)
        persistence?.save(next)
        const last = next[next.length - 1]
        if (
          last &&
          last.role === 'assistant' &&
          (last.status === 'done' || last.status === 'error')
        ) {
          optsRef.current.onFinish?.(last)
        }
      },
      onStatusChange: (s) => {
        setStatus(s)
        if (s === 'error') {
          const err = controllerRef.current?.getError() ?? null
          setError(err)
          if (err) optsRef.current.onError?.(err)
        } else if (s === 'idle') {
          setError(null)
        }
      },
    })
  }

  useEffect(() => {
    return () => {
      controllerRef.current?.stop()
    }
  }, [])

  const submit = useCallback((content: string, options?: SubmitOptions) => {
    const trimmed = content.trim()
    if (!trimmed) return
    void controllerRef.current?.submit(trimmed, options)
  }, [])

  const handleSubmit = useCallback(
    (e?: FormEvent, options?: SubmitOptions) => {
      e?.preventDefault()
      if (!input.trim()) return
      submit(input, options)
      setInput('')
    },
    [input, submit]
  )

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInput(e.target.value)
    },
    []
  )

  const stop = useCallback(() => {
    controllerRef.current?.stop()
  }, [])

  const reload = useCallback(
    (options?: Pick<SubmitOptions, 'metadata'>) => {
      void controllerRef.current?.reload(options)
    },
    []
  )

  const setMessages = useCallback(
    (next: Message[]) => {
      controllerRef.current?.setMessages(next)
    },
    []
  )

  const clear = useCallback(() => {
    controllerRef.current?.stop()
    controllerRef.current?.setMessages([])
    persistence?.clear()
  }, [persistence])

  return {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    submit,
    stop,
    reload,
    setMessages,
    clear,
    status,
    isStreaming: status === 'streaming' || status === 'submitting',
    error,
  }
}

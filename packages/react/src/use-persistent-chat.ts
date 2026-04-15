import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  type ChatTransport,
  type Message,
  type SubmitOptions,
} from '@axe-ai-sdk/core'
import { useChat } from './use-chat'

type TransportWithReset = ChatTransport & { reset?: () => void }

export type UsePersistentChatOptions = {
  transport: ChatTransport
  /** localStorage key used to persist the conversation id. */
  conversationIdStorageKey: string
  /** Custom Storage (defaults to window.localStorage). */
  storage?: Storage
  idleTimeoutMs?: number
  onError?: (error: Error) => void
  onFinish?: (message: Message) => void
}

export type UsePersistentChatReturn<TMessage extends Message = Message> = {
  messages: TMessage[]
  conversationId: string | null
  setConversationId: (id: string | null) => void
  isStreaming: boolean
  submit: (content: string, options?: SubmitOptions) => void
  stop: () => void
  /** Clears messages, resets conversation id + transport state, removes storage entry. */
  resetChat: () => void
  setMessages: Dispatch<SetStateAction<TMessage[]>>
}

/**
 * Thin wrapper over {@link useChat} that adds:
 * - conversationId state persisted to storage
 * - automatic derivation of conversationId from assistant message metadata
 * - resetChat() that clears messages, storage, and transport state
 *
 * Feature-specific concerns (API cancel calls, domain message typing, transport
 * construction) remain in the consumer.
 */
export function usePersistentChat<TMessage extends Message = Message>(
  options: UsePersistentChatOptions
): UsePersistentChatReturn<TMessage> {
  const {
    transport,
    conversationIdStorageKey,
    storage,
    idleTimeoutMs,
    onError,
    onFinish,
  } = options

  const resolvedStorage = useMemo<Storage | null>(() => {
    if (storage) return storage
    if (typeof window === 'undefined') return null
    return window.localStorage
  }, [storage])

  const [conversationId, setConversationId] = useState<string | null>(() =>
    resolvedStorage ? resolvedStorage.getItem(conversationIdStorageKey) : null
  )

  const { messages, setMessages, submit, stop, clear, isStreaming } = useChat({
    transport,
    idleTimeoutMs,
    onError,
    onFinish,
  })

  const latestGatewayConversationId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (!m || m.role !== 'assistant') continue
      const cid = (m.metadata as { conversationId?: unknown } | undefined)
        ?.conversationId
      return typeof cid === 'string' ? cid : null
    }
    return null
  })()

  if (
    latestGatewayConversationId &&
    latestGatewayConversationId !== conversationId
  ) {
    setConversationId(latestGatewayConversationId)
  }

  useEffect(() => {
    if (!resolvedStorage) return
    if (conversationId) {
      resolvedStorage.setItem(conversationIdStorageKey, conversationId)
    } else {
      resolvedStorage.removeItem(conversationIdStorageKey)
    }
  }, [conversationId, conversationIdStorageKey, resolvedStorage])

  const messagesRef = useRef(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const setMessagesCompat: Dispatch<SetStateAction<TMessage[]>> = useCallback(
    (updater) => {
      const prev = messagesRef.current as TMessage[]
      const next =
        typeof updater === 'function'
          ? (updater as (p: TMessage[]) => TMessage[])(prev)
          : updater
      setMessages(next as Message[])
    },
    [setMessages]
  )

  const resetChat = useCallback(() => {
    clear()
    setConversationId(null)
    ;(transport as TransportWithReset).reset?.()
  }, [clear, transport])

  return {
    messages: messages as TMessage[],
    conversationId,
    setConversationId,
    isStreaming,
    submit,
    stop,
    resetChat,
    setMessages: setMessagesCompat,
  }
}

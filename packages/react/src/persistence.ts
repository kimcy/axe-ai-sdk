import { type Message } from '@axe-ai-sdk/core'

export type PersistenceOptions = {
  key: string
  /** Defaults to localStorage. Pass a custom Storage for sessionStorage etc. */
  storage?: Storage
  /** Strip in-flight states before persisting so a reload never shows half-streamed messages. */
  sanitize?: boolean
}

export type Persistence = {
  load(): Message[] | null
  save(messages: Message[]): void
  clear(): void
}

export function createStoragePersistence(
  opts: PersistenceOptions
): Persistence | null {
  if (typeof window === 'undefined') return null
  const storage = opts.storage ?? window.localStorage
  const sanitize = opts.sanitize ?? true

  return {
    load() {
      try {
        const raw = storage.getItem(opts.key)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Message[]
        if (!Array.isArray(parsed)) return null
        return parsed
      } catch {
        return null
      }
    },
    save(messages) {
      try {
        const toSave = sanitize
          ? messages.filter(
              (m) => m.status === 'done' || m.status === 'error'
            )
          : messages
        storage.setItem(opts.key, JSON.stringify(toSave))
      } catch {
        // quota / serialization errors are non-fatal
      }
    },
    clear() {
      try {
        storage.removeItem(opts.key)
      } catch {
        // ignore
      }
    },
  }
}

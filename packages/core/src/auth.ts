/**
 * Build an `Authorization: Bearer <token>` headers object.
 *
 * Returns an empty object when the token is `null` / `undefined` / empty
 * string, so callers can pass an optional value straight through without
 * branching on "has token?".
 *
 * ```ts
 * bearer('abc')           // { Authorization: 'Bearer abc' }
 * bearer(null)            // {}
 * bearer(getEnvToken())   // either, depending on env
 * ```
 */
export function bearer(
  token: string | null | undefined
): Record<string, string> {
  const out: Record<string, string> = {}
  if (token) out.Authorization = `Bearer ${token}`
  return out
}

/**
 * Read a cookie value by name. Returns `null` when not set or when running
 * outside a browser (SSR / tests / Node).
 *
 * Handles URL-encoded names and values. HttpOnly cookies are invisible to
 * `document.cookie` by design — for those, use `credentials: 'include'` on
 * the fetch side instead of trying to read them here.
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  const prefix = `${encodeURIComponent(name)}=`
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length))
    }
  }
  return null
}

/**
 * Build a `headers` resolver that reads a bearer token from a cookie on
 * every request. Returns an empty object when the cookie is missing, so
 * requests still go through without an `Authorization` header.
 *
 * ```ts
 * new DefaultChatTransport({
 *   api: '/api/chat',
 *   headers: bearerFromCookie('gateway_token'),
 * })
 * ```
 *
 * To combine with other headers, call the resolver manually:
 * ```ts
 * const auth = bearerFromCookie('gateway_token')
 * new DefaultChatTransport({
 *   api: '/api/chat',
 *   headers: () => ({ ...auth(), 'X-Tenant': getTenant() }),
 * })
 * ```
 */
export function bearerFromCookie(
  cookieName: string
): () => Record<string, string> {
  return () => bearer(getCookie(cookieName))
}

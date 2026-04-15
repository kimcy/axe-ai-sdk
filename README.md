# axe-ai-sdk

React-first streaming chat SDK. Adapter-based, SSE/stream safe, agent/tool/RAG
metadata first-class.

Inspired by Vercel's `ai` SDK but adapter-centric: point `DefaultChatTransport`
at a server that speaks the canonical **axe-wire/1** SSE format, or implement
one `ChatTransport` for anything else (OpenAI, Anthropic, MCP, legacy
gateways).

## Packages

| Package | Description |
| --- | --- |
| [`@axe-ai-sdk/core`](packages/core) | Transport-agnostic streaming, SSE parser, `ChatController`, `DefaultChatTransport`, errors, types |
| [`@axe-ai-sdk/react`](packages/react) | `useChat` hook, optimistic UI, localStorage persistence, `<Markdown>` renderer, `<SSEDebugPanel>` devtools |
| [`@axe-ai-sdk/docs`](apps/docs) | Nextra 4 기반 한국어 문서 사이트 |

## Documentation

한국어 문서 사이트는 [`apps/docs`](apps/docs) 에 있으며, 루트에서 바로 실행할 수 있습니다.

```bash
pnpm install       # 처음 한 번
pnpm docs:dev      # 개발 서버 → http://localhost:3000
pnpm docs:build    # 프로덕션 빌드
pnpm docs:start    # 빌드 결과 실행
pnpm docs:clean    # .next 정리
```

> `pnpm docs` 는 pnpm 내장 명령(패키지 npm 페이지 열기)과 충돌하므로
> `pnpm docs:dev` 를 사용합니다.

## Example (gateway)

Vite 기반 예제는 [`examples/gateway`](examples/gateway) 에 있습니다. 순수
클라이언트 mock transport 로 동작하므로 서버 준비 없이 바로 실행할 수 있고,
`thinking-step` / `citation` / `text-delta` / `error` 등 canonical
`StreamPart` 전 종류를 시연합니다.

```bash
pnpm -r --filter './packages/*' build   # 패키지 먼저 빌드 (최초 1회)
pnpm example:dev                         # 개발 서버 → http://localhost:5173
pnpm example:build                       # 프로덕션 빌드
pnpm example:preview                     # 빌드 결과 미리보기
```

새 문서는 `apps/docs/content/docs/<섹션>/<slug>.mdx` 에 추가하고, 해당 폴더의
`_meta.js` 에 slug 를 등록하면 사이드바에 자동 반영됩니다.

## axe-wire/1 — canonical SSE 포맷

`DefaultChatTransport` 가 이해하는 유일한 와이어 포맷입니다. 규약은 두 줄.

1. **`event:` 이름 = `StreamPart.type`** (`text-delta`, `thinking-step`,
   `tool-call`, `tool-result`, `citation`, `message-start`, `metadata`,
   `error`, `finish`).
2. **`data:` 는 JSON 객체**. 해당 `StreamPart` 의 나머지 필드를 그대로 담습니다.

```
event: text-delta
data: {"delta":"안녕"}

event: thinking-step
data: {"step":{"agent":"planner","status":"running","thought":"Parsing intent"}}

event: finish
data: {"reason":"stop"}
```

이게 전부입니다. 서버가 이 모양으로만 내려주면 클라이언트 측 매핑 코드는
한 줄도 필요 없습니다.

## Features

- **`DefaultChatTransport` — 제로 컨피그** — HTTP+SSE 전송 계층을 한 줄로.
  서버 이벤트를 `{ type: event, ...data }` 로 읽어 그대로 yield 합니다.
  `conversationId` 자동 추적, `onSSE()` 로 raw 이벤트 구독까지 내장.
- **Auth 헬퍼** — `bearer(token)`, `bearerFromCookie(name)`, `getCookie(name)`
  셋을 `@axe-ai-sdk/core` 에서 제공. `headers` resolver 에 그대로 꽂아서
  쿠키 또는 토큰 문자열에서 `Authorization: Bearer ...` 를 만들 수 있습니다.
  401 리프레시나 OAuth 플로우 같은 앱별 정책은 의도적으로 포함하지 않습니다.
- **Robust SSE parsing** — handles CRLF/LF, multi-line `data:`, comments,
  partial chunks at arbitrary byte boundaries, UTF-8 stream-safe.
- **Adapter pattern** — 규격이 다른 서버라면 `ChatTransport.send(request)` 를
  직접 구현해 백엔드를 자유롭게 교체하세요. 예제:
  [`examples/gateway/src/mock-transport.ts`](examples/gateway/src/mock-transport.ts).
- **Request isolation** — 요청별 AbortController. 사용자가 빠르게 여러 번
  발사해도 스트림이 뒤섞이지 않습니다.
- **Idle timeout** — 총 요청 시간이 아닌 청크 간 간격 기반 (장시간 생성에 적합).
- **Agent / tool / RAG ready** — `StreamPart` 유니언이 `thinking-step`,
  `tool-call`, `tool-result`, `citation`, 임의 `metadata` 를 직접 전달합니다.
- **Typed status machine** — each message tracks `pending` → `streaming`
  → `done` / `error` / `aborted`.
- **Persistence** — opt-in `localStorage`. 저장 직전 in-flight 상태를
  세척하므로 새로고침 후 반쯤 스트리밍된 메시지가 되살아나지 않습니다.
- **`<Markdown>` 렌더러** — GFM(테이블·체크리스트·취소선·자동링크),
  highlight.js 기반 코드 하이라이팅, 코드 블록 복사 버튼 + 언어 배지 내장.
  `@axe-ai-sdk/react/styles.css` 를 import 하면 기본 테마가 적용됩니다.
- **`<SSEDebugPanel>` 드롭인 devtools** — `DefaultChatTransport` 를 구독해
  raw SSE 이벤트와 canonical 매핑 결과를 실시간으로 보여줍니다. canonical
  타입이 아니라서 무시된 이벤트(`partCount: 0`) 는 강조되어 규격 갭이 즉시
  드러납니다.
- **Tiny footprint** — React 는 peer dependency. core 는 zero 런타임 의존성.

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
    "@axe-ai-sdk/core": "file:../axe-ai-sdk/packages/core/axe-ai-sdk-core-0.0.1.tgz",
    "@axe-ai-sdk/react": "file:../axe-ai-sdk/packages/react/axe-ai-sdk-react-0.0.1.tgz"
  },
  "pnpm": {
    "overrides": {
      "@axe-ai-sdk/core": "file:../axe-ai-sdk/packages/core/axe-ai-sdk-core-0.0.1.tgz"
    }
  }
}
```

The `pnpm.overrides` entry is needed because `@axe-ai-sdk/react` depends on
`@axe-ai-sdk/core` via `workspace:*`, which pnpm rewrites to `0.0.1` on pack
and then tries to fetch from the registry. The override forces it to use the
local tarball.

**2. Symlink via `link:` protocol** (edit-and-reload dev loop, no repack):

```json
{
  "dependencies": {
    "@axe-ai-sdk/core": "link:../axe-ai-sdk/packages/core",
    "@axe-ai-sdk/react": "link:../axe-ai-sdk/packages/react"
  }
}
```

Run `pnpm -r --filter @axe-ai-sdk/* dev` in this repo for watch-mode rebuilds.
The consumer picks up changes as soon as `dist/` updates.

## Quick example

서버가 `axe-wire/1` 을 말한다면 클라이언트는 이걸로 끝입니다.

```tsx
import {
  useChat,
  DefaultChatTransport,
  Markdown,
  bearerFromCookie,
} from '@axe-ai-sdk/react'
import '@axe-ai-sdk/react/styles.css'

const transport = new DefaultChatTransport({
  api: '/api/chat',
  // 쿠키 `auth_token` 에 담긴 JWT 를 매 요청마다 Authorization 헤더로
  headers: bearerFromCookie('auth_token'),
})

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isStreaming, stop } =
    useChat({ transport, persistence: { key: 'chat-demo' } })

  return (
    <form onSubmit={handleSubmit}>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role}</strong>
          <Markdown>{m.content}</Markdown>
        </div>
      ))}
      <input value={input} onChange={handleInputChange} />
      {isStreaming
        ? <button type='button' onClick={stop}>Stop</button>
        : <button type='submit'>Send</button>}
    </form>
  )
}
```

서버가 OpenAI / Anthropic / 레거시 포맷이라면 두 가지 중 하나를 선택합니다.

1. **BFF 에서 번역** — Next.js route handler, Cloudflare Worker 등에서 한 번만
   canonical 포맷으로 교정. 권장 경로이고, 클라이언트는 위 예제 그대로.
2. **`ChatTransport.send` 직접 구현** — [`examples/gateway/src/mock-transport.ts`](examples/gateway/src/mock-transport.ts)
   가 완전한 참고 구현입니다.

## Commit & Release

커밋 메시지는 [Conventional Commits](https://www.conventionalcommits.org/) 형식을 따릅니다.
`commitlint` 가 husky `commit-msg` 훅에서 검증합니다.

```
<type>(<scope>): <subject>

feat(core): add reconnect logic
fix(react): avoid double submit on Enter
docs: add useChat examples
chore: bump deps
```

허용 타입: `feat`, `fix`, `perf`, `refactor`, `docs`, `style`, `test`,
`build`, `ci`, `chore`, `revert`.

### 릴리스

커밋이 쌓인 뒤 `changelogen` 이 Conventional Commits 를 읽어 `CHANGELOG.md`
를 자동 생성하고 버전을 bump 합니다.

```bash
pnpm changelog     # dry-run. CHANGELOG.md 미리보기만 갱신
pnpm release       # 버전 bump + CHANGELOG + git tag + git push
```

## License

[MIT](LICENSE)

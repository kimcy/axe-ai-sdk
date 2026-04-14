# @axe-ai-sdk/docs

Nextra 4 (Next.js App Router) 기반 axe-ai-sdk 문서 사이트.

## 개발

```bash
pnpm install              # repo 루트에서 한 번
pnpm --filter @axe-ai-sdk/docs dev
```

`http://localhost:3000` 에서 확인.

## 구조

```
apps/docs/
├── app/
│   ├── layout.tsx            # 테마 / 네비게이션
│   └── [[...mdxPath]]/       # 모든 MDX 라우팅
├── content/                  # 문서 원문 (MDX)
│   ├── index.mdx             # 랜딩
│   └── docs/
│       ├── introduction.mdx
│       ├── getting-started.mdx
│       ├── foundations/
│       ├── core/
│       ├── react/
│       └── advanced/
├── mdx-components.js
└── next.config.mjs
```

## 새 문서 추가

1. `content/docs/<섹션>/<slug>.mdx` 파일 작성
2. 해당 섹션의 `_meta.js` 에 slug 추가 (사이드바 순서 제어)

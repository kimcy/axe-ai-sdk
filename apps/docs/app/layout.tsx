import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: {
    template: '%s – axe-ai-sdk',
    default: 'axe-ai-sdk – React 스트리밍 챗 SDK',
  },
  description:
    'Transport-agnostic 스트리밍 챗 SDK. SSE 안전, 에이전트/툴/RAG 메타데이터를 일급으로 지원.',
}

const navbar = (
  <Navbar
    logo={<b>axe-ai-sdk</b>}
    projectLink="https://github.com/kimcy/axe-ai-sdk"
  />
)

const footer = (
  <Footer>
    MIT {new Date().getFullYear()} © axe-ai-sdk.
  </Footer>
)

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          footer={footer}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/kimcy/axe-ai-sdk/tree/main/apps/docs"
          editLink="이 페이지 수정하기"
          feedback={{ content: '피드백 남기기 →' }}
          sidebar={{ defaultMenuCollapseLevel: 3, autoCollapse: false }}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}

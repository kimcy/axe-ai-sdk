import nextra from 'nextra'

const withNextra = nextra({
  latex: false,
  search: { codeblocks: false },
  defaultShowCopyCode: true,
})

export default withNextra({
  reactStrictMode: true,
  transpilePackages: ['@axe-ai-sdk/core', '@axe-ai-sdk/react'],
  async redirects() {
    return [
      { source: '/', destination: '/docs', permanent: false },
    ]
  },
})

// Type shims for libraries that ship without types or for Vite ?url imports.

declare module 'mammoth/mammoth.browser' {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{
    value: string
    messages: unknown[]
  }>
}

declare module '*.mjs?url' {
  const url: string
  export default url
}

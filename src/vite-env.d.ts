/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_V2_ENABLED?: string
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

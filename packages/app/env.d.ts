/// <reference types="vite/client" />

/** The `VITE_*` variables the app reads (see `.env.example` and `src/config`). */
interface ImportMetaEnv {
  readonly VITE_CATALOG_ADAPTER?: string
  readonly VITE_CATALOG_API_URL?: string
  readonly VITE_CATALOG_SITE_URL?: string
  readonly VITE_MOCK_DELAY_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

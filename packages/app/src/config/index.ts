/**
 * Which {@link ProductPort} implementation the app uses.
 *
 * - `mock`: the fictional catalog in local JSON files, no network (default)
 * - `http`: a catalog REST API, reached through `/api` (see `vite.config.ts`)
 */
export type CatalogAdapterKind = 'mock' | 'http'

/**
 * App settings from `VITE_*` environment variables (see `.env.example`).
 */
export interface AppConfig {
  /** `VITE_CATALOG_ADAPTER`, default `mock` */
  readonly catalogAdapter: CatalogAdapterKind
  /**
   * `VITE_CATALOG_SITE_URL`: website with a page for each product, e.g. `https://shop.example.com`.
   * `null` when not set; the "View on website" button is then hidden.
   */
  readonly catalogSiteUrl: string | null
  /** `VITE_MOCK_DELAY_MS`: latency of the mock adapter, so loading states are visible. Default 250. */
  readonly mockDelayMs: number
}

/** Default latency of the mock adapter in milliseconds */
export const DEFAULT_MOCK_DELAY_MS = 250

/** The environment variables {@link readConfig} reads, as Vite provides them in `import.meta.env`. */
export type ConfigEnv = Readonly<Record<string, string | boolean | undefined>>

/**
 * Reads the {@link AppConfig} from environment variables, with a default for everything.
 *
 * @param env - Usually `import.meta.env`
 * @returns The settings; unknown or malformed values fall back to the defaults
 */
export function readConfig(env: ConfigEnv): AppConfig {
  const adapter = text(env['VITE_CATALOG_ADAPTER'])?.toLowerCase()
  const siteUrl = text(env['VITE_CATALOG_SITE_URL'])?.replace(/\/+$/, '')
  const delay = Number(text(env['VITE_MOCK_DELAY_MS']))

  return {
    catalogAdapter: adapter === 'http' ? 'http' : 'mock',
    catalogSiteUrl: siteUrl || null,
    mockDelayMs: Number.isFinite(delay) && delay >= 0 ? delay : DEFAULT_MOCK_DELAY_MS,
  }
}

/** A trimmed, non-empty string, or `undefined` */
function text(value: string | boolean | undefined): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

/** The settings of this build */
export const config: AppConfig = readConfig(import.meta.env)

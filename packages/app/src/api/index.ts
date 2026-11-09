import {
  createServices,
  type Locale,
  type ProductPort,
  type Services,
} from '@product-explorer/core'
import {
  HttpCatalogAdapter,
  MockCatalogAdapter,
  RestClient,
} from '@product-explorer/infrastructure'
import { type AppConfig, config } from '@/config'
import { createDemoAdapter, readDemoSettings } from '@/demo'

/**
 * Time limit for one request to the catalog API. After it the request fails with a `TimeoutError`.
 */
export const REQUEST_TIMEOUT_MS = 8000

/**
 * Demo mode: with `?demo` in the URL, requests can be slowed down or made to fail (see `@/demo`).
 * Only in development (`import.meta.env.DEV`), so a production build ignores it, whatever the URL
 * says. Read once when the page loads; links inside the app drop the query string, but the
 * setting stays until the page is reloaded.
 */
const demoSettings =
  import.meta.env.DEV && typeof window !== 'undefined'
    ? readDemoSettings(window.location.search)
    : null

/**
 * Creates the port implementation the configuration asks for.
 *
 * @param locale - Country and language; part of every catalog API path
 * @param settings - The app configuration, default: the one of this build
 * @returns A {@link MockCatalogAdapter} (default) or an {@link HttpCatalogAdapter}
 */
export function createCatalogAdapter(locale: Locale, settings: AppConfig = config): ProductPort {
  if (settings.catalogAdapter === 'http') {
    // `/api` is forwarded to VITE_CATALOG_API_URL by the Vite proxy (see vite.config.ts).
    const client = new RestClient(`/api/${locale.country}/${locale.language}/`, {
      timeoutMs: REQUEST_TIMEOUT_MS,
    })
    return new HttpCatalogAdapter(client)
  }
  return new MockCatalogAdapter({ delayMs: settings.mockDelayMs })
}

/**
 * Creates the core services for one country and language.
 *
 * @remarks
 * The composition root: the only place where the app decides which port implementation it uses.
 * By default that is the mock catalog in local JSON files (`VITE_CATALOG_ADAPTER=mock`); with
 * `VITE_CATALOG_ADAPTER=http` it is a {@link RestClient} for the locale, injected into an
 * {@link HttpCatalogAdapter}. Either way the adapter is wrapped by core's `createServices`, so the
 * rest of the app never knows where the data comes from.
 *
 * Stores import and call it in their load actions with the current locale, so switching the
 * language in the URL loads the data in that language. Tests replace this module with
 * `vi.mock('@/api', …)` and return services on core's `MockProductAdapter`.
 *
 * In demo mode (`?demo`, development only) the adapter is wrapped to be slow or fail on demand.
 *
 * @param locale - Country and language, e.g. from the URL
 * @returns The core services for this locale
 */
export function createCatalogServices(locale: Locale): Services {
  const adapter = createCatalogAdapter(locale)
  return createServices(demoSettings ? createDemoAdapter(adapter, demoSettings) : adapter)
}

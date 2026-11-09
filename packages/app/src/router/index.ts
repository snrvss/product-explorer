import { createRouter, type RouteRecordRaw, type Router, type RouterHistory } from 'vue-router'
import { resolvePreferredLanguage, saveUserLanguage } from '@/helpers'
import { isSupportedLanguage, setLanguage, SUPPORTED_LANGUAGES } from '@/i18n'
import MainPage from '@/pages/MainPage.vue'
import { PRODUCT_ROUTE } from '@/router/route-names'

export * from '@/router/route-names'

/** Country used when the URL has none. Never taken from the browser: it decides price and currency. */
export const DEFAULT_COUNTRY = 'de'

/** Product shown when the URL has none. */
export const DEFAULT_PRODUCT_ID = 'PRD-1001'

/**
 * Where `/` and unknown URLs lead: product PRD-1001 in the user's preferred language.
 *
 * @remarks
 * A function, not a constant, so the language is decided at the moment of the redirect
 * (see `resolvePreferredLanguage`: saved choice → browser language → German).
 *
 * @returns The route location of the default product
 */
export function defaultProductLocation() {
  return {
    name: PRODUCT_ROUTE,
    params: {
      country: DEFAULT_COUNTRY,
      language: resolvePreferredLanguage(),
      productId: DEFAULT_PRODUCT_ID,
    },
  }
}

/**
 * All routes of the app.
 *
 * @remarks
 * The country must be two lower-case letters, as in the catalog API paths
 * (`/api/{country}/{language}/…`). The language must be one of
 * {@link SUPPORTED_LANGUAGES}, because the UI is only translated into those. The product route is
 * `sensitive`, because vue-router matches case-insensitively by default and would accept
 * `/de/DE/…` otherwise.
 * The product id is passed on unchanged; validating it is the job of the core services.
 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: defaultProductLocation,
  },
  {
    path: `/:country([a-z]{2})/:language(${SUPPORTED_LANGUAGES.join('|')})/product/:productId`,
    name: PRODUCT_ROUTE,
    component: MainPage,
    props: true,
    sensitive: true,
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: defaultProductLocation,
  },
]

/**
 * Creates the app router.
 *
 * @remarks
 * After every navigation the UI language follows the `language` route parameter, so
 * `/de/en/product/…` shows English texts and `/de/de/product/…` German ones. The language is also
 * saved, so the next visit to `/` opens it again.
 *
 * @param history - `createWebHistory()` in the app, `createMemoryHistory()` in tests
 * @returns The router with all {@link routes}
 */
export function createAppRouter(history: RouterHistory): Router {
  const router = createRouter({ history, routes })

  router.afterEach((to) => {
    const language = to.params['language']
    if (isSupportedLanguage(language)) {
      setLanguage(language)
      saveUserLanguage(language)
    }
  })

  return router
}

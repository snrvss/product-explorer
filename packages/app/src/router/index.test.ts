import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter, PRODUCT_ROUTE } from '@/router'
import { loadUserLanguage, saveUserLanguage } from '@/helpers'
import { currentLanguage, DEFAULT_LANGUAGE, setLanguage } from '@/i18n'
import MainPage from '@/pages/MainPage.vue'

/** Creates a router in memory and navigates to `path`. */
async function navigateTo(path: string) {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  return router.currentRoute.value
}

/** Makes the browser report these languages, like `navigator.languages`. */
function useBrowserLanguages(languages: string[]): void {
  vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(languages)
}

describe('router', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useBrowserLanguages(['de-DE'])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setLanguage(DEFAULT_LANGUAGE)
  })

  it('redirects / to the default product PRD-1001', async () => {
    const path = '/'

    const route = await navigateTo(path)

    expect(route.fullPath).toBe('/de/de/product/PRD-1001')
  })

  it('opens the MainPage for a product URL and passes the params as props', async () => {
    const path = '/de/en/product/PRD-1301'

    const route = await navigateTo(path)

    expect(route.name).toBe(PRODUCT_ROUTE)
    expect(route.params).toEqual({ country: 'de', language: 'en', productId: 'PRD-1301' })
    expect(route.matched[0]?.components?.default).toBe(MainPage)
    expect(route.matched[0]?.props.default).toBe(true)
  })

  it('keeps country and language for a product link without them (product cards)', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/at/en/product/PRD-1001')

    const target = router.resolve({ name: PRODUCT_ROUTE, params: { productId: 'PRD-1301' } })

    expect(target.fullPath).toBe('/at/en/product/PRD-1301')
  })

  it('passes the product id on unchanged, so the core services can validate it', async () => {
    const path = '/de/de/product/prd-1001'

    const route = await navigateTo(path)

    expect(route.params['productId']).toBe('prd-1001')
  })

  it.each([
    ['an unknown path', '/something/else'],
    ['a country with three letters', '/deu/de/product/PRD-1001'],
    ['an upper-case language', '/de/DE/product/PRD-1001'],
    ['a language without translations', '/fr/fr/product/PRD-1001'],
    ['a product URL without id', '/de/de/product'],
  ])('redirects %s to the default product', async (_case, path) => {
    const route = await navigateTo(path)

    expect(route.fullPath).toBe('/de/de/product/PRD-1001')
  })

  it.each([
    ['/de/en/product/PRD-1001', 'en'],
    ['/de/de/product/PRD-1001', 'de'],
  ])('switches the UI language for %s to %s', async (path, language) => {
    setLanguage(language === 'de' ? 'en' : 'de')

    await navigateTo(path)

    expect(currentLanguage()).toBe(language)
  })

  describe('preferred language for URLs without one', () => {
    it('redirects / to English when the browser prefers English', async () => {
      useBrowserLanguages(['en-US', 'en'])

      const route = await navigateTo('/')

      expect(route.fullPath).toBe('/de/en/product/PRD-1001')
    })

    it('redirects / to the language saved last time, even if the browser prefers another one', async () => {
      useBrowserLanguages(['de-DE'])
      saveUserLanguage('en')

      const route = await navigateTo('/')

      expect(route.fullPath).toBe('/de/en/product/PRD-1001')
    })

    it('uses the preferred language for unknown URLs as well', async () => {
      saveUserLanguage('en')

      const route = await navigateTo('/something/else')

      expect(route.fullPath).toBe('/de/en/product/PRD-1001')
    })

    it('keeps the language of the URL, whatever is saved or preferred by the browser', async () => {
      useBrowserLanguages(['en-US'])
      saveUserLanguage('en')

      const route = await navigateTo('/de/de/product/PRD-1001')

      expect(route.params['language']).toBe('de')
      expect(currentLanguage()).toBe('de')
    })

    it('saves the language of the URL for the next visit', async () => {
      const path = '/de/en/product/PRD-1001'

      await navigateTo(path)

      expect(loadUserLanguage()).toBe('en')
    })
  })
})

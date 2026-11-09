import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, type Pinia } from 'pinia'
import { flushPromises, mount, RouterLinkStub, type VueWrapper } from '@vue/test-utils'
import { createServices, MockProductAdapter } from '@product-explorer/core'
import { createCatalogServices } from '@/api'
import { setLanguage } from '@/i18n'
import MainPage from '@/pages/MainPage.vue'
import { MainProduct } from '@/sections/MainProduct'
import { RelatedProducts } from '@/sections/RelatedProducts'
import { useAccessoriesStore, useCategoryProductsStore, useProductStore } from '@/stores'

// The real factory picks the configured catalog adapter; here it returns services on the core mock adapter.
vi.mock('@/api', () => ({ createCatalogServices: vi.fn() }))

const URL_PARAMS = { country: 'de', language: 'en', productId: 'MAN-0001' }

let page: VueWrapper | undefined

/** Mounts the page like the router does, with its own Pinia. */
function mountPage(pinia: Pinia = createPinia()): VueWrapper {
  page = mount(MainPage, {
    props: URL_PARAMS,
    global: { plugins: [pinia], stubs: { RouterLink: RouterLinkStub } },
  })
  return page
}

describe('MainPage', () => {
  beforeEach(() => {
    setLanguage('en')
    vi.mocked(createCatalogServices).mockReset()
  })

  // Unmounting cancels the sections' requests, so nothing of one test runs into the next
  afterEach(() => {
    page?.unmount()
    page = undefined
  })

  it('passes product id, country and language from the URL to both sections', () => {
    vi.mocked(createCatalogServices).mockImplementation(() =>
      createServices(new MockProductAdapter()),
    )

    const mounted = mountPage()

    expect(mounted.getComponent(MainProduct).props()).toMatchObject(URL_PARAMS)
    expect(mounted.getComponent(RelatedProducts).props()).toMatchObject(URL_PARAMS)
  })

  it('first requests only the product, its variants and accessories, each exactly once', async () => {
    const adapter = new MockProductAdapter()
    const getProduct = vi.spyOn(adapter, 'getProduct')
    const getVariants = vi.spyOn(adapter, 'getVariants')
    const getAccessoryGroups = vi.spyOn(adapter, 'getAccessoryGroups')
    const getCategoryProducts = vi.spyOn(adapter, 'getCategoryProducts')
    vi.mocked(createCatalogServices).mockImplementation(() => createServices(adapter))
    const pinia = createPinia()

    mountPage(pinia)
    await vi.waitFor(() => {
      expect(useProductStore(pinia).status).toBe('success')
      expect(useAccessoriesStore(pinia).stats.loaded).toBe(3)
    })
    await flushPromises()

    // main product + its variants + accessory list + 3 accessory cards; category tab still closed
    expect(getProduct.mock.calls.filter(([id]) => id === 'MAN-0001')).toHaveLength(1)
    expect(getVariants).toHaveBeenCalledTimes(1)
    expect(getAccessoryGroups).toHaveBeenCalledTimes(1)
    expect(getProduct).toHaveBeenCalledTimes(1 + 3)
    expect(getCategoryProducts).not.toHaveBeenCalled()
  })

  it('requests the category list exactly once, when its tab is opened', async () => {
    const adapter = new MockProductAdapter()
    const getCategoryProducts = vi.spyOn(adapter, 'getCategoryProducts')
    vi.mocked(createCatalogServices).mockImplementation(() => createServices(adapter))
    const pinia = createPinia()
    const mounted = mountPage(pinia)
    await vi.waitFor(() => expect(useProductStore(pinia).status).toBe('success'))

    await mounted.findAll('[role="tab"]')[1]?.trigger('click')
    await vi.waitFor(() => expect(useCategoryProductsStore(pinia).stats.loaded).toBe(3))
    await flushPromises()

    expect(getCategoryProducts).toHaveBeenCalledTimes(1)
  })

  it('reloads product and accessories exactly once in the new language after a switch', async () => {
    const adapter = new MockProductAdapter()
    const getProduct = vi.spyOn(adapter, 'getProduct')
    const getAccessoryGroups = vi.spyOn(adapter, 'getAccessoryGroups')
    vi.mocked(createCatalogServices).mockImplementation(() => createServices(adapter))
    const pinia = createPinia()
    const mounted = mountPage(pinia)
    await vi.waitFor(() => expect(useAccessoriesStore(pinia).stats.loaded).toBe(3))
    getProduct.mockClear()
    getAccessoryGroups.mockClear()

    // What the router does when the language switcher changes the URL
    await mounted.setProps({ language: 'de' })
    await vi.waitFor(() => {
      expect(useProductStore(pinia).status).toBe('success')
      expect(useAccessoriesStore(pinia).stats.loaded).toBe(3)
    })
    await flushPromises()

    expect(createCatalogServices).toHaveBeenLastCalledWith({ country: 'de', language: 'de' })
    expect(getProduct.mock.calls.filter(([id]) => id === 'MAN-0001')).toHaveLength(1)
    expect(getAccessoryGroups).toHaveBeenCalledTimes(1)
    expect(getProduct).toHaveBeenCalledTimes(1 + 3)
  })
})

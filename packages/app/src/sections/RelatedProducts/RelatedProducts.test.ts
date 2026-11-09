import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, type Pinia } from 'pinia'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import {
  ACCESSORY_PRODUCTS,
  createServices,
  FAKE_CATEGORY_ID,
  type Locale,
  MockProductAdapter,
  ServerError,
  TimeoutError,
} from '@product-explorer/core'
import { createCatalogServices } from '@/api'
import { Card } from '@/components/Card'
import { StatusCard } from '@/components/StatusCard'
import { Skeleton } from '@/components/Skeleton'
import { setLanguage } from '@/i18n'
import { RelatedProducts } from '@/sections/RelatedProducts'
import ProductCardsPanel from '@/sections/RelatedProducts/ProductCardsPanel.vue'
import { useAccessoriesStore, useCategoryProductsStore, useProductStore } from '@/stores'

// The real factory picks the configured catalog adapter; each test makes it return services on the mock adapter.
vi.mock('@/api', () => ({ createCatalogServices: vi.fn() }))

const LOCALE: Locale = { country: 'de', language: 'en' }

/** Mounts the section with a real accessories store; the section starts loading itself. */
function mountSection(productId = 'MAN-0001', adapter = new MockProductAdapter()) {
  const pinia: Pinia = createPinia()
  vi.mocked(createCatalogServices).mockReset()
  vi.mocked(createCatalogServices).mockImplementation(() => createServices(adapter))
  const section = mount(RelatedProducts, {
    props: { productId, ...LOCALE },
    global: { plugins: [pinia], stubs: { RouterLink: RouterLinkStub } },
  })
  const store = useAccessoriesStore(pinia)
  return { section, store, pinia }
}

/** A card store as far as waiting for it is concerned (accessories or category products). */
interface CardStore {
  readonly isLoading: boolean
  readonly cards: Readonly<Record<string, { readonly status: string }>>
}

/** Waits until the list and every requested card have their result. */
async function untilLoaded(store: CardStore): Promise<void> {
  await vi.waitFor(() => {
    expect(store.isLoading).toBe(false)
    expect(Object.values(store.cards).some((card) => card.status === 'loading')).toBe(false)
  })
  await flushPromises()
}

/** Mounts the section and waits until the accessories (or their error) are there. */
async function mountWithResult(productId = 'MAN-0001', adapter = new MockProductAdapter()) {
  const mounted = mountSection(productId, adapter)
  await untilLoaded(mounted.store)
  return mounted
}

describe('RelatedProducts', () => {
  beforeEach(() => {
    setLanguage('en')
    vi.restoreAllMocks()
  })

  it('is a section named by its heading', async () => {
    const { section } = await mountWithResult()

    const heading = section.get('h2')

    expect(heading.text()).toBe('Complete your setup')
    expect(section.get('section').attributes('aria-labelledby')).toBe(heading.attributes('id'))
  })

  it('shows the accessories and same-category tabs, accessories first', async () => {
    const { section } = await mountWithResult()

    const tabs = section.findAll('[role="tab"]')

    expect(tabs.map((tab) => tab.text())).toEqual(['Accessories', 'Same category'])
    expect(tabs[0]?.attributes('aria-selected')).toBe('true')
  })

  describe('accessories', () => {
    it('shows placeholders while the list loads, and tells screen readers', async () => {
      const { section, store } = mountSection('MAN-0001', new MockProductAdapter({ delayMs: 50 }))
      await section.vm.$nextTick()

      // The accessories tab's panel (the first one)
      const panel = section.findAllComponents(ProductCardsPanel)[0]!
      expect(panel.findAllComponents(Skeleton)).toHaveLength(4)
      expect(panel.get('[role="status"]').text()).toBe('Loading accessories …')
      await untilLoaded(store)
    })

    it('loads the accessories from its props, once, with the country and language', async () => {
      const adapter = new MockProductAdapter()
      const getAccessoryGroups = vi.spyOn(adapter, 'getAccessoryGroups')

      await mountWithResult('MAN-0001', adapter)

      expect(createCatalogServices).toHaveBeenCalledTimes(1)
      expect(createCatalogServices).toHaveBeenCalledWith(LOCALE)
      expect(getAccessoryGroups).toHaveBeenCalledTimes(1)
    })

    it('loads the accessories of the new product when the product id changes', async () => {
      const { section, store } = await mountWithResult()

      await section.setProps({ productId: 'NOA-0001' })
      await untilLoaded(store)

      expect(section.text()).toContain('There are no accessories for this product.')
    })

    it('cancels its requests when it is removed', () => {
      const { section, store } = mountSection('MAN-0001', new MockProductAdapter({ delayMs: 50 }))

      section.unmount()

      expect(store.status).toBe('idle')
    })

    it('shows one card per accessory with the real product data', async () => {
      const { section } = await mountWithResult()

      const cards = section.findAllComponents(Card)

      expect(cards.map((card) => card.props('productId'))).toEqual([
        'ACC-0001',
        'ACC-0002',
        'ACC-0003',
      ])
      expect(cards[0]?.props('status')).toBe('ready')
      expect(cards[0]?.props('name')).toBe(ACCESSORY_PRODUCTS[0].headline)
      expect(cards[0]?.props('image')).toBe(ACCESSORY_PRODUCTS[0].image)
    })

    it('shows the progress for screen readers, without "0 failed"', async () => {
      const { section } = await mountWithResult()

      const progress = section.get('.product-cards-panel__progress')

      expect(progress.attributes('aria-live')).toBe('polite')
      expect(progress.text()).toBe('3 of 3 loaded')
    })

    it('adds the number of failed cards to the progress when some failed', async () => {
      const adapter = new MockProductAdapter()
      vi.spyOn(adapter, 'getProduct').mockRejectedValueOnce(new TimeoutError(8000))
      const { section } = await mountWithResult('MAN-0001', adapter)

      const progress = section.get('.product-cards-panel__progress')

      expect(progress.text()).toBe('2 of 3 loaded · 1 failed')
    })

    it('shows a failed card with "Try again", which loads it again', async () => {
      const adapter = new MockProductAdapter()
      vi.spyOn(adapter, 'getProduct').mockRejectedValueOnce(new TimeoutError(8000))
      const { section } = await mountWithResult('MAN-0001', adapter)
      const failed = section.findAllComponents(Card)[0]
      expect(failed?.props('status')).toBe('error')

      await failed?.get('.card-error button').trigger('click')
      await flushPromises()

      expect(section.findAllComponents(Card)[0]?.props('status')).toBe('ready')
    })

    it('shows "Load more accessories" only when there are more', async () => {
      const { section } = await mountWithResult()

      expect(section.text()).not.toContain('Load more accessories')
    })

    it('shows an empty card when the product has no accessories', async () => {
      const { section } = await mountWithResult('NOA-0001')

      // The first status card is the accessories tab's (the category tab's comes after it)
      const empty = section.getComponent(StatusCard)
      expect(empty.props('kind')).toBe('empty')
      expect(empty.props('title')).toBe('No accessories')
      expect(empty.props('text')).toBe('There are no accessories for this product.')
      expect(section.findComponent(Card).exists()).toBe(false)
    })

    it('shows an error card with "Try again" when the list fails, which loads it again', async () => {
      const adapter = new MockProductAdapter()
      vi.spyOn(adapter, 'getAccessoryGroups').mockRejectedValueOnce(new ServerError(503))
      const { section, store } = await mountWithResult('MAN-0001', adapter)

      const error = section.getComponent(StatusCard)
      expect(error.props('kind')).toBe('error')
      expect(error.props('title')).toBe('Something went wrong')
      expect(error.props('text')).toBe('The accessories could not be loaded.')
      expect(error.props('retryable')).toBe(true)

      await error.get('button').trigger('click')
      await untilLoaded(store)

      expect(section.findAllComponents(Card)).toHaveLength(3)
    })
  })

  describe('same category', () => {
    /** The category tab's panel (the second one). */
    function categoryPanel(section: ReturnType<typeof mountSection>['section']) {
      return section.findAllComponents(ProductCardsPanel)[1]!
    }

    /** Opens the "Same category" tab, as a user would. */
    async function openCategoryTab(section: ReturnType<typeof mountSection>['section']) {
      await section.findAll('[role="tab"]')[1]?.trigger('click')
    }

    /**
     * Mounts the section, loads the main product (as `MainProduct` does on the page) and opens the
     * category tab.
     */
    async function mountWithMainProduct(adapter = new MockProductAdapter()) {
      const mounted = mountSection('MAN-0001', adapter)
      await useProductStore(mounted.pinia).load('MAN-0001', LOCALE)
      await openCategoryTab(mounted.section)
      const category = useCategoryProductsStore(mounted.pinia)
      await untilLoaded(category)
      return { ...mounted, category }
    }

    it('requests nothing for the category until its tab is opened', async () => {
      const adapter = new MockProductAdapter()
      const getCategoryProducts = vi.spyOn(adapter, 'getCategoryProducts')
      const { section, store, pinia } = mountSection('MAN-0001', adapter)
      await useProductStore(pinia).load('MAN-0001', LOCALE)
      await untilLoaded(store)

      expect(getCategoryProducts).not.toHaveBeenCalled()
      expect(useCategoryProductsStore(pinia).status).toBe('idle')

      await openCategoryTab(section)
      await untilLoaded(useCategoryProductsStore(pinia))

      expect(getCategoryProducts).toHaveBeenCalledTimes(1)
    })

    it('keeps the loaded category when switching back and forth', async () => {
      const adapter = new MockProductAdapter()
      const getCategoryProducts = vi.spyOn(adapter, 'getCategoryProducts')
      const { section } = await mountWithMainProduct(adapter)

      await section.findAll('[role="tab"]')[0]?.trigger('click')
      await openCategoryTab(section)
      await flushPromises()

      expect(getCategoryProducts).toHaveBeenCalledTimes(1)
      expect(categoryPanel(section).findAllComponents(Card)).toHaveLength(3)
    })

    it('waits for the main product, showing placeholders meanwhile', async () => {
      const { section, pinia } = mountSection('MAN-0001', new MockProductAdapter({ delayMs: 50 }))
      const loadingProduct = useProductStore(pinia).load('MAN-0001', LOCALE)
      await openCategoryTab(section)

      expect(categoryPanel(section).props('loading')).toBe(true)
      expect(useCategoryProductsStore(pinia).status).toBe('idle')
      await loadingProduct
    })

    it('shows the other products of the category, without the main product', async () => {
      const { section } = await mountWithMainProduct()

      const ids = categoryPanel(section)
        .findAllComponents(Card)
        .map((card) => card.props('productId'))
      expect(ids).toEqual(['CAT-0001', 'CAT-0002', 'CAT-0003'])
      expect(categoryPanel(section).get('.product-cards-panel__progress').text()).toBe(
        '3 of 3 loaded',
      )
    })

    it("loads the category list once, for the main product's category and locale", async () => {
      const adapter = new MockProductAdapter()
      const getCategoryProducts = vi.spyOn(adapter, 'getCategoryProducts')

      await mountWithMainProduct(adapter)

      expect(getCategoryProducts).toHaveBeenCalledTimes(1)
      expect(getCategoryProducts).toHaveBeenCalledWith(FAKE_CATEGORY_ID, expect.anything())
    })

    it('shows an error card with "Try again" when the list fails, which loads it again', async () => {
      const adapter = new MockProductAdapter()
      vi.spyOn(adapter, 'getCategoryProducts').mockRejectedValueOnce(new ServerError(503))
      const { section, category } = await mountWithMainProduct(adapter)

      const error = categoryPanel(section).getComponent(StatusCard)
      expect(error.props('text')).toBe('The products in the same category could not be loaded.')
      expect(error.props('retryable')).toBe(true)

      await error.get('button').trigger('click')
      await untilLoaded(category)

      expect(categoryPanel(section).findAllComponents(Card)).toHaveLength(3)
    })

    it('shows an error card without "Try again" when the main product failed', async () => {
      const { section, pinia } = mountSection('ZZZ-9999')
      await useProductStore(pinia).load('ZZZ-9999', LOCALE)
      await openCategoryTab(section)
      await flushPromises()

      const error = categoryPanel(section).getComponent(StatusCard)
      expect(error.props('kind')).toBe('error')
      expect(error.props('retryable')).toBe(false)
    })
  })

  it('translates its texts', async () => {
    setLanguage('de')

    const { section } = await mountWithResult()

    expect(section.get('h2').text()).toBe('Ihr Setup vervollständigen')
    expect(section.findAll('[role="tab"]')[1]?.text()).toBe('Gleiche Kategorie')
  })
})

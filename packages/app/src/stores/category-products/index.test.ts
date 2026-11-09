import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import {
  CATEGORY_PRODUCTS,
  CategoryNotFoundError,
  createServices,
  FAKE_CATEGORY_ID,
  fakeProduct,
  fakeSummary,
  type Locale,
  MockProductAdapter,
  type MockProductAdapterOptions,
  ServerError,
  TimeoutError,
} from '@product-explorer/core'
import { createCatalogServices } from '@/api'
import { PAGE_SIZE, useCategoryProductsStore } from '@/stores'

// The real factory picks the configured catalog adapter; here it returns services on the core mock adapter.
vi.mock('@/api', () => ({ createCatalogServices: vi.fn() }))

const LOCALE: Locale = { country: 'de', language: 'en' }

/** Makes `createCatalogServices` return services on `adapter` for every locale. */
function useAdapter(adapter: MockProductAdapter): void {
  vi.mocked(createCatalogServices).mockImplementation(() => createServices(adapter))
}

/** Product id of the `position`-th (1-based) fake product of {@link bigCategory}. */
function productId(position: number): string {
  return `CBX-${String(position).padStart(4, '0')}`
}

/** A fake category `fake_big` with `count` products CBX-0001 … plus the main product BIG-0001. */
function bigCategory(count: number, options: MockProductAdapterOptions = {}): MockProductAdapter {
  const main = fakeProduct({ id: 'BIG-0001', categoryId: 'fake_big' })
  const others = Array.from({ length: count }, (_, index) =>
    fakeProduct({ id: productId(index + 1), categoryId: 'fake_big' }),
  )
  return new MockProductAdapter({
    products: Object.fromEntries([main, ...others].map((product) => [product.id, product])),
    categoryProducts: { fake_big: [main, ...others].map(fakeSummary) },
    ...options,
  })
}

describe('useCategoryProductsStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(createCatalogServices).mockReset()
    useAdapter(new MockProductAdapter())
    setActivePinia(createPinia())
  })

  it('starts idle, without products, cards or error', () => {
    const store = useCategoryProductsStore()

    expect(store.status).toBe('idle')
    expect(store.summaries).toEqual([])
    expect(store.cards).toEqual({})
    expect(store.error).toBeNull()
  })

  it('loads the category without the main product, then the details of every visible product', async () => {
    const store = useCategoryProductsStore()

    const loading = store.load(FAKE_CATEGORY_ID, 'MAN-0001', LOCALE)

    expect(store.status).toBe('loading')
    await loading
    expect(store.status).toBe('success')
    expect(store.visibleIds).toEqual(['CAT-0001', 'CAT-0002', 'CAT-0003'])
    expect(store.cards['CAT-0001']).toEqual({ status: 'success', product: CATEGORY_PRODUCTS[0] })
    expect(store.stats).toEqual({ total: 3, loaded: 3, failed: 0 })
  })

  it('creates the services for the requested country and language', async () => {
    const store = useCategoryProductsStore()

    await store.load(FAKE_CATEGORY_ID, 'MAN-0001', LOCALE)

    expect(createCatalogServices).toHaveBeenCalledWith(LOCALE)
  })

  it('has no products when the main product is alone in its category', async () => {
    const main = fakeProduct({ id: 'ALN-0001', categoryId: 'fake_alone' })
    useAdapter(new MockProductAdapter({ categoryProducts: { fake_alone: [fakeSummary(main)] } }))
    const store = useCategoryProductsStore()

    await store.load('fake_alone', 'ALN-0001', LOCALE)

    expect(store.status).toBe('success')
    expect(store.stats.total).toBe(0)
    expect(store.hasMore).toBe(false)
  })

  it('shows the first page, and the next one with loadMore', async () => {
    useAdapter(bigCategory(PAGE_SIZE + 2))
    const store = useCategoryProductsStore()

    await store.load('fake_big', 'BIG-0001', LOCALE)

    expect(store.visibleIds).toHaveLength(PAGE_SIZE)
    expect(store.hasMore).toBe(true)
    expect(store.cards[productId(PAGE_SIZE + 1)]).toBeUndefined()

    await store.loadMore()

    expect(store.visibleIds).toHaveLength(PAGE_SIZE + 2)
    expect(store.hasMore).toBe(false)
    expect(store.cards[productId(PAGE_SIZE + 2)]?.status).toBe('success')
  })

  it('gives a failing card its own error and keeps the others', async () => {
    useAdapter(new MockProductAdapter({ errors: { 'CAT-0002': new TimeoutError(8000) } }))
    const store = useCategoryProductsStore()

    await store.load(FAKE_CATEGORY_ID, 'MAN-0001', LOCALE)

    expect(store.cards['CAT-0002']).toMatchObject({ status: 'error' })
    expect(store.cards['CAT-0001']?.status).toBe('success')
    expect(store.stats).toEqual({ total: 3, loaded: 2, failed: 1 })
  })

  it('loads a failed card again with retryCard', async () => {
    const adapter = new MockProductAdapter()
    vi.spyOn(adapter, 'getProduct').mockRejectedValueOnce(new TimeoutError(8000))
    useAdapter(adapter)
    const store = useCategoryProductsStore()
    await store.load(FAKE_CATEGORY_ID, 'MAN-0001', LOCALE)
    expect(store.cards['CAT-0001']?.status).toBe('error')

    await store.retryCard('CAT-0001')

    expect(store.cards['CAT-0001']?.status).toBe('success')
  })

  it('marks a listed product that no longer exists as unavailable', async () => {
    const gone = fakeProduct({ id: 'GON-0001' })
    useAdapter(
      new MockProductAdapter({
        products: {},
        categoryProducts: { fake_gone: [fakeSummary(gone)] },
      }),
    )
    const store = useCategoryProductsStore()

    await store.load('fake_gone', 'MAN-0001', LOCALE)

    expect(store.cards['GON-0001']).toEqual({ status: 'unavailable' })
  })

  it('ends in an error when the list cannot be loaded, and retries it', async () => {
    const adapter = new MockProductAdapter()
    vi.spyOn(adapter, 'getCategoryProducts').mockRejectedValueOnce(new ServerError(503))
    useAdapter(adapter)
    const store = useCategoryProductsStore()
    await store.load(FAKE_CATEGORY_ID, 'MAN-0001', LOCALE)
    expect(store.status).toBe('error')
    expect(store.error).toBeInstanceOf(ServerError)
    expect(store.isTimeout).toBe(false)

    await store.retry()

    expect(store.status).toBe('success')
    expect(store.visibleIds).toHaveLength(3)
  })

  it('reports a timeout of the list', async () => {
    useAdapter(new MockProductAdapter({ errors: { [FAKE_CATEGORY_ID]: new TimeoutError(8000) } }))
    const store = useCategoryProductsStore()

    await store.load(FAKE_CATEGORY_ID, 'MAN-0001', LOCALE)

    expect(store.isTimeout).toBe(true)
    expect(store.error?.retryable).toBe(true)
  })

  it('ends in an error for an unknown category', async () => {
    const store = useCategoryProductsStore()

    await store.load('fake_unknown', 'MAN-0001', LOCALE)

    expect(store.error).toBeInstanceOf(CategoryNotFoundError)
  })

  it('does nothing on retry before the first load', async () => {
    const store = useCategoryProductsStore()

    await store.retry()

    expect(createCatalogServices).not.toHaveBeenCalled()
    expect(store.status).toBe('idle')
  })

  it('drops the previous category when a newer load starts', async () => {
    useAdapter(bigCategory(2, { delayMs: 20 }))
    const store = useCategoryProductsStore()

    const first = store.load(FAKE_CATEGORY_ID, 'MAN-0001', LOCALE)
    const second = store.load('fake_big', 'BIG-0001', LOCALE)
    await Promise.all([first, second])

    expect(store.status).toBe('success')
    expect(store.visibleIds).toEqual([productId(1), productId(2)])
    expect(store.cards['CAT-0001']).toBeUndefined()
  })

  it('goes back to idle when a running load is cancelled', async () => {
    useAdapter(new MockProductAdapter({ delayMs: 20 }))
    const store = useCategoryProductsStore()

    const loading = store.load(FAKE_CATEGORY_ID, 'MAN-0001', LOCALE)
    store.cancel()
    await loading
    await flushPromises()

    expect(store.status).toBe('idle')
    expect(store.cards).toEqual({})
  })
})

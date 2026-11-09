import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import {
  type AccessoryGroup,
  ACCESSORY_PRODUCTS,
  createServices,
  fakeProduct,
  type Locale,
  MockProductAdapter,
  type MockProductAdapterOptions,
  ProductNotFoundError,
  ServerError,
  TimeoutError,
  tryToProductId,
} from '@product-explorer/core'
import { createCatalogServices } from '@/api'
import { MAX_PARALLEL_REQUESTS, PAGE_SIZE, useAccessoriesStore } from '@/stores'

// The real factory picks the configured catalog adapter; here it returns services on the core mock adapter.
vi.mock('@/api', () => ({ createCatalogServices: vi.fn() }))

const LOCALE: Locale = { country: 'de', language: 'en' }

/** Makes `createCatalogServices` return services on `adapter` for every locale. */
function useAdapter(adapter: MockProductAdapter): void {
  vi.mocked(createCatalogServices).mockImplementation(() => createServices(adapter))
}

/** Product id of the `position`-th (1-based) fake accessory of {@link manyAccessories}. */
function accessoryId(position: number): string {
  return `ACX-${String(position).padStart(4, '0')}`
}

/** A fake main product MNY-0001 with `count` accessories ACX-0001 … in one group. */
function manyAccessories(
  count: number,
  options: MockProductAdapterOptions = {},
): MockProductAdapter {
  const accessories = Array.from({ length: count }, (_, index) =>
    fakeProduct({ id: accessoryId(index + 1) }),
  )
  const group: AccessoryGroup = {
    categoryId: 'fake_many',
    headline: 'Many fake accessories',
    productIds: accessories.map((product) => product.id),
  }
  const main = fakeProduct({ id: 'MNY-0001' })
  return new MockProductAdapter({
    products: Object.fromEntries([main, ...accessories].map((product) => [product.id, product])),
    accessoryGroups: { 'MNY-0001': [group] },
    ...options,
  })
}

describe('useAccessoriesStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(createCatalogServices).mockReset()
    useAdapter(new MockProductAdapter())
    setActivePinia(createPinia())
  })

  it('starts idle, without groups, cards or error', () => {
    const store = useAccessoriesStore()

    expect(store.status).toBe('idle')
    expect(store.groups).toEqual([])
    expect(store.cards).toEqual({})
    expect(store.error).toBeNull()
  })

  it('loads the groups, then the details of every visible accessory', async () => {
    const store = useAccessoriesStore()

    const loading = store.load('MAN-0001', LOCALE)

    expect(store.status).toBe('loading')
    await loading
    expect(store.status).toBe('success')
    expect(store.visibleIds).toEqual(['ACC-0001', 'ACC-0002', 'ACC-0003'])
    expect(store.cards['ACC-0001']).toEqual({ status: 'success', product: ACCESSORY_PRODUCTS[0] })
    expect(store.stats).toEqual({ total: 3, loaded: 3, failed: 0 })
  })

  it('creates the services for the requested country and language', async () => {
    const store = useAccessoriesStore()

    await store.load('MAN-0001', LOCALE)

    expect(createCatalogServices).toHaveBeenCalledWith(LOCALE)
  })

  it('has no accessories for a product without any', async () => {
    const store = useAccessoriesStore()

    await store.load('NOA-0001', LOCALE)

    expect(store.status).toBe('success')
    expect(store.stats.total).toBe(0)
    expect(store.hasMore).toBe(false)
  })

  it('lists each accessory once, even if it is in several groups', async () => {
    const twice: AccessoryGroup[] = [
      { categoryId: 'a', headline: 'A', productIds: [tryToProductId('ACC-0001')] },
      { categoryId: 'b', headline: 'B', productIds: [tryToProductId('ACC-0001')] },
    ]
    useAdapter(new MockProductAdapter({ accessoryGroups: { 'MAN-0001': twice } }))
    const store = useAccessoriesStore()

    await store.load('MAN-0001', LOCALE)

    expect(store.visibleIds).toEqual(['ACC-0001'])
  })

  it('shows the first page, and the next one with loadMore', async () => {
    useAdapter(manyAccessories(PAGE_SIZE + 3))
    const store = useAccessoriesStore()

    await store.load('MNY-0001', LOCALE)

    expect(store.visibleIds).toHaveLength(PAGE_SIZE)
    expect(store.hasMore).toBe(true)
    expect(store.cards[accessoryId(PAGE_SIZE + 1)]).toBeUndefined()

    await store.loadMore()

    expect(store.visibleIds).toHaveLength(PAGE_SIZE + 3)
    expect(store.hasMore).toBe(false)
    expect(store.cards[accessoryId(PAGE_SIZE + 3)]?.status).toBe('success')
  })

  it(`runs at most ${MAX_PARALLEL_REQUESTS} detail requests at the same time`, async () => {
    const adapter = manyAccessories(PAGE_SIZE, { delayMs: 5 })
    const getProduct = adapter.getProduct.bind(adapter)
    let running = 0
    let mostAtOnce = 0
    vi.spyOn(adapter, 'getProduct').mockImplementation(async (id, opts) => {
      running += 1
      mostAtOnce = Math.max(mostAtOnce, running)
      try {
        return await getProduct(id, opts)
      } finally {
        running -= 1
      }
    })
    useAdapter(adapter)
    const store = useAccessoriesStore()

    await store.load('MNY-0001', LOCALE)

    expect(mostAtOnce).toBe(MAX_PARALLEL_REQUESTS)
    expect(store.stats.loaded).toBe(PAGE_SIZE)
  })

  it('gives a failing card its own error and keeps the others', async () => {
    useAdapter(new MockProductAdapter({ errors: { 'ACC-0002': new TimeoutError(8000) } }))
    const store = useAccessoriesStore()

    await store.load('MAN-0001', LOCALE)

    expect(store.cards['ACC-0002']).toMatchObject({ status: 'error' })
    expect(store.cards['ACC-0001']?.status).toBe('success')
    expect(store.stats).toEqual({ total: 3, loaded: 2, failed: 1 })
  })

  it('loads a failed card again with retryCard', async () => {
    const adapter = new MockProductAdapter()
    vi.spyOn(adapter, 'getProduct').mockRejectedValueOnce(new TimeoutError(8000))
    useAdapter(adapter)
    const store = useAccessoriesStore()
    await store.load('MAN-0001', LOCALE)
    expect(store.cards['ACC-0001']?.status).toBe('error')

    await store.retryCard('ACC-0001')

    expect(store.cards['ACC-0001']?.status).toBe('success')
  })

  it('marks an accessory that no longer exists as unavailable', async () => {
    const groups: AccessoryGroup[] = [
      { categoryId: 'a', headline: 'A', productIds: [tryToProductId('GON-0001')] },
    ]
    useAdapter(new MockProductAdapter({ accessoryGroups: { 'MAN-0001': groups } }))
    const store = useAccessoriesStore()

    await store.load('MAN-0001', LOCALE)

    expect(store.cards['GON-0001']).toEqual({ status: 'unavailable' })
  })

  it('ends in an error when the groups cannot be loaded, and retries them', async () => {
    const adapter = new MockProductAdapter()
    vi.spyOn(adapter, 'getAccessoryGroups').mockRejectedValueOnce(new ServerError(503))
    useAdapter(adapter)
    const store = useAccessoriesStore()
    await store.load('MAN-0001', LOCALE)
    expect(store.status).toBe('error')
    expect(store.error).toBeInstanceOf(ServerError)
    expect(store.isTimeout).toBe(false)

    await store.retry()

    expect(store.status).toBe('success')
    expect(store.visibleIds).toHaveLength(3)
  })

  it('reports a timeout of the groups', async () => {
    useAdapter(new MockProductAdapter({ errors: { 'MAN-0001': new TimeoutError(8000) } }))
    const store = useAccessoriesStore()

    await store.load('MAN-0001', LOCALE)

    expect(store.isTimeout).toBe(true)
    expect(store.error?.retryable).toBe(true)
  })

  it('ends in an error for an unknown product', async () => {
    const store = useAccessoriesStore()

    await store.load('ZZZ-9999', LOCALE)

    expect(store.error).toBeInstanceOf(ProductNotFoundError)
  })

  it('does nothing on retry before the first load', async () => {
    const store = useAccessoriesStore()

    await store.retry()

    expect(createCatalogServices).not.toHaveBeenCalled()
    expect(store.status).toBe('idle')
  })

  it('drops the previous product when a newer load starts', async () => {
    useAdapter(new MockProductAdapter({ delayMs: 20 }))
    const store = useAccessoriesStore()

    const first = store.load('MAN-0001', LOCALE)
    const second = store.load('NOA-0001', LOCALE)
    await Promise.all([first, second])

    expect(store.status).toBe('success')
    expect(store.stats.total).toBe(0)
    expect(store.cards).toEqual({})
  })

  it('goes back to idle when a running load is cancelled', async () => {
    useAdapter(new MockProductAdapter({ delayMs: 20 }))
    const store = useAccessoriesStore()

    const loading = store.load('MAN-0001', LOCALE)
    store.cancel()
    await loading
    await flushPromises()

    expect(store.status).toBe('idle')
    expect(store.cards).toEqual({})
  })
})

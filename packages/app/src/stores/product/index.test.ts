import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import {
  createServices,
  FAKE_CABLE_FAMILY,
  InvalidProductIdError,
  type Locale,
  MAIN_PRODUCT,
  MockProductAdapter,
  ProductNotFoundError,
  ServerError,
  TimeoutError,
} from '@product-explorer/core'
import { createCatalogServices } from '@/api'
import { useProductStore } from '@/stores'

// The real factory picks the configured catalog adapter; here it returns services on the core mock adapter.
vi.mock('@/api', () => ({ createCatalogServices: vi.fn() }))

const LOCALE: Locale = { country: 'de', language: 'en' }

/** Makes `createCatalogServices` return services on `adapter` for every locale. */
function useAdapter(adapter: MockProductAdapter): void {
  vi.mocked(createCatalogServices).mockImplementation(() => createServices(adapter))
}

describe('useProductStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(createCatalogServices).mockReset()
    useAdapter(new MockProductAdapter())
    setActivePinia(createPinia())
  })

  it('starts idle, without product or error', () => {
    const store = useProductStore()

    expect(store.status).toBe('idle')
    expect(store.product).toBeNull()
    expect(store.error).toBeNull()
  })

  it('is loading while the request runs, then success with the product', async () => {
    const store = useProductStore()

    const loading = store.load('MAN-0001', LOCALE)

    expect(store.status).toBe('loading')
    expect(store.isLoading).toBe(true)
    await loading
    expect(store.status).toBe('success')
    expect(store.isLoading).toBe(false)
    expect(store.product).toEqual(MAIN_PRODUCT)
  })

  it('creates the services for the requested country and language', async () => {
    const store = useProductStore()

    await store.load('MAN-0001', LOCALE)

    expect(createCatalogServices).toHaveBeenCalledWith(LOCALE)
  })

  it('uses the newly selected language for the next load', async () => {
    const store = useProductStore()
    await store.load('MAN-0001', LOCALE)

    await store.load('MAN-0001', { country: 'de', language: 'de' })

    expect(createCatalogServices).toHaveBeenLastCalledWith({ country: 'de', language: 'de' })
  })

  it('ends in an error, not retryable, for an unknown product', async () => {
    const store = useProductStore()

    await store.load('ZZZ-9999', LOCALE)

    expect(store.status).toBe('error')
    expect(store.error).toBeInstanceOf(ProductNotFoundError)
    expect(store.error?.retryable).toBe(false)
    expect(store.product).toBeNull()
  })

  it('ends in an error for an invalid product id, without a request', async () => {
    const adapter = new MockProductAdapter()
    const getProduct = vi.spyOn(adapter, 'getProduct')
    useAdapter(adapter)
    const store = useProductStore()

    await store.load('not-an-id', LOCALE)

    expect(store.error).toBeInstanceOf(InvalidProductIdError)
    expect(getProduct).not.toHaveBeenCalled()
  })

  it('reports a timeout, which can be retried', async () => {
    useAdapter(new MockProductAdapter({ errors: { 'MAN-0001': new TimeoutError(8000) } }))
    const store = useProductStore()

    await store.load('MAN-0001', LOCALE)

    expect(store.status).toBe('error')
    expect(store.isTimeout).toBe(true)
    expect(store.error?.retryable).toBe(true)
  })

  it('does not call other errors a timeout', async () => {
    useAdapter(new MockProductAdapter({ errors: { 'MAN-0001': new ServerError(503) } }))
    const store = useProductStore()

    await store.load('MAN-0001', LOCALE)

    expect(store.isTimeout).toBe(false)
    expect(store.error).toBeInstanceOf(ServerError)
  })

  it('loads the same product again on retry, with the same locale', async () => {
    const failing = new MockProductAdapter({ errors: { 'MAN-0001': new TimeoutError(8000) } })
    vi.mocked(createCatalogServices).mockImplementationOnce(() => createServices(failing))
    const store = useProductStore()
    await store.load('MAN-0001', LOCALE)

    await store.retry()

    expect(store.status).toBe('success')
    expect(store.error).toBeNull()
    expect(store.product).toEqual(MAIN_PRODUCT)
    expect(createCatalogServices).toHaveBeenLastCalledWith(LOCALE)
  })

  it('does nothing on retry before the first load', async () => {
    const store = useProductStore()

    await store.retry()

    expect(createCatalogServices).not.toHaveBeenCalled()
    expect(store.status).toBe('idle')
  })

  it('cancels a running request when a newer one starts, so the newer product wins', async () => {
    useAdapter(new MockProductAdapter({ delayMs: 20 }))
    const store = useProductStore()

    const first = store.load('MAN-0001', LOCALE)
    const second = store.load(FAKE_CABLE_FAMILY[0]!.id, LOCALE)
    await Promise.all([first, second])

    expect(store.status).toBe('success')
    expect(store.product?.id).toBe('CBL-0001')
    expect(store.error).toBeNull()
  })

  it('goes back to idle when a running request is cancelled', async () => {
    useAdapter(new MockProductAdapter({ delayMs: 20 }))
    const store = useProductStore()

    const loading = store.load('MAN-0001', LOCALE)
    store.cancel()
    await loading
    await flushPromises()

    expect(store.status).toBe('idle')
    expect(store.product).toBeNull()
    expect(store.error).toBeNull()
  })
})

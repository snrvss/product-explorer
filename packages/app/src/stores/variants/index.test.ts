import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  createServices,
  FAKE_CABLE_FAMILY_VARIANTS,
  type Locale,
  MockProductAdapter,
  ServerError,
} from '@product-explorer/core'
import { createCatalogServices } from '@/api'
import { useVariantsStore } from '@/stores'

// The real factory picks the configured catalog adapter; here it returns services on the core mock adapter.
vi.mock('@/api', () => ({ createCatalogServices: vi.fn() }))

const LOCALE: Locale = { country: 'de', language: 'en' }

/** Makes `createCatalogServices` return services on `adapter` for every locale. */
function useAdapter(adapter: MockProductAdapter): void {
  vi.mocked(createCatalogServices).mockImplementation(() => createServices(adapter))
}

describe('useVariantsStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(createCatalogServices).mockReset()
    useAdapter(new MockProductAdapter())
    setActivePinia(createPinia())
  })

  it('starts idle, without variants', () => {
    const store = useVariantsStore()

    expect(store.status).toBe('idle')
    expect(store.variants).toEqual([])
  })

  it('is loading while the request runs, then success with the variants', async () => {
    const store = useVariantsStore()

    const loading = store.load('CBL-0001', LOCALE)

    expect(store.isLoading).toBe(true)
    await loading
    expect(store.status).toBe('success')
    expect(store.variants).toEqual(FAKE_CABLE_FAMILY_VARIANTS)
  })

  it('creates the services for the requested country and language', async () => {
    const store = useVariantsStore()

    await store.load('CBL-0001', LOCALE)

    expect(createCatalogServices).toHaveBeenCalledWith(LOCALE)
  })

  it('succeeds with an empty list for a product without variants', async () => {
    const store = useVariantsStore()

    await store.load('MAN-0001', LOCALE)

    expect(store.status).toBe('success')
    expect(store.variants).toEqual([])
  })

  it('keeps the list without a request when switching to another variant of it', async () => {
    const adapter = new MockProductAdapter()
    const getVariants = vi.spyOn(adapter, 'getVariants')
    useAdapter(adapter)
    const store = useVariantsStore()
    await store.load('CBL-0001', LOCALE)

    await store.load('CBL-0005', LOCALE)

    expect(getVariants).toHaveBeenCalledTimes(1)
    expect(store.variants).toEqual(FAKE_CABLE_FAMILY_VARIANTS)
  })

  it('loads again for a variant in another language', async () => {
    const adapter = new MockProductAdapter()
    const getVariants = vi.spyOn(adapter, 'getVariants')
    useAdapter(adapter)
    const store = useVariantsStore()
    await store.load('CBL-0001', LOCALE)

    await store.load('CBL-0005', { country: 'de', language: 'de' })

    expect(getVariants).toHaveBeenCalledTimes(2)
  })

  it('loads a new list for a product outside the loaded family', async () => {
    const store = useVariantsStore()
    await store.load('CBL-0001', LOCALE)

    await store.load('MAN-0001', LOCALE)

    expect(store.variants).toEqual([])
  })

  it('ends in error without variants when the request fails', async () => {
    useAdapter(new MockProductAdapter({ errors: { 'CBL-0001': new ServerError(503) } }))
    const store = useVariantsStore()

    await store.load('CBL-0001', LOCALE)

    expect(store.status).toBe('error')
    expect(store.error).toBeInstanceOf(ServerError)
    expect(store.variants).toEqual([])
  })

  it('ignores the answer of a request that a newer load replaced', async () => {
    useAdapter(new MockProductAdapter({ delayMs: 20 }))
    const store = useVariantsStore()

    const first = store.load('CBL-0001', LOCALE)
    const second = store.load('MAN-0001', LOCALE)
    await Promise.all([first, second])

    expect(store.status).toBe('success')
    expect(store.variants).toEqual([])
  })

  it('goes back to idle when cancelled while loading', () => {
    useAdapter(new MockProductAdapter({ delayMs: 20 }))
    const store = useVariantsStore()
    void store.load('CBL-0001', LOCALE)

    store.cancel()

    expect(store.status).toBe('idle')
  })
})

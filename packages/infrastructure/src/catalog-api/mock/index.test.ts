import { describe, expect, it } from 'vitest'
import {
  createServices,
  InvalidResponseError,
  RequestAbortedError,
  tryToProductId,
} from '@product-explorer/core'
import { MOCK_CATALOG, MockCatalogAdapter } from '@/catalog-api/mock'

const id = tryToProductId

describe('MockCatalogAdapter', () => {
  const adapter = new MockCatalogAdapter()

  describe('getProduct', () => {
    it('returns the product, checked and converted like an API response', async () => {
      const product = await adapter.getProduct(id('PRD-1001'))

      expect(product).toMatchObject({
        id: 'PRD-1001',
        headline: 'Inductive proximity sensor',
        price: { amount: 84.9, currency: 'EUR' },
        categoryId: 'inductive-sensors',
        detailUrl: '/products/PRD-1001',
      })
      expect(product?.image?.sizes[400]).toBe('/mock-images/inductive-sensor.svg')
    })

    it('returns a product without image and one without public price', async () => {
      const withoutImage = await adapter.getProduct(id('PRD-1105'))
      const withoutPrice = await adapter.getProduct(id('PRD-1402'))

      expect(withoutImage?.image).toBeNull()
      expect(withoutPrice).toMatchObject({ price: null, formattedPrice: null })
    })

    it.each(['PRD-9999', 'PRD-1999'])('returns null for the unknown id %s', async (unknown) => {
      expect(await adapter.getProduct(id(unknown))).toBeNull()
    })
  })

  describe('getAccessoryGroups', () => {
    it('returns the groups in data order', async () => {
      const groups = await adapter.getAccessoryGroups(id('PRD-1001'))

      expect(groups?.map((group) => group.headline)).toEqual([
        'Connection cables',
        'Mounting accessories',
      ])
      expect(groups?.flatMap((group) => group.productIds)).toHaveLength(10)
    })

    it('returns [] for a known product without accessories', async () => {
      expect(await adapter.getAccessoryGroups(id('PRD-1007'))).toEqual([])
    })

    it('returns null for an unknown product', async () => {
      expect(await adapter.getAccessoryGroups(id('PRD-9999'))).toBeNull()
    })
  })

  describe('getCategoryProducts', () => {
    it('returns the products of the category, including the product itself', async () => {
      const summaries = await adapter.getCategoryProducts('pressure-sensors')

      expect(summaries.map((summary) => summary.id)).toEqual([
        'PRD-1201',
        'PRD-1202',
        'PRD-1203',
        'PRD-1204',
        'PRD-1205',
      ])
    })

    it.each(['unknown-category', 'constructor', '__proto__'])(
      'returns [] for the unknown category "%s"',
      async (categoryId) => {
        expect(await adapter.getCategoryProducts(categoryId)).toEqual([])
      },
    )
  })

  describe('getVariants', () => {
    it('returns the variant family, sorted by cable length', async () => {
      const variants = await adapter.getVariants(id('PRD-1302'))

      expect(variants.map((variant) => [variant.id, variant.cableLength])).toEqual([
        ['PRD-1301', 2],
        ['PRD-1302', 5],
        ['PRD-1303', 10],
        ['PRD-1304', 15],
      ])
    })

    it('returns variants that are not defined by a cable length', async () => {
      const variants = await adapter.getVariants(id('PRD-1203'))

      expect(variants).toHaveLength(5)
      expect(variants.every((variant) => variant.cableLength === null)).toBe(true)
    })

    it.each(['PRD-1001', 'PRD-9999'])('returns [] for %s, which has no variants', async (raw) => {
      expect(await adapter.getVariants(id(raw))).toEqual([])
    })
  })

  describe('validation', () => {
    it('fails like a broken API response when an entry has the wrong shape', async () => {
      const broken = new MockCatalogAdapter({
        data: { ...MOCK_CATALOG, products: { 'PRD-1001': { id: 'PRD-1001' } } },
      })

      const result = broken.getProduct(id('PRD-1001'))

      await expect(result).rejects.toThrow(InvalidResponseError)
    })
  })

  describe('delay and cancelling', () => {
    it('rejects with RequestAbortedError when the signal is already aborted', async () => {
      const controller = new AbortController()
      controller.abort()

      const result = adapter.getProduct(id('PRD-1001'), { signal: controller.signal })

      await expect(result).rejects.toThrow(RequestAbortedError)
    })

    it('rejects with RequestAbortedError when aborted while waiting for the delay', async () => {
      const slow = new MockCatalogAdapter({ delayMs: 10_000 })
      const controller = new AbortController()

      const result = slow.getVariants(id('PRD-1301'), { signal: controller.signal })
      controller.abort()

      await expect(result).rejects.toThrow(RequestAbortedError)
    })

    it('answers after the delay', async () => {
      vi.useFakeTimers()
      try {
        const slow = new MockCatalogAdapter({ delayMs: 300 })
        let product: unknown = 'pending'

        void slow.getProduct(id('PRD-1001')).then((result) => (product = result))
        await vi.advanceTimersByTimeAsync(299)
        expect(product).toBe('pending')
        await vi.advanceTimersByTimeAsync(1)

        expect(product).toMatchObject({ id: 'PRD-1001' })
      } finally {
        vi.useRealTimers()
      }
    })
  })

  it('works behind the core services façade', async () => {
    const services = createServices(new MockCatalogAdapter())

    const product = await services.getProduct(' prd-1001 ')

    expect(product.id).toBe('PRD-1001')
  })
})

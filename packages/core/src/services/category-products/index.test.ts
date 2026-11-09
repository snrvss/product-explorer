import { describe, expect, it, vi } from 'vitest'
import { CategoryProductsService } from '.'
import { CategoryNotFoundError, RequestAbortedError, ServerError, UnexpectedError } from '@/errors'
import { FAKE_CATEGORY_ID, FAKE_CATEGORY_PRODUCTS, MockProductAdapter } from '@/utils/mock-adapters'

describe('CategoryProductsService', () => {
  it('returns the category products from the port', async () => {
    const service = new CategoryProductsService(new MockProductAdapter())

    await expect(service.getCategoryProducts(FAKE_CATEGORY_ID)).resolves.toEqual(
      FAKE_CATEGORY_PRODUCTS,
    )
  })

  it('passes the category id and the abort signal to the port', async () => {
    const adapter = new MockProductAdapter()
    const getCategoryProducts = vi.spyOn(adapter, 'getCategoryProducts')
    const { signal } = new AbortController()

    await new CategoryProductsService(adapter).getCategoryProducts(FAKE_CATEGORY_ID, { signal })

    expect(getCategoryProducts).toHaveBeenCalledWith(FAKE_CATEGORY_ID, { signal })
  })

  it('throws CategoryNotFoundError when the port returns an unknown category as empty list', async () => {
    const service = new CategoryProductsService(new MockProductAdapter())

    await expect(service.getCategoryProducts('unknown_category')).rejects.toThrow(
      CategoryNotFoundError,
    )
  })

  it('throws CategoryNotFoundError when the category exists but has no products', async () => {
    const adapter = new MockProductAdapter({ categoryProducts: { [FAKE_CATEGORY_ID]: [] } })

    await expect(
      new CategoryProductsService(adapter).getCategoryProducts(FAKE_CATEGORY_ID),
    ).rejects.toThrow(CategoryNotFoundError)
  })

  it('passes domain errors of the port through unchanged', async () => {
    const error = new ServerError(503)
    const service = new CategoryProductsService(
      new MockProductAdapter({ errors: { [FAKE_CATEGORY_ID]: error } }),
    )

    await expect(service.getCategoryProducts(FAKE_CATEGORY_ID)).rejects.toBe(error)
  })

  it('turns a native AbortError of the port into RequestAbortedError', async () => {
    const adapter = new MockProductAdapter()
    vi.spyOn(adapter, 'getCategoryProducts').mockRejectedValue(
      new DOMException('aborted', 'AbortError'),
    )

    await expect(
      new CategoryProductsService(adapter).getCategoryProducts(FAKE_CATEGORY_ID),
    ).rejects.toThrow(RequestAbortedError)
  })

  it('wraps any other error of the port in UnexpectedError', async () => {
    const adapter = new MockProductAdapter()
    vi.spyOn(adapter, 'getCategoryProducts').mockRejectedValue(new TypeError('adapter bug'))

    await expect(
      new CategoryProductsService(adapter).getCategoryProducts(FAKE_CATEGORY_ID),
    ).rejects.toThrow(UnexpectedError)
  })
})

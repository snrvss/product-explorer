import { describe, expect, it, vi } from 'vitest'
import { ProductService } from '.'
import { InvalidProductIdError, ProductNotFoundError, ServerError, UnexpectedError } from '@/errors'
import { MAIN_PRODUCT, MockProductAdapter } from '@/utils/mock-adapters'

describe('ProductService', () => {
  it('returns the product from the port', async () => {
    const service = new ProductService(new MockProductAdapter())

    await expect(service.getProduct('MAN-0001')).resolves.toBe(MAIN_PRODUCT)
  })

  it('passes the normalized id and the abort signal to the port', async () => {
    const adapter = new MockProductAdapter()
    const getProduct = vi.spyOn(adapter, 'getProduct')
    const { signal } = new AbortController()

    await new ProductService(adapter).getProduct(' man-0001 ', { signal })

    expect(getProduct).toHaveBeenCalledWith('MAN-0001', { signal })
  })

  it('rejects with InvalidProductIdError without calling the port', async () => {
    const adapter = new MockProductAdapter()
    const getProduct = vi.spyOn(adapter, 'getProduct')

    await expect(new ProductService(adapter).getProduct('XXXX999')).rejects.toThrow(
      InvalidProductIdError,
    )
    expect(getProduct).not.toHaveBeenCalled()
  })

  it('throws ProductNotFoundError with the normalized id when the port returns null', async () => {
    const service = new ProductService(new MockProductAdapter())

    const error = await service.getProduct('zzz-9999').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ProductNotFoundError)
    expect((error as ProductNotFoundError).productId).toBe('ZZZ-9999')
  })

  it('passes domain errors of the port through unchanged', async () => {
    const error = new ServerError(503)
    const service = new ProductService(new MockProductAdapter({ errors: { 'MAN-0001': error } }))

    await expect(service.getProduct('MAN-0001')).rejects.toBe(error)
  })

  it('wraps any other error of the port in UnexpectedError', async () => {
    const adapter = new MockProductAdapter()
    const bug = new TypeError('adapter bug')
    vi.spyOn(adapter, 'getProduct').mockRejectedValue(bug)

    const error = await new ProductService(adapter).getProduct('MAN-0001').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(UnexpectedError)
    expect((error as UnexpectedError).cause).toBe(bug)
  })
})

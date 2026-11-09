import { describe, expect, it, vi } from 'vitest'
import { VariantsService } from '.'
import { InvalidProductIdError, TimeoutError, UnexpectedError } from '@/errors'
import { FAKE_CABLE_VARIANTS, MockProductAdapter } from '@/utils/mock-adapters'

describe('VariantsService', () => {
  it('returns the variants from the port, including the product itself', async () => {
    const service = new VariantsService(new MockProductAdapter())

    const variants = await service.getVariants('ACC-0001')

    expect(variants).toEqual(FAKE_CABLE_VARIANTS)
    expect(variants.map((variant) => variant.id)).toContain('ACC-0001')
  })

  it('returns an empty list for a product without variants', async () => {
    const service = new VariantsService(new MockProductAdapter())

    await expect(service.getVariants('MAN-0001')).resolves.toEqual([])
  })

  it('returns an empty list for an unknown product, because the API can not tell the difference', async () => {
    const service = new VariantsService(new MockProductAdapter())

    await expect(service.getVariants('ZZZ-9999')).resolves.toEqual([])
  })

  it('passes the normalized id and the abort signal to the port', async () => {
    const adapter = new MockProductAdapter()
    const getVariants = vi.spyOn(adapter, 'getVariants')
    const { signal } = new AbortController()

    await new VariantsService(adapter).getVariants(' acc-0001 ', { signal })

    expect(getVariants).toHaveBeenCalledWith('ACC-0001', { signal })
  })

  it('rejects with InvalidProductIdError without calling the port', async () => {
    const adapter = new MockProductAdapter()
    const getVariants = vi.spyOn(adapter, 'getVariants')

    await expect(new VariantsService(adapter).getVariants('XXXX999')).rejects.toThrow(
      InvalidProductIdError,
    )
    expect(getVariants).not.toHaveBeenCalled()
  })

  it('passes domain errors of the port through unchanged', async () => {
    const error = new TimeoutError(8000)
    const service = new VariantsService(new MockProductAdapter({ errors: { 'ACC-0001': error } }))

    await expect(service.getVariants('ACC-0001')).rejects.toBe(error)
  })

  it('wraps any other error of the port in UnexpectedError', async () => {
    const adapter = new MockProductAdapter()
    vi.spyOn(adapter, 'getVariants').mockRejectedValue(new TypeError('adapter bug'))

    await expect(new VariantsService(adapter).getVariants('ACC-0001')).rejects.toThrow(
      UnexpectedError,
    )
  })
})

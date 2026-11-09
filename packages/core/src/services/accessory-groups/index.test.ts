import { describe, expect, it, vi } from 'vitest'
import { AccessoryGroupsService } from '.'
import {
  InvalidProductIdError,
  NetworkError,
  ProductNotFoundError,
  UnexpectedError,
} from '@/errors'
import { FAKE_ACCESSORY_GROUPS, MockProductAdapter } from '@/utils/mock-adapters'

describe('AccessoryGroupsService', () => {
  it('returns the accessory groups from the port', async () => {
    const service = new AccessoryGroupsService(new MockProductAdapter())

    await expect(service.getAccessoryGroups('MAN-0001')).resolves.toEqual(FAKE_ACCESSORY_GROUPS)
  })

  it('returns an empty list for a product without accessories', async () => {
    const service = new AccessoryGroupsService(new MockProductAdapter())

    await expect(service.getAccessoryGroups('NOA-0001')).resolves.toEqual([])
  })

  it('throws ProductNotFoundError when the port does not know the product', async () => {
    const service = new AccessoryGroupsService(new MockProductAdapter())

    await expect(service.getAccessoryGroups('ZZZ-9999')).rejects.toThrow(ProductNotFoundError)
  })

  it('passes the normalized id and the abort signal to the port', async () => {
    const adapter = new MockProductAdapter()
    const getAccessoryGroups = vi.spyOn(adapter, 'getAccessoryGroups')
    const { signal } = new AbortController()

    await new AccessoryGroupsService(adapter).getAccessoryGroups('man-0001', { signal })

    expect(getAccessoryGroups).toHaveBeenCalledWith('MAN-0001', { signal })
  })

  it('rejects with InvalidProductIdError without calling the port', async () => {
    const adapter = new MockProductAdapter()
    const getAccessoryGroups = vi.spyOn(adapter, 'getAccessoryGroups')

    await expect(new AccessoryGroupsService(adapter).getAccessoryGroups('')).rejects.toThrow(
      InvalidProductIdError,
    )
    expect(getAccessoryGroups).not.toHaveBeenCalled()
  })

  it('passes domain errors of the port through unchanged', async () => {
    const error = new NetworkError()
    const service = new AccessoryGroupsService(
      new MockProductAdapter({ errors: { 'MAN-0001': error } }),
    )

    await expect(service.getAccessoryGroups('MAN-0001')).rejects.toBe(error)
  })

  it('wraps any other error of the port in UnexpectedError', async () => {
    const adapter = new MockProductAdapter()
    vi.spyOn(adapter, 'getAccessoryGroups').mockRejectedValue(new TypeError('adapter bug'))

    await expect(
      new AccessoryGroupsService(adapter).getAccessoryGroups('MAN-0001'),
    ).rejects.toThrow(UnexpectedError)
  })
})

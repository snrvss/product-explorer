import { describe, expect, it } from 'vitest'
import {
  createServices,
  FAKE_ACCESSORY_GROUPS,
  FAKE_CABLE_VARIANTS,
  FAKE_CATEGORY_ID,
  FAKE_CATEGORY_PRODUCTS,
  MAIN_PRODUCT,
  MockProductAdapter,
  RequestAbortedError,
} from '@product-explorer/core'

describe('createServices public entry point', () => {
  it('makes all four product operations available through one facade', async () => {
    const services = createServices(new MockProductAdapter())

    await expect(services.getProduct('man-0001')).resolves.toBe(MAIN_PRODUCT)
    await expect(services.getAccessoryGroups('MAN-0001')).resolves.toEqual(FAKE_ACCESSORY_GROUPS)
    await expect(services.getCategoryProducts(FAKE_CATEGORY_ID)).resolves.toEqual(
      FAKE_CATEGORY_PRODUCTS,
    )
    await expect(services.getVariants('ACC-0001')).resolves.toEqual(FAKE_CABLE_VARIANTS)
  })

  it('forwards cancellation options and preserves cancellation errors', async () => {
    const services = createServices(new MockProductAdapter())
    const controller = new AbortController()
    controller.abort()
    const options = { signal: controller.signal }

    await expect(services.getProduct('MAN-0001', options)).rejects.toBeInstanceOf(
      RequestAbortedError,
    )
    await expect(services.getAccessoryGroups('MAN-0001', options)).rejects.toBeInstanceOf(
      RequestAbortedError,
    )
    await expect(services.getCategoryProducts(FAKE_CATEGORY_ID, options)).rejects.toBeInstanceOf(
      RequestAbortedError,
    )
    await expect(services.getVariants('ACC-0001', options)).rejects.toBeInstanceOf(
      RequestAbortedError,
    )
  })
})

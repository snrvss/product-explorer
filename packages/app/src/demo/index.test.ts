import { describe, expect, it } from 'vitest'
import {
  createServices,
  InvalidResponseError,
  NetworkError,
  ProductNotFoundError,
  RequestAbortedError,
  ServerError,
  TimeoutError,
  tryToProductId,
} from '@product-explorer/core'
import { MockCatalogAdapter } from '@product-explorer/infrastructure'
import {
  BROKEN_IMAGE_URL,
  createDemoAdapter,
  type DemoSettings,
  FOREVER_MS,
  readDemoSettings,
} from '@/demo'

const NO_FAILURES: DemoSettings = { delayMs: 0, failures: {}, images: {} }

/** Services on the mock catalog, wrapped by the demo adapter. */
function demoServices(settings: DemoSettings = NO_FAILURES) {
  return createServices(createDemoAdapter(new MockCatalogAdapter(), settings))
}

describe('readDemoSettings', () => {
  it('returns null when the URL does not ask for demo mode', () => {
    expect(readDemoSettings('')).toBeNull()
    expect(readDemoSettings('?delay=2000')).toBeNull()
  })

  it('switches demo mode on with ?demo, without delay or failures', () => {
    expect(readDemoSettings('?demo')).toEqual(NO_FAILURES)
  })

  it('reads the delay, and "forever" for requests that never answer', () => {
    expect(readDemoSettings('?demo&delay=2000')?.delayMs).toBe(2000)
    expect(readDemoSettings('?demo&delay=forever')?.delayMs).toBe(FOREVER_MS)
    expect(readDemoSettings('?demo&delay=soon')?.delayMs).toBe(0)
  })

  it('reads several failures and ignores unknown kinds', () => {
    const settings = readDemoSettings(
      '?demo&fail=PRD-1302=timeout,accessories:PRD-1001=server,X=boom',
    )

    expect(settings?.failures).toEqual({ 'PRD-1302': 'timeout', 'accessories:PRD-1001': 'server' })
  })

  it('reads photo problems and ignores unknown kinds', () => {
    const settings = readDemoSettings('?demo&image=PRD-1001=broken,PRD-1301=none,PRD-1302=blurry')

    expect(settings?.images).toEqual({ 'PRD-1001': 'broken', 'PRD-1301': 'none' })
  })
})

describe('createDemoAdapter', () => {
  it('passes data of the wrapped adapter through unchanged', async () => {
    const services = demoServices()

    const product = await services.getProduct('PRD-1001')
    const groups = await services.getAccessoryGroups('PRD-1001')

    expect(product).toEqual(await new MockCatalogAdapter().getProduct(tryToProductId('PRD-1001')))
    expect(groups.flatMap((group) => group.productIds)).toHaveLength(10)
  })

  it('keeps "not found" results of the wrapped adapter', async () => {
    const services = demoServices()

    await expect(services.getProduct('PRD-1999')).rejects.toBeInstanceOf(ProductNotFoundError)
  })

  it.each([
    ['timeout', TimeoutError],
    ['server', ServerError],
    ['network', NetworkError],
    ['invalid', InvalidResponseError],
  ] as const)('fails every request for an id with %s', async (kind, ErrorClass) => {
    const services = demoServices({ ...NO_FAILURES, failures: { 'PRD-1001': kind } })

    await expect(services.getProduct('PRD-1001')).rejects.toBeInstanceOf(ErrorClass)
    await expect(services.getAccessoryGroups('PRD-1001')).rejects.toBeInstanceOf(ErrorClass)
  })

  it('fails only the named request when an operation is given', async () => {
    const services = demoServices({
      ...NO_FAILURES,
      failures: { 'accessories:PRD-1001': 'server' },
    })

    await expect(services.getProduct('PRD-1001')).resolves.toMatchObject({ id: 'PRD-1001' })
    await expect(services.getAccessoryGroups('PRD-1001')).rejects.toBeInstanceOf(ServerError)
  })

  it('fails the category list by its category id', async () => {
    const services = demoServices({
      ...NO_FAILURES,
      failures: { 'category:inductive-sensors': 'timeout' },
    })

    await expect(services.getCategoryProducts('inductive-sensors')).rejects.toBeInstanceOf(
      TimeoutError,
    )
  })

  it('removes the photo of a product with image "none"', async () => {
    const services = demoServices({ ...NO_FAILURES, images: { 'PRD-1001': 'none' } })

    const product = await services.getProduct('PRD-1001')

    expect(product.image).toBeNull()
  })

  it('points every size to an undecodable file for image "broken"', async () => {
    const services = demoServices({ ...NO_FAILURES, images: { 'PRD-1001': 'broken' } })

    const product = await services.getProduct('PRD-1001')

    expect(Object.values(product.image?.sizes ?? {})).toEqual(Array(4).fill(BROKEN_IMAGE_URL))
  })

  it('can be cancelled while waiting for its delay', async () => {
    const adapter = createDemoAdapter(new MockCatalogAdapter(), {
      ...NO_FAILURES,
      delayMs: FOREVER_MS,
    })
    const controller = new AbortController()

    const result = adapter.getProduct(tryToProductId('PRD-1001'), { signal: controller.signal })
    controller.abort()

    await expect(result).rejects.toBeInstanceOf(RequestAbortedError)
  })
})

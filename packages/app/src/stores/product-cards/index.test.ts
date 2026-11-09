import { describe, expect, it, vi } from 'vitest'
import {
  ACCESSORY_PRODUCTS,
  createServices,
  MockProductAdapter,
  TimeoutError,
} from '@product-explorer/core'
import { loadProductCards, MAX_PARALLEL_REQUESTS, type ProductCardState } from '@/stores'

/** Collects the reported states, in the order they arrive. */
function collect(): {
  results: Array<[string, ProductCardState]>
  onResult: (id: string, state: ProductCardState) => void
} {
  const results: Array<[string, ProductCardState]> = []
  return { results, onResult: (id, state) => results.push([id, state]) }
}

describe('loadProductCards', () => {
  it('reports every product once: success, error or unavailable', async () => {
    const adapter = new MockProductAdapter({ errors: { 'ACC-0002': new TimeoutError(8000) } })
    const { results, onResult } = collect()

    await loadProductCards(
      ['ACC-0001', 'ACC-0002', 'GON-0001'],
      createServices(adapter),
      new AbortController().signal,
      onResult,
    )

    const byId = Object.fromEntries(results)
    expect(results).toHaveLength(3)
    expect(byId['ACC-0001']).toEqual({ status: 'success', product: ACCESSORY_PRODUCTS[0] })
    expect(byId['ACC-0002']).toMatchObject({ status: 'error' })
    expect(byId['GON-0001']).toEqual({ status: 'unavailable' })
  })

  it(`runs at most ${MAX_PARALLEL_REQUESTS} requests at the same time`, async () => {
    const adapter = new MockProductAdapter({ delayMs: 5 })
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
    const ids = ['ACC-0001', 'ACC-0002', 'ACC-0003', 'CAT-0001', 'CAT-0002', 'CAT-0003', 'MAN-0001']

    await loadProductCards(ids, createServices(adapter), new AbortController().signal, () => {})

    expect(mostAtOnce).toBe(MAX_PARALLEL_REQUESTS)
  })

  it('reports nothing for requests that were cancelled', async () => {
    const controller = new AbortController()
    const { results, onResult } = collect()
    const loading = loadProductCards(
      ['ACC-0001', 'ACC-0002'],
      createServices(new MockProductAdapter({ delayMs: 20 })),
      controller.signal,
      onResult,
    )

    controller.abort()
    await loading

    expect(results).toEqual([])
  })
})

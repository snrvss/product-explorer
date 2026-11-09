import { describe, expect, it } from 'vitest'
import { InvalidResponseError, ServerError } from '@product-explorer/core'
import { fetchCategoryProducts } from '.'
import { RestClient } from '@/rest-client'
import { requestedUrl, respondWith } from '@/rest-client/fake-fetch'
import mockCategoryProducts from '@/catalog-api/mock/mock-data/category-products.json'
/*
 * Tests what fetchCategoryProducts itself does: request, status and not-found handling.
 * Checking and mapping the body are tested in convert.test.ts.
 */

const CATEGORY_ID = 'inductive-sensors'

/** The inductive sensors from the mock catalog. */
const validResponse = mockCategoryProducts[CATEGORY_ID]

function clientFor(fetch: typeof globalThis.fetch) {
  return new RestClient('/api/de/en/', { fetch })
}

describe('fetchCategoryProducts', () => {
  it('requests categories/{id}/products', async () => {
    const fetch = respondWith(validResponse)

    await fetchCategoryProducts(clientFor(fetch), CATEGORY_ID)

    expect(requestedUrl(fetch)).toBe('/api/de/en/categories/inductive-sensors/products')
  })

  it('returns the checked and converted summaries for a 200 response', async () => {
    const client = clientFor(respondWith(validResponse))

    const summaries = await fetchCategoryProducts(client, CATEGORY_ID)

    expect(summaries).toHaveLength(7)
    expect(summaries[0]).toEqual({
      id: 'PRD-1001',
      name: 'Inductive proximity sensor',
      price: { amount: 84.9, currency: 'EUR' },
    })
  })

  it.each([
    ['404', respondWith({ status: 404 }, 404)],
    ['400', respondWith({ status: 400 }, 400)],
    ['an empty 200 body', respondWith('', 200, '')],
  ])('returns [] for %s', async (_case, fetch) => {
    const client = clientFor(fetch)

    const summaries = await fetchCategoryProducts(client, 'unknown-category')

    expect(summaries).toEqual([])
  })

  it('throws InvalidResponseError for an unexpected status like 403', async () => {
    const client = clientFor(respondWith({}, 403))

    const result = fetchCategoryProducts(client, CATEGORY_ID)

    await expect(result).rejects.toThrow(
      new InvalidResponseError('categoryProducts: unexpected status 403'),
    )
  })

  it('passes server failures on as ServerError', async () => {
    const client = clientFor(respondWith('<html></html>', 503, 'text/html'))

    const result = fetchCategoryProducts(client, CATEGORY_ID)

    await expect(result).rejects.toThrow(ServerError)
  })
})

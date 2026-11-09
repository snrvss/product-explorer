import { describe, expect, it } from 'vitest'
import { InvalidResponseError, ServerError, tryToProductId } from '@product-explorer/core'
import { fetchProduct } from '.'
import { RestClient } from '@/rest-client'
import { requestedUrl, respondWith } from '@/rest-client/fake-fetch'
import mockProducts from '@/catalog-api/mock/mock-data/products.json'
/*
 * Tests what fetchProduct itself does: request, status and not-found handling.
 * Checking and mapping the body are tested in convert.test.ts.
 */

const PRD_1001 = tryToProductId('PRD-1001')

/** A `products/{id}` response from the mock catalog. */
const validResponse = mockProducts['PRD-1001']

/** Problem+json body an API could send with a 400 for malformed ids. */
const invalidIdResponse = {
  title: 'Bad Request',
  status: 400,
  detail: 'productId must match ^[A-Z]{3}-\\d{4}$',
}

function clientFor(fetch: typeof globalThis.fetch) {
  return new RestClient('/api/de/en/', { fetch })
}

describe('fetchProduct', () => {
  it('requests products/{id} below the base URL', async () => {
    const fetch = respondWith(validResponse)

    await fetchProduct(clientFor(fetch), PRD_1001)

    expect(requestedUrl(fetch)).toBe('/api/de/en/products/PRD-1001')
  })

  it('returns the checked and converted product for a 200 response', async () => {
    const client = clientFor(respondWith(validResponse))

    const product = await fetchProduct(client, PRD_1001)

    expect(product).toMatchObject({ id: 'PRD-1001', categoryId: 'inductive-sensors' })
  })

  it.each([
    ['404', respondWith({ status: 404 }, 404)],
    ['400', respondWith(invalidIdResponse, 400)],
    ['an empty 200 body', respondWith('', 200, '')],
  ])('returns null for %s', async (_case, fetch) => {
    const client = clientFor(fetch)

    const product = await fetchProduct(client, PRD_1001)

    expect(product).toBeNull()
  })

  it('throws InvalidResponseError for an unexpected status like 403', async () => {
    const client = clientFor(respondWith({}, 403))

    const result = fetchProduct(client, PRD_1001)

    await expect(result).rejects.toThrow(new InvalidResponseError('product: unexpected status 403'))
  })

  it('passes server failures on as ServerError', async () => {
    const client = clientFor(respondWith('<html></html>', 503, 'text/html'))

    const result = fetchProduct(client, PRD_1001)

    await expect(result).rejects.toThrow(ServerError)
  })
})

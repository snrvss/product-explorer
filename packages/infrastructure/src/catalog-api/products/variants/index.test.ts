import { describe, expect, it } from 'vitest'
import { InvalidResponseError, ServerError, tryToProductId } from '@product-explorer/core'
import { fetchVariants } from '.'
import { RestClient } from '@/rest-client'
import { requestedUrl, respondWith } from '@/rest-client/fake-fetch'
import mockVariants from '@/catalog-api/mock/mock-data/variants.json'
/*
 * Tests what fetchVariants itself does: request, status and not-found handling.
 * Checking and mapping the body are tested in convert.test.ts.
 */

const PRD_1301 = tryToProductId('PRD-1301')

/** Variants of PRD-1301 from the mock catalog: the straight M12 cable in four lengths. */
const validResponse = mockVariants['PRD-1301']

function clientFor(fetch: typeof globalThis.fetch) {
  return new RestClient('/api/de/en/', { fetch })
}

describe('fetchVariants', () => {
  it('requests products/{id}/variants', async () => {
    const fetch = respondWith(validResponse)

    await fetchVariants(clientFor(fetch), PRD_1301)

    expect(requestedUrl(fetch)).toBe('/api/de/en/products/PRD-1301/variants')
  })

  it('returns the checked and converted variants for a 200 response', async () => {
    const client = clientFor(respondWith(validResponse))

    const variants = await fetchVariants(client, PRD_1301)

    expect(variants.map((variant) => variant.cableLength)).toEqual([2, 5, 10, 15])
  })

  it.each([
    ['404', respondWith({ status: 404 }, 404)],
    ['400', respondWith({ status: 400 }, 400)],
    ['an empty 200 body', respondWith('', 200, '')],
  ])('returns [] for %s', async (_case, fetch) => {
    const client = clientFor(fetch)

    const variants = await fetchVariants(client, PRD_1301)

    expect(variants).toEqual([])
  })

  it('throws InvalidResponseError for an unexpected status like 403', async () => {
    const client = clientFor(respondWith({}, 403))

    const result = fetchVariants(client, PRD_1301)

    await expect(result).rejects.toThrow(
      new InvalidResponseError('variants: unexpected status 403'),
    )
  })

  it('passes server failures on as ServerError', async () => {
    const client = clientFor(respondWith('<html></html>', 503, 'text/html'))

    const result = fetchVariants(client, PRD_1301)

    await expect(result).rejects.toThrow(ServerError)
  })
})

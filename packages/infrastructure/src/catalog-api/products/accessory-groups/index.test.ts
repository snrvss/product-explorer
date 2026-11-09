import { describe, expect, it } from 'vitest'
import { InvalidResponseError, ServerError, tryToProductId } from '@product-explorer/core'
import { fetchAccessoryGroups } from '.'
import { RestClient } from '@/rest-client'
import { requestedUrl, respondWith } from '@/rest-client/fake-fetch'
import mockAccessories from '@/catalog-api/mock/mock-data/accessories.json'
/*
 * Tests what fetchAccessoryGroups itself does: request, status and not-found handling.
 * Checking and mapping the body are tested in convert.test.ts.
 */

const PRD_1101 = tryToProductId('PRD-1101')

/** Accessories of PRD-1101 from the mock catalog. */
const validResponse = mockAccessories['PRD-1101']

/** What the API sends for a product without accessories (PRD-1007 in the mock catalog). */
const noAccessoriesResponse = mockAccessories['PRD-1007']

function clientFor(fetch: typeof globalThis.fetch) {
  return new RestClient('/api/de/en/', { fetch })
}

describe('fetchAccessoryGroups', () => {
  it('requests products/{id}/accessories', async () => {
    const fetch = respondWith(validResponse)

    await fetchAccessoryGroups(clientFor(fetch), PRD_1101)

    expect(requestedUrl(fetch)).toBe('/api/de/en/products/PRD-1101/accessories')
  })

  it('returns the checked and converted groups for a 200 response', async () => {
    const client = clientFor(respondWith(validResponse))

    const groups = await fetchAccessoryGroups(client, PRD_1101)

    expect(groups?.map((group) => group.productIds)).toEqual([
      ['PRD-1301', 'PRD-1302', 'PRD-1305', 'PRD-1306'],
      ['PRD-1402'],
    ])
  })

  it('returns [] (not null) for a product that has no accessories', async () => {
    const client = clientFor(respondWith(noAccessoriesResponse))

    const groups = await fetchAccessoryGroups(client, tryToProductId('PRD-1007'))

    expect(groups).toEqual([])
  })

  it.each([
    ['404', respondWith({ status: 404 }, 404)],
    ['400', respondWith({ status: 400 }, 400)],
    ['an empty 200 body', respondWith('', 200, '')],
  ])('returns null for %s', async (_case, fetch) => {
    const client = clientFor(fetch)

    const groups = await fetchAccessoryGroups(client, PRD_1101)

    expect(groups).toBeNull()
  })

  it('passes server failures on as ServerError', async () => {
    const client = clientFor(respondWith('<html></html>', 503, 'text/html'))

    const result = fetchAccessoryGroups(client, PRD_1101)

    await expect(result).rejects.toThrow(ServerError)
  })

  it('throws InvalidResponseError for an unexpected status like 403', async () => {
    const client = clientFor(respondWith({}, 403))

    const result = fetchAccessoryGroups(client, PRD_1101)

    await expect(result).rejects.toThrow(
      new InvalidResponseError('accessories: unexpected status 403'),
    )
  })
})

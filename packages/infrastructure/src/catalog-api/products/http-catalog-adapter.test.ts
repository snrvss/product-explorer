import { describe, expect, it } from 'vitest'
import { createServices } from '@product-explorer/core'
import { HttpCatalogAdapter } from '@/catalog-api/products'
import { RestClient } from '@/rest-client'
import { requestedUrl, respondWith } from '@/rest-client/fake-fetch'
import mockProducts from '@/catalog-api/mock/mock-data/products.json'
/*
 * One integration test for the intended setup. The adapter only delegates; the operations and
 * converters it delegates to have their own tests.
 */

describe('RestClient → HttpCatalogAdapter → createServices', () => {
  it('loads a product through the services façade, including id normalization', async () => {
    const fetch = respondWith(mockProducts['PRD-1001'])
    const services = createServices(
      new HttpCatalogAdapter(new RestClient('/api/de/en/', { fetch })),
    )

    const product = await services.getProduct(' prd-1001 ')

    expect(product).toMatchObject({ id: 'PRD-1001', headline: 'Inductive proximity sensor' })
    expect(requestedUrl(fetch)).toBe('/api/de/en/products/PRD-1001')
  })
})

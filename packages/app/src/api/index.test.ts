import { describe, expect, it } from 'vitest'
import { HttpCatalogAdapter, MockCatalogAdapter } from '@product-explorer/infrastructure'
import { createCatalogAdapter } from '@/api'
import { readConfig } from '@/config'

const LOCALE = { country: 'de', language: 'en' }

describe('createCatalogAdapter', () => {
  it('uses the mock catalog by default', () => {
    const adapter = createCatalogAdapter(LOCALE, readConfig({}))

    expect(adapter).toBeInstanceOf(MockCatalogAdapter)
  })

  it('uses the HTTP adapter with VITE_CATALOG_ADAPTER=http', () => {
    const adapter = createCatalogAdapter(LOCALE, readConfig({ VITE_CATALOG_ADAPTER: 'http' }))

    expect(adapter).toBeInstanceOf(HttpCatalogAdapter)
  })
})

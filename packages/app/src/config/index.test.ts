import { describe, expect, it } from 'vitest'
import { DEFAULT_MOCK_DELAY_MS, readConfig } from '@/config'

describe('readConfig', () => {
  it('uses the mock catalog, no website link and the default delay when nothing is set', () => {
    expect(readConfig({})).toEqual({
      catalogAdapter: 'mock',
      catalogSiteUrl: null,
      mockDelayMs: DEFAULT_MOCK_DELAY_MS,
    })
  })

  it.each([
    ['http', 'http'],
    [' HTTP ', 'http'],
    ['mock', 'mock'],
    ['graphql', 'mock'],
    ['', 'mock'],
  ])('reads VITE_CATALOG_ADAPTER=%j as %s', (value, expected) => {
    expect(readConfig({ VITE_CATALOG_ADAPTER: value }).catalogAdapter).toBe(expected)
  })

  it('reads the website URL without trailing slashes', () => {
    const config = readConfig({ VITE_CATALOG_SITE_URL: 'https://shop.example.com//' })

    expect(config.catalogSiteUrl).toBe('https://shop.example.com')
  })

  it('treats an empty website URL as not set', () => {
    expect(readConfig({ VITE_CATALOG_SITE_URL: '  ' }).catalogSiteUrl).toBeNull()
  })

  it.each([
    ['0', 0],
    ['1200', 1200],
    ['-5', DEFAULT_MOCK_DELAY_MS],
    ['soon', DEFAULT_MOCK_DELAY_MS],
  ])('reads VITE_MOCK_DELAY_MS=%j as %d', (value, expected) => {
    expect(readConfig({ VITE_MOCK_DELAY_MS: value }).mockDelayMs).toBe(expected)
  })
})

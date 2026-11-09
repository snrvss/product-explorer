import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { fakeProduct, MAIN_PRODUCT, type Product } from '@product-explorer/core'
import { ProductInfo } from '@/components/ProductInfo'
import { setLanguage } from '@/i18n'

/** Replaces the browser clipboard; `writeText` resolves, or rejects if `fails` is set. */
function useClipboard(fails = false) {
  const writeText = fails
    ? vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError'))
    : vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
  return writeText
}

function mountInfo(product: Product = MAIN_PRODUCT, siteUrl: string | null = null) {
  return mount(ProductInfo, { props: { product, siteUrl } })
}

describe('ProductInfo', () => {
  beforeEach(() => {
    setLanguage('en')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('shows type, name as the page heading, product id, summary and price', () => {
    const info = mountInfo()

    expect(info.get('.product-info__eyebrow').text()).toBe(MAIN_PRODUCT.headline)
    expect(info.get('h1').text()).toBe('MAN-0001')
    expect(info.get('.product-info__id').text()).toBe('MAN-0001')
    expect(info.get('.product-info__description').text()).toBe(MAIN_PRODUCT.shortDescription)
    expect(info.get('.product-info__price').text()).toBe(MAIN_PRODUCT.formattedPrice)
  })

  it('shows the price exactly as the API formats it', () => {
    const info = mountInfo(fakeProduct({ id: 'PRC-0001', formattedPrice: '84,90 €' }))

    const price = info.get('.product-info__price')

    expect(price.text()).toBe('84,90 €')
    expect(price.classes()).not.toContain('product-info__price--on-request')
  })

  it('shows "Price on request" when there is no public price', () => {
    const info = mountInfo(fakeProduct({ id: 'NPR-0001', price: null }))

    const price = info.get('.product-info__price')

    expect(price.text()).toBe('Price on request')
    expect(price.classes()).toContain('product-info__price--on-request')
  })

  it('links to the product page when a catalog website is configured', () => {
    const info = mountInfo(MAIN_PRODUCT, 'https://shop.example.com')

    const link = info.get('a.button-link')

    expect(link.attributes('href')).toBe(`https://shop.example.com${MAIN_PRODUCT.detailUrl}`)
    expect(link.text()).toBe('View on website')
  })

  it('shows no website link when no catalog website is configured', () => {
    const info = mountInfo()

    expect(info.find('a.button-link').exists()).toBe(false)
    expect(info.get('button.base-button').text()).toBe('Copy product ID')
  })

  it('copies the product id, confirms it and announces it to screen readers', async () => {
    const writeText = useClipboard()
    const info = mountInfo()

    await info.get('button.base-button').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('MAN-0001')
    expect(info.get('button.base-button').text()).toBe('Copied')
    expect(info.get('[role="status"]').text()).toBe('Product ID MAN-0001 was copied.')
  })

  it('shows the normal label again after two seconds', async () => {
    vi.useFakeTimers()
    useClipboard()
    const info = mountInfo()
    await info.get('button.base-button').trigger('click')
    await flushPromises()

    await vi.advanceTimersByTimeAsync(2000)

    expect(info.get('button.base-button').text()).toBe('Copy product ID')
    expect(info.get('[role="status"]').text()).toBe('')
  })

  it('says so when the clipboard is blocked', async () => {
    useClipboard(true)
    const info = mountInfo()

    await info.get('button.base-button').trigger('click')
    await flushPromises()

    expect(info.get('button.base-button').text()).toBe('Could not copy')
    expect(info.get('[role="status"]').text()).toBe('Could not copy')
  })

  it('leaves out what the product does not have', () => {
    const info = mountInfo(fakeProduct({ id: 'BAR-0001', headline: '', shortDescription: '' }))

    expect(info.find('.product-info__eyebrow').exists()).toBe(false)
    expect(info.find('.product-info__description').exists()).toBe(false)
  })
})

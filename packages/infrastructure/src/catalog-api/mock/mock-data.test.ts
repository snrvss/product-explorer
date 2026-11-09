import { describe, expect, it } from 'vitest'
import { isProductId } from '@product-explorer/core'
import { convertProduct, readProduct } from '@/catalog-api/products/product/convert'
import {
  convertAccessories,
  readAccessories,
} from '@/catalog-api/products/accessory-groups/convert'
import {
  convertCategoryProducts,
  readCategoryProducts,
} from '@/catalog-api/products/category-products/convert'
import { convertVariants, readVariants } from '@/catalog-api/products/variants/convert'
import { MOCK_CATALOG } from '@/catalog-api/mock'

/*
 * Consistency of the fictional catalog in mock-data/*.json: every entry passes the same checks as
 * an API response, and the files agree with each other (ids, categories, links).
 */

/** Listed as an accessory on purpose, but not in the catalog: shows "No longer available". */
const DISCONTINUED_ID = 'PRD-1999'

const products = Object.entries(MOCK_CATALOG.products).map(([key, body]) => ({
  key,
  product: convertProduct(readProduct(body)),
}))
const productIds = new Set(products.map(({ product }) => product.id))

describe('mock catalog data', () => {
  it('has 30 products in 5 categories', () => {
    const categories = new Set(products.map(({ product }) => product.categoryId))

    expect(products).toHaveLength(30)
    expect(categories.size).toBe(5)
  })

  it('keys every product by its own valid id', () => {
    for (const { key, product } of products) {
      expect(isProductId(key)).toBe(true)
      expect(product.id).toBe(key)
    }
  })

  it('lists every product in the category list of its own category, with the same name and price', () => {
    for (const { product } of products) {
      const list = convertCategoryProducts(
        readCategoryProducts(MOCK_CATALOG.categoryProducts[product.categoryId]),
      )

      expect(list).toContainEqual({ id: product.id, name: product.headline, price: product.price })
    }
  })

  it('lists only known products in the category lists', () => {
    for (const body of Object.values(MOCK_CATALOG.categoryProducts)) {
      for (const summary of convertCategoryProducts(readCategoryProducts(body))) {
        expect(productIds).toContain(summary.id)
      }
    }
  })

  it('links accessories only to known products, except the one discontinued id', () => {
    const linked = Object.values(MOCK_CATALOG.accessories).flatMap((body) =>
      convertAccessories(readAccessories(body)).flatMap((group) => group.productIds),
    )
    const unknown = new Set(linked.filter((linkedId) => !productIds.has(linkedId)))

    expect(linked.length).toBeGreaterThan(0)
    expect([...unknown]).toEqual([DISCONTINUED_ID])
  })

  it('has accessory data only for known products', () => {
    for (const key of Object.keys(MOCK_CATALOG.accessories)) {
      expect(productIds).toContain(key)
    }
  })

  it('makes every variant list contain the product itself, and the same list for every member', () => {
    for (const [key, body] of Object.entries(MOCK_CATALOG.variants)) {
      const family = convertVariants(readVariants(body))
      const familyIds = family.map((variant) => variant.id)

      expect(familyIds).toContain(key)
      for (const member of familyIds) {
        expect(productIds).toContain(member)
        expect(readVariants(MOCK_CATALOG.variants[member])).toEqual(readVariants(body))
      }
    }
  })

  it('has at least one product without accessories, without image and without price', () => {
    const accessoryCount = (productId: string) =>
      convertAccessories(readAccessories(MOCK_CATALOG.accessories[productId])).length

    expect(products.some(({ product }) => product.image === null)).toBe(true)
    expect(products.some(({ product }) => product.price === null)).toBe(true)
    expect(accessoryCount('PRD-1007')).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'
import { InvalidResponseError } from '@product-explorer/core'
import {
  convertCategoryProducts,
  readCategoryProducts,
} from '@/catalog-api/products/category-products/convert'
import type { CategoryProductsDto } from '@/catalog-api/products/category-products/entity'
import mockCategoryProducts from '@/catalog-api/mock/mock-data/category-products.json'

/** The mounting accessories from the mock catalog: four products, one without a public price. */
const validResponse = mockCategoryProducts['mounting-accessories']

/** Marks a field that should be removed instead of set. */
const MISSING = Symbol('missing')

/** Copy of `object` with `key` set to `value`, or removed for {@link MISSING}. */
function withField(object: object, key: string, value: unknown): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...object }
  if (value === MISSING) {
    delete copy[key]
  } else {
    copy[key] = value
  }
  return copy
}

/** The valid response with the first product replaced. */
function withFirstProduct(product: unknown): Record<string, unknown> {
  const [, ...rest] = validResponse.products
  return { ...validResponse, products: [product, ...rest] }
}

/** The valid response with one field of the first product changed. */
function withFirstProductField(key: string, value: unknown): Record<string, unknown> {
  return withFirstProduct(withField(validResponse.products[0] ?? {}, key, value))
}

describe('readCategoryProducts', () => {
  it('returns the checked response with the API field names', () => {
    const dto: unknown = validResponse

    const categoryProducts = readCategoryProducts(dto)

    expect(categoryProducts).toEqual({
      products: [
        { id: 'PRD-1401', type: 'Mounting bracket', price: { amount: 9.8, currency: 'EUR' } },
        { id: 'PRD-1402', type: 'Mounting clamp', price: null },
        { id: 'PRD-1403', type: 'Protective cover', price: { amount: 6.4, currency: 'EUR' } },
        { id: 'PRD-1404', type: 'Reflector', price: { amount: 11.2, currency: 'EUR' } },
      ],
    })
  })

  it('drops fields it does not read', () => {
    const dto = withFirstProductField('stock', 12)

    const categoryProducts = readCategoryProducts(dto)

    expect(categoryProducts.products[0]).not.toHaveProperty('stock')
  })

  it('accepts an empty products list', () => {
    const dto: unknown = { products: [] }

    const categoryProducts = readCategoryProducts(dto)

    expect(categoryProducts).toEqual({ products: [] })
  })

  it.each([
    ['an array', [validResponse]],
    ['null', null],
    ['a string', 'mounting-accessories'],
  ])('throws when the body is %s instead of an object', (_case, dto) => {
    const read = () => readCategoryProducts(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(new InvalidResponseError('categoryProducts: expected an object'))
  })

  it.each([
    ['missing', MISSING],
    ['null', null],
    ['an object', {}],
  ])('throws when products is %s', (_case, value) => {
    const dto = withField(validResponse, 'products', value)

    const read = () => readCategoryProducts(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(new InvalidResponseError('categoryProducts.products: expected an array'))
  })

  it.each([
    ['a number', 42],
    ['null', null],
    ['an array', []],
  ])('throws when a product is %s instead of an object', (_case, product) => {
    const dto = withFirstProduct(product)

    const read = () => readCategoryProducts(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(
      new InvalidResponseError('categoryProducts.products[0]: expected an object'),
    )
  })

  it('includes the index of the broken product in the error path', () => {
    const dto: unknown = { products: [validResponse.products[0], 42] }

    const read = () => readCategoryProducts(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(
      new InvalidResponseError('categoryProducts.products[1]: expected an object'),
    )
  })

  describe.each(['id', 'type'])('required string %s', (key) => {
    it.each([
      ['missing', MISSING],
      ['null', null],
      ['a number', 1401],
    ])(`throws when ${key} is %s`, (_case, value) => {
      const dto = withFirstProductField(key, value)

      const read = () => readCategoryProducts(dto)

      expect(read).toThrow(InvalidResponseError)
      expect(read).toThrow(
        new InvalidResponseError(`categoryProducts.products[0].${key}: expected a string`),
      )
    })
  })

  it.each([
    ['a number', 9.8],
    ['a string', '9.80'],
  ])('throws when price is %s instead of an object', (_case, value) => {
    const dto = withFirstProductField('price', value)

    const read = () => readCategoryProducts(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(
      new InvalidResponseError('categoryProducts.products[0].price: expected an object'),
    )
  })

  it('throws when the price amount is not a number', () => {
    const dto = withFirstProductField('price', { amount: 'cheap', currency: 'EUR' })

    const read = () => readCategoryProducts(dto)

    expect(read).toThrow(InvalidResponseError)
  })

  it.each([
    ['missing', MISSING],
    ['null', null],
  ])('accepts a %s price and returns null', (_case, value) => {
    const dto = withFirstProductField('price', value)

    const categoryProducts = readCategoryProducts(dto)

    expect(categoryProducts.products[0]?.price).toBeNull()
  })
})

describe('convertCategoryProducts', () => {
  it('maps the checked response to core ProductSummaries', () => {
    const dto: CategoryProductsDto = {
      products: [
        { id: 'PRD-1401', type: 'Mounting bracket', price: { amount: 9.8, currency: 'EUR' } },
        { id: 'prd-1402', type: 'Mounting clamp', price: null },
      ],
    }

    const summaries = convertCategoryProducts(dto)

    expect(summaries).toEqual([
      { id: 'PRD-1401', name: 'Mounting bracket', price: { amount: 9.8, currency: 'EUR' } },
      { id: 'PRD-1402', name: 'Mounting clamp', price: null },
    ])
  })

  it('returns an empty list when there are no products', () => {
    const dto: CategoryProductsDto = { products: [] }

    const summaries = convertCategoryProducts(dto)

    expect(summaries).toEqual([])
  })

  it('maps a price with an empty currency to null', () => {
    const dto: CategoryProductsDto = {
      products: [
        { id: 'PRD-1401', type: 'Mounting bracket', price: { amount: 9.8, currency: '' } },
      ],
    }

    const summaries = convertCategoryProducts(dto)

    expect(summaries[0]?.price).toBeNull()
  })

  it('keeps a price of 0', () => {
    const dto: CategoryProductsDto = {
      products: [{ id: 'PRD-1401', type: 'Free sample', price: { amount: 0, currency: 'EUR' } }],
    }

    const summaries = convertCategoryProducts(dto)

    expect(summaries[0]?.price).toEqual({ amount: 0, currency: 'EUR' })
  })

  it('throws when a product id is not a valid product id', () => {
    const dto: CategoryProductsDto = {
      products: [
        { id: 'PRD-1401', type: 'Mounting bracket', price: null },
        { id: '??', type: 'Broken', price: null },
      ],
    }

    const convert = () => convertCategoryProducts(dto)

    expect(convert).toThrow(InvalidResponseError)
    expect(convert).toThrow(
      new InvalidResponseError('categoryProducts.products[1].id: "??" is not a valid product id'),
    )
  })
})

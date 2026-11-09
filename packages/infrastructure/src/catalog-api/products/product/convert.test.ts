import { describe, expect, it } from 'vitest'
import { InvalidResponseError } from '@product-explorer/core'
import { convertProduct, readProduct } from '@/catalog-api/products/product/convert'
import type { ProductDto } from '@/catalog-api/products/product/entity'
import mockProducts from '@/catalog-api/mock/mock-data/products.json'

/** PRD-1001 from the mock catalog: a complete response with image, price and features. */
const validResponse = mockProducts['PRD-1001']

const imageUrl = '/mock-images/inductive-sensor.svg'

/** The checked DTO that belongs to {@link validResponse}. */
const validDto: ProductDto = {
  id: 'PRD-1001',
  title: 'PRD-1001',
  type: 'Inductive proximity sensor',
  summary:
    'Inductive proximity sensor; M12 x 1 housing; Sensing range 4 mm; flush mounting; PNP; normally open; IP67; M12 connector',
  features: [
    'Stainless steel housing for harsh environments',
    'Sensing range 4 mm, flush mountable',
    'Switching status LED visible from all sides',
    'Remote diagnostics through a digital interface',
  ],
  images: { '140': imageUrl, '200': imageUrl, '300': imageUrl, '400': imageUrl },
  price: { amount: 84.9, currency: 'EUR' },
  formattedPrice: '84,90 €',
  categoryId: 'inductive-sensors',
  url: '/products/PRD-1001',
}

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

describe('readProduct', () => {
  it('returns the checked response with the API field names', () => {
    const dto: unknown = validResponse

    const product = readProduct(dto)

    expect(product).toEqual(validDto)
  })

  it('drops fields it does not read', () => {
    const dto = withField(validResponse, 'internalNote', 'not for the UI')

    const product = readProduct(dto)

    expect(product).toEqual(validDto)
  })

  it.each([
    ['an array', [validResponse]],
    ['null', null],
    ['a string', 'PRD-1001'],
  ])('throws when the body is %s instead of an object', (_case, dto) => {
    const read = () => readProduct(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(new InvalidResponseError('product: expected an object'))
  })

  describe.each(['id', 'title', 'type', 'summary', 'categoryId', 'url'])(
    'required string %s',
    (key) => {
      it.each([
        ['missing', MISSING],
        ['null', null],
        ['a number', 42],
      ])(`throws when ${key} is %s`, (_case, value) => {
        const dto = withField(validResponse, key, value)

        const read = () => readProduct(dto)

        expect(read).toThrow(InvalidResponseError)
        expect(read).toThrow(new InvalidResponseError(`product.${key}: expected a string`))
      })
    },
  )

  it.each([
    ['a string', 'Stainless steel housing'],
    ['an object', {}],
  ])('throws when features is %s instead of an array', (_case, value) => {
    const dto = withField(validResponse, 'features', value)

    const read = () => readProduct(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(new InvalidResponseError('product.features: expected an array'))
  })

  it('throws when a feature is a number, with its index in the path', () => {
    const dto = withField(validResponse, 'features', ['Stainless steel housing', 2])

    const read = () => readProduct(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(new InvalidResponseError('product.features[1]: expected a string'))
  })

  it.each([
    ['a string', imageUrl],
    ['an array', []],
  ])('throws when images is %s instead of an object', (_case, value) => {
    const dto = withField(validResponse, 'images', value)

    const read = () => readProduct(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(new InvalidResponseError('product.images: expected an object'))
  })

  it.each([
    ['a string', '84.90'],
    ['an array', [84.9, 'EUR']],
  ])('throws when price is %s instead of an object', (_case, value) => {
    const dto = withField(validResponse, 'price', value)

    const read = () => readProduct(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(new InvalidResponseError('product.price: expected an object'))
  })

  it.each([
    ['missing', { currency: 'EUR' }],
    ['a string', { amount: '84.90', currency: 'EUR' }],
    ['not finite', { amount: Infinity, currency: 'EUR' }],
  ])('throws when the price amount is %s', (_case, value) => {
    const dto = withField(validResponse, 'price', value)

    const read = () => readProduct(dto)

    expect(read).toThrow(InvalidResponseError)
  })

  it('throws when the price currency is not a string', () => {
    const dto = withField(validResponse, 'price', { amount: 84.9, currency: 978 })

    const read = () => readProduct(dto)

    expect(read).toThrow(new InvalidResponseError('product.price.currency: expected a string'))
  })

  it('throws when formattedPrice is a number instead of a string', () => {
    const dto = withField(validResponse, 'formattedPrice', 84.9)

    const read = () => readProduct(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(
      new InvalidResponseError('product.formattedPrice: expected a string or null'),
    )
  })

  it.each(['features', 'images', 'price', 'formattedPrice'])(
    'accepts a missing %s and returns null',
    (key) => {
      const dto = withField(validResponse, key, MISSING)

      const product = readProduct(dto)

      expect(product[key as keyof ProductDto]).toBeNull()
    },
  )

  it.each(['features', 'images', 'price', 'formattedPrice'])(
    'accepts %s set to null and returns null',
    (key) => {
      const dto = withField(validResponse, key, null)

      const product = readProduct(dto)

      expect(product[key as keyof ProductDto]).toBeNull()
    },
  )
})

describe('convertProduct', () => {
  it('maps the checked response to a core Product', () => {
    const dto: ProductDto = validDto

    const product = convertProduct(dto)

    expect(product).toEqual({
      id: 'PRD-1001',
      title: 'PRD-1001',
      headline: 'Inductive proximity sensor',
      shortDescription: validDto.summary,
      bulletPoints: validDto.features,
      image: { sizes: { 140: imageUrl, 200: imageUrl, 300: imageUrl, 400: imageUrl } },
      price: { amount: 84.9, currency: 'EUR' },
      formattedPrice: '84,90 €',
      categoryId: 'inductive-sensors',
      detailUrl: '/products/PRD-1001',
    })
  })

  it('maps missing features to an empty list', () => {
    const dto: ProductDto = { ...validDto, features: null }

    const product = convertProduct(dto)

    expect(product.bulletPoints).toEqual([])
  })

  it('keeps an empty feature list empty', () => {
    const dto: ProductDto = { ...validDto, features: [] }

    const product = convertProduct(dto)

    expect(product.bulletPoints).toEqual([])
  })

  it.each([
    ['there are no image URLs', null],
    ['a size is missing', { '140': 'a', '200': 'b', '300': 'c' }],
    ['a URL is not a string', { ...validDto.images, '400': 400 }],
  ])('maps the image to null when %s', (_case, urls) => {
    const dto: ProductDto = { ...validDto, images: urls }

    const product = convertProduct(dto)

    expect(product.image).toBeNull()
  })

  it.each([
    ['the price is null', null],
    ['the currency is empty', { amount: 84.9, currency: '' }],
    ['the currency is only spaces', { amount: 84.9, currency: '  ' }],
  ])('maps the price to null when %s', (_case, price) => {
    const dto: ProductDto = { ...validDto, price }

    const product = convertProduct(dto)

    expect(product.price).toBeNull()
    expect(product.formattedPrice).toBeNull()
  })

  it.each([
    ['missing', null],
    ['empty', ''],
    ['only spaces', '  '],
  ])('maps the formatted price to null when it is %s, but keeps the price', (_case, value) => {
    const dto: ProductDto = { ...validDto, formattedPrice: value }

    const product = convertProduct(dto)

    expect(product.formattedPrice).toBeNull()
    expect(product.price).toEqual({ amount: 84.9, currency: 'EUR' })
  })

  it('normalizes the product id to upper case', () => {
    const dto: ProductDto = { ...validDto, id: ' prd-1001 ' }

    const product = convertProduct(dto)

    expect(product.id).toBe('PRD-1001')
  })

  it('throws when the product id is not a valid product id', () => {
    const dto: ProductDto = { ...validDto, id: 'PRD1001' }

    const convert = () => convertProduct(dto)

    expect(convert).toThrow(InvalidResponseError)
    expect(convert).toThrow(
      new InvalidResponseError('product.id: "PRD1001" is not a valid product id'),
    )
  })
})

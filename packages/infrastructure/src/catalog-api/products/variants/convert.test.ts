import { describe, expect, it } from 'vitest'
import { InvalidResponseError } from '@product-explorer/core'
import { convertVariants, readVariants } from '@/catalog-api/products/variants/convert'
import type { VariantsDto } from '@/catalog-api/products/variants/entity'
import mockVariants from '@/catalog-api/mock/mock-data/variants.json'

/** Variants of PRD-1305 from the mock catalog: the angled M12 cable in three lengths. */
const validResponse = mockVariants['PRD-1305']

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

/** The valid response with one field of the first variant changed. */
function withFirstVariantField(key: string, value: unknown): Record<string, unknown> {
  const [first, ...rest] = validResponse.variants
  return { variants: [withField(first ?? {}, key, value), ...rest] }
}

describe('readVariants', () => {
  it('returns the checked variants with the API field names', () => {
    const dto: unknown = validResponse

    const variants = readVariants(dto)

    expect(variants).toEqual({
      variants: [
        { id: 'PRD-1305', label: '2 m PUR cable; M12 socket, angled', cableLength: 2 },
        { id: 'PRD-1306', label: '5 m PUR cable; M12 socket, angled', cableLength: 5 },
        { id: 'PRD-1307', label: '10 m PUR cable; M12 socket, angled', cableLength: 10 },
      ],
    })
  })

  it('accepts an empty list', () => {
    const dto: unknown = { variants: [] }

    const variants = readVariants(dto)

    expect(variants).toEqual({ variants: [] })
  })

  it.each([
    ['an array', [validResponse]],
    ['null', null],
    ['a string', 'PRD-1305'],
  ])('throws when the body is %s instead of an object', (_case, dto) => {
    const read = () => readVariants(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(new InvalidResponseError('variants: expected an object'))
  })

  it.each([
    ['missing', MISSING],
    ['null', null],
    ['an object', {}],
  ])('throws when variants is %s', (_case, value) => {
    const dto = withField(validResponse, 'variants', value)

    const read = () => readVariants(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(new InvalidResponseError('variants.variants: expected an array'))
  })

  it('includes the index of the broken entry in the error path', () => {
    const dto: unknown = { variants: [validResponse.variants[0], 42] }

    const read = () => readVariants(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(new InvalidResponseError('variants.variants[1]: expected an object'))
  })

  describe.each(['id', 'label'])('required string %s', (key) => {
    it.each([
      ['missing', MISSING],
      ['null', null],
      ['a number', 1305],
    ])(`throws when ${key} is %s`, (_case, value) => {
      const dto = withFirstVariantField(key, value)

      const read = () => readVariants(dto)

      expect(read).toThrow(InvalidResponseError)
      expect(read).toThrow(
        new InvalidResponseError(`variants.variants[0].${key}: expected a string`),
      )
    })
  })

  it.each([
    ['a string', '2'],
    ['not finite', NaN],
  ])('throws when cableLength is %s', (_case, value) => {
    const dto = withFirstVariantField('cableLength', value)

    const read = () => readVariants(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(
      new InvalidResponseError('variants.variants[0].cableLength: expected a number or null'),
    )
  })

  it.each([
    ['missing', MISSING],
    ['null', null],
  ])('accepts a %s cableLength and returns null', (_case, value) => {
    const dto = withFirstVariantField('cableLength', value)

    const variants = readVariants(dto)

    expect(variants.variants[0]?.cableLength).toBeNull()
  })
})

describe('convertVariants', () => {
  it('maps the checked variants to core ProductVariants', () => {
    const dto: VariantsDto = {
      variants: [
        { id: 'PRD-1201', label: 'Measuring range 0…1 bar', cableLength: null },
        { id: 'PRD-1202', label: 'Measuring range 0…10 bar', cableLength: null },
      ],
    }

    const variants = convertVariants(dto)

    expect(variants).toEqual([
      { id: 'PRD-1201', description: 'Measuring range 0…1 bar', cableLength: null },
      { id: 'PRD-1202', description: 'Measuring range 0…10 bar', cableLength: null },
    ])
  })

  it('returns an empty list for no variants', () => {
    const dto: VariantsDto = { variants: [] }

    const variants = convertVariants(dto)

    expect(variants).toEqual([])
  })

  it('normalizes product ids to upper case', () => {
    const dto: VariantsDto = { variants: [{ id: 'prd-1305', label: '2 m', cableLength: 2 }] }

    const variants = convertVariants(dto)

    expect(variants[0]?.id).toBe('PRD-1305')
  })

  it('throws when a product id is not a valid product id', () => {
    const dto: VariantsDto = {
      variants: [
        { id: 'PRD-1305', label: '2 m', cableLength: 2 },
        { id: 'PRD1306', label: '5 m', cableLength: 5 },
      ],
    }

    const convert = () => convertVariants(dto)

    expect(convert).toThrow(InvalidResponseError)
    expect(convert).toThrow(
      new InvalidResponseError('variants.variants[1].id: "PRD1306" is not a valid product id'),
    )
  })
})

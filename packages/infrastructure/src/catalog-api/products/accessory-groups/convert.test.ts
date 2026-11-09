import { describe, expect, it } from 'vitest'
import { InvalidResponseError } from '@product-explorer/core'
import {
  convertAccessories,
  readAccessories,
} from '@/catalog-api/products/accessory-groups/convert'
import type { AccessoriesDto } from '@/catalog-api/products/accessory-groups/entity'
import mockAccessories from '@/catalog-api/mock/mock-data/accessories.json'

/** Accessories of PRD-1101 from the mock catalog: a cable group and a mounting group. */
const validResponse = mockAccessories['PRD-1101']

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

/** The valid response with the first group replaced. */
function withFirstGroup(group: unknown): Record<string, unknown> {
  const [, ...rest] = validResponse.groups
  return { ...validResponse, groups: [group, ...rest] }
}

/** The valid response with one field of the first group changed. */
function withFirstGroupField(key: string, value: unknown): Record<string, unknown> {
  return withFirstGroup(withField(validResponse.groups[0] ?? {}, key, value))
}

describe('readAccessories', () => {
  it('returns the checked response with the API field names', () => {
    const dto: unknown = validResponse

    const accessories = readAccessories(dto)

    expect(accessories).toEqual({
      groups: [
        {
          categoryId: 'connection-cables',
          title: 'Connection cables',
          productIds: ['PRD-1301', 'PRD-1302', 'PRD-1305', 'PRD-1306'],
        },
        {
          categoryId: 'mounting-accessories',
          title: 'Mounting accessories',
          productIds: ['PRD-1402'],
        },
      ],
    })
  })

  it('drops fields it does not read', () => {
    const dto = withFirstGroupField('sortOrder', 10)

    const accessories = readAccessories(dto)

    expect(accessories.groups[0]).not.toHaveProperty('sortOrder')
  })

  it('accepts an empty groups list', () => {
    const dto: unknown = { groups: [] }

    const accessories = readAccessories(dto)

    expect(accessories).toEqual({ groups: [] })
  })

  it.each([
    ['an array', [validResponse]],
    ['null', null],
    ['a string', 'PRD-1101'],
  ])('throws when the body is %s instead of an object', (_case, dto) => {
    const read = () => readAccessories(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(new InvalidResponseError('accessories: expected an object'))
  })

  it.each([
    ['missing', MISSING],
    ['null', null],
    ['an object', {}],
  ])('throws when groups is %s', (_case, value) => {
    const dto = withField(validResponse, 'groups', value)

    const read = () => readAccessories(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(new InvalidResponseError('accessories.groups: expected an array'))
  })

  it.each([
    ['a number', 42],
    ['null', null],
    ['an array', []],
  ])('throws when a group is %s instead of an object', (_case, group) => {
    const dto = withFirstGroup(group)

    const read = () => readAccessories(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(new InvalidResponseError('accessories.groups[0]: expected an object'))
  })

  it('includes the index of the broken group in the error path', () => {
    const dto: unknown = { groups: [validResponse.groups[0], 42] }

    const read = () => readAccessories(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(new InvalidResponseError('accessories.groups[1]: expected an object'))
  })

  describe.each(['categoryId', 'title'])('required string %s', (key) => {
    it.each([
      ['missing', MISSING],
      ['null', null],
      ['a number', 42],
    ])(`throws when ${key} is %s`, (_case, value) => {
      const dto = withFirstGroupField(key, value)

      const read = () => readAccessories(dto)

      expect(read).toThrow(InvalidResponseError)
      expect(read).toThrow(
        new InvalidResponseError(`accessories.groups[0].${key}: expected a string`),
      )
    })
  })

  it.each([
    ['missing', MISSING],
    ['null', null],
    ['a string', 'PRD-1301'],
  ])('throws when productIds is %s', (_case, value) => {
    const dto = withFirstGroupField('productIds', value)

    const read = () => readAccessories(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(
      new InvalidResponseError('accessories.groups[0].productIds: expected an array'),
    )
  })

  it('throws when a product id is a number, with its index in the path', () => {
    const dto = withFirstGroupField('productIds', ['PRD-1301', 1302])

    const read = () => readAccessories(dto)

    expect(read).toThrow(InvalidResponseError)
    expect(read).toThrow(
      new InvalidResponseError('accessories.groups[0].productIds[1]: expected a string'),
    )
  })
})

describe('convertAccessories', () => {
  it('maps the checked response to core AccessoryGroups', () => {
    const dto: AccessoriesDto = {
      groups: [
        {
          categoryId: 'connection-cables',
          title: 'Connection cables',
          productIds: ['PRD-1301', 'prd-1302'],
        },
        {
          categoryId: 'mounting-accessories',
          title: 'Mounting accessories',
          productIds: ['PRD-1402'],
        },
      ],
    }

    const groups = convertAccessories(dto)

    expect(groups).toEqual([
      {
        categoryId: 'connection-cables',
        headline: 'Connection cables',
        productIds: ['PRD-1301', 'PRD-1302'],
      },
      {
        categoryId: 'mounting-accessories',
        headline: 'Mounting accessories',
        productIds: ['PRD-1402'],
      },
    ])
  })

  it('returns an empty list when there are no groups', () => {
    const dto: AccessoriesDto = { groups: [] }

    const groups = convertAccessories(dto)

    expect(groups).toEqual([])
  })

  it('keeps a group whose product list is empty, with no product ids', () => {
    const dto: AccessoriesDto = {
      groups: [
        { categoryId: 'mounting-accessories', title: 'Mounting accessories', productIds: [] },
      ],
    }

    const groups = convertAccessories(dto)

    expect(groups).toEqual([
      { categoryId: 'mounting-accessories', headline: 'Mounting accessories', productIds: [] },
    ])
  })

  it('throws when a product id is not a valid product id', () => {
    const dto: AccessoriesDto = {
      groups: [
        { categoryId: 'connection-cables', title: 'Connection cables', productIds: ['PRD-1301'] },
        { categoryId: 'mounting-accessories', title: 'Mounting', productIds: ['??'] },
      ],
    }

    const convert = () => convertAccessories(dto)

    expect(convert).toThrow(InvalidResponseError)
    expect(convert).toThrow(
      new InvalidResponseError('accessories.groups[1].productIds: "??" is not a valid product id'),
    )
  })
})

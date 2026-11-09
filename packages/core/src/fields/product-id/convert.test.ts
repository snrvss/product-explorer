import { describe, expect, it } from 'vitest'
import { isProductId, tryToProductId } from '@/fields/product-id/convert'
import { InvalidProductIdError } from '@/errors'

describe('tryToProductId', () => {
  it.each(['PRD-1001', 'PRD-0000', 'ACC-9999', 'XYZ-1234'])('accepts the valid id "%s"', (raw) => {
    expect(tryToProductId(raw)).toBe(raw)
  })

  it('converts to upper case', () => {
    expect(tryToProductId('prd-1001')).toBe('PRD-1001')
  })

  it('trims surrounding whitespace', () => {
    expect(tryToProductId('  PRD-1001\n')).toBe('PRD-1001')
  })

  it('returns the same value for differently written ids, so they can be compared with ===', () => {
    expect(tryToProductId(' pRd-1001 ')).toBe(tryToProductId('PRD-1001'))
  })

  it.each([
    ['empty string', ''],
    ['only whitespace', '   '],
    ['without the dash', 'PRD1001'],
    ['too few digits', 'PRD-100'],
    ['too many digits', 'PRD-10011'],
    ['too few letters', 'PR-1001'],
    ['too many letters', 'PROD-1001'],
    ['digits in the prefix', 'P2D-1001'],
    ['letters in the number', 'PRD-10A1'],
    ['contains inner whitespace', 'PRD- 1001'],
    ['contains an umlaut', 'PRÖ-1001'],
  ])('throws InvalidProductIdError when the id is %s', (_case, raw) => {
    expect(() => tryToProductId(raw)).toThrow(InvalidProductIdError)
  })

  it('keeps the raw input on the error, so the UI can show what the user typed', () => {
    const error = captureError(() => tryToProductId(' prd1001 '))

    expect(error).toBeInstanceOf(InvalidProductIdError)
    expect(error.productId).toBe(' prd1001 ')
    expect(error.retryable).toBe(false)
  })
})

describe('isProductId', () => {
  it('accepts a valid, normalized id', () => {
    expect(isProductId('PRD-1001')).toBe(true)
  })

  it('accepts every value returned by tryToProductId', () => {
    expect(isProductId(tryToProductId(' prd-1001 '))).toBe(true)
  })

  it.each([
    ['lower case', 'prd-1001'],
    ['surrounding whitespace', ' PRD-1001'],
    ['wrong format', 'PRD1001'],
    ['a number', 42],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s', (_case, value) => {
    expect(isProductId(value)).toBe(false)
  })
})

function captureError(fn: () => unknown): InvalidProductIdError {
  try {
    fn()
  } catch (error) {
    return error as InvalidProductIdError
  }
  throw new Error('expected function to throw')
}

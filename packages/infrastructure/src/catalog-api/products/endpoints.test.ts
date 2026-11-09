import { describe, expect, it } from 'vitest'
import { productEndpoints } from '@/catalog-api/products/endpoints'

describe('productEndpoints', () => {
  it('builds the four product paths', () => {
    expect(productEndpoints.product('PRD-1001')).toBe('products/PRD-1001')
    expect(productEndpoints.accessories('PRD-1001')).toBe('products/PRD-1001/accessories')
    expect(productEndpoints.categoryProducts('inductive-sensors')).toBe(
      'categories/inductive-sensors/products',
    )
    expect(productEndpoints.variants('PRD-1301')).toBe('products/PRD-1301/variants')
  })

  it('encodes path parameters, so they can not change the path', () => {
    expect(productEndpoints.product('a b/../c?d')).toBe('products/a%20b%2F..%2Fc%3Fd')
    expect(productEndpoints.categoryProducts('1/2')).toBe('categories/1%2F2/products')
  })
})

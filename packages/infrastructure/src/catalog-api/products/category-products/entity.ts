import type { PriceDto } from '@/catalog-api/products/entity'

/**
 * One product in the response of `GET categories/{categoryId}/products`.
 */
export interface CategoryProductDto {
  /** Product id, e.g. `"PRD-1002"` */
  readonly id: string
  /** Product type, e.g. `"Inductive proximity sensor"` */
  readonly type: string
  /** `null` if the product has no public price */
  readonly price: PriceDto | null
}

/**
 * Response of `GET categories/{categoryId}/products`, reduced to the fields the adapter reads.
 *
 * @remarks
 * Lightweight records without images. Unknown categories answer `404`.
 */
export interface CategoryProductsDto {
  readonly products: readonly CategoryProductDto[]
}

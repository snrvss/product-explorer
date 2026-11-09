import type { Price } from '@/entities'
import type { ProductId } from '@/fields'

/**
 * Reduced product record from the category list.
 *
 * @remarks
 * It has no image; the full {@link Product} must be loaded separately.
 */
export interface ProductSummary {
  /** Product id, e.g. `PRD-1001` */
  readonly id: ProductId
  /** Product type, e.g. `"Inductive proximity sensor"` */
  readonly name: string
  /** `null` if the product has no public price */
  readonly price: Price | null
}

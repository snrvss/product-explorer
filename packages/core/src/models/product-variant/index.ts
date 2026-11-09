import type { ProductId } from '@/fields'

/**
 * One variant of a product, e.g. the same cable in another length.
 *
 * @remarks
 * Reduced record without image or price; the full {@link Product} must be loaded separately.
 * A variant list also contains the product it was requested for.
 */
export interface ProductVariant {
  /** Product id of the variant */
  readonly id: ProductId
  /** What makes this variant different, e.g. `"5 m PUR cable; M12 connector"` */
  readonly description: string
  /** Cable length in metres, e.g. `5`; `null` if the variant is not defined by a cable length */
  readonly cableLength: number | null
}

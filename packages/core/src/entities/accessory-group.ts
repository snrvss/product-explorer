import type { ProductId } from '@/fields'

/**
 * Accessories of a product, grouped by category.
 *
 * @remarks
 * The API only returns ids, no details.
 */
export interface AccessoryGroup {
  /** Category id of the group */
  readonly categoryId: string
  /** Group title, e.g. `"Connection cables"` */
  readonly headline: string
  /** Accessory ids in API order */
  readonly productIds: readonly ProductId[]
}

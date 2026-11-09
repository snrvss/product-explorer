/**
 * Price object used by several catalog API responses.
 */
export interface PriceDto {
  /** Numeric amount, e.g. `84.9` */
  readonly amount: number
  /** ISO 4217 code, e.g. `"EUR"` */
  readonly currency: string
}

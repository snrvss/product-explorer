/**
 * Price of a product.
 *
 * @remarks
 * Raw data only. A product's display text (e.g. `"84,90 €"`) comes formatted from the API, see
 * `Product.formattedPrice`.
 */
export interface Price {
  /** Numeric amount, e.g. `84.9` */
  readonly amount: number
  /** ISO 4217 currency code, e.g. `EUR` */
  readonly currency: string
}

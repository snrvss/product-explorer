/**
 * One entry of the response of `GET products/{productId}/variants`.
 */
export interface VariantDto {
  /** Product id of the variant, e.g. `"PRD-1302"` */
  readonly id: string
  /** What makes this variant different, e.g. `"5 m PUR cable; M12 socket, straight"` */
  readonly label: string
  /** Cable length in metres, e.g. `5`; `null` if the variant is not defined by a cable length */
  readonly cableLength: number | null
}

/**
 * Response of `GET products/{productId}/variants`, reduced to the fields the adapter reads.
 *
 * @remarks
 * The list contains the requested product itself. Products without variants answer
 * `variants: []`; unknown ids answer `404`.
 */
export interface VariantsDto {
  readonly variants: readonly VariantDto[]
}

/**
 * One accessory group in the response of `GET products/{productId}/accessories`.
 */
export interface AccessoryGroupDto {
  /** Category id of the group, e.g. `"connection-cables"` */
  readonly categoryId: string
  /** Group title, e.g. `"Connection cables"` */
  readonly title: string
  /** The accessory ids; there are no details in this response */
  readonly productIds: readonly string[]
}

/**
 * Response of `GET products/{productId}/accessories`, reduced to the fields the adapter reads.
 *
 * @remarks
 * A product without accessories answers `groups: []`; an unknown product answers `404`.
 */
export interface AccessoriesDto {
  readonly groups: readonly AccessoryGroupDto[]
}

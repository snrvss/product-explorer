import { DomainError } from '@/errors/domain-error'

/**
 * Thrown when an id does not match {@link PRODUCT_ID_PATTERN}, or the API answers 400.
 *
 * @remarks
 * Not retryable.
 */
export class InvalidProductIdError extends DomainError {
  readonly code = 'INVALID_PRODUCT_ID'
  readonly retryable = false

  /**
   * @param productId - The raw input, kept as-is so the UI can show what the user typed
   * @param options - Standard `ErrorOptions`
   */
  constructor(
    readonly productId: string,
    options?: ErrorOptions,
  ) {
    super(`"${productId}" is not a valid product id`, options)
  }
}

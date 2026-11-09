import { DomainError } from '@/errors/domain-error'

/**
 * Thrown when the id is valid but no product exists.
 *
 * @remarks
 * The API answers 200 with an empty body for unknown ids (or 404). Not retryable.
 */
export class ProductNotFoundError extends DomainError {
  readonly code = 'PRODUCT_NOT_FOUND'
  readonly retryable = false

  /**
   * @param productId - The id that was not found
   * @param options - Standard `ErrorOptions`
   */
  constructor(
    readonly productId: string,
    options?: ErrorOptions,
  ) {
    super(`Product "${productId}" was not found`, options)
  }
}

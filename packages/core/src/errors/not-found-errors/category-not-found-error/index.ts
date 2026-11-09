import { DomainError } from '@/errors/domain-error'

/**
 * Thrown when the category endpoint answers empty or 404.
 *
 * @remarks
 * Not retryable.
 */
export class CategoryNotFoundError extends DomainError {
  readonly code = 'CATEGORY_NOT_FOUND'
  readonly retryable = false

  /**
   * @param categoryId - The category that was not found
   * @param options - Standard `ErrorOptions`
   */
  constructor(
    readonly categoryId: string,
    options?: ErrorOptions,
  ) {
    super(`Category "${categoryId}" was not found`, options)
  }
}

import { DomainError } from '@/errors/domain-error'

/**
 * Thrown when something failed that is not one of our known error cases, e.g. a bug in an adapter.
 *
 * @remarks
 * Not retryable. The original error is kept as `cause` for debugging.
 */
export class UnexpectedError extends DomainError {
  readonly code = 'UNEXPECTED_ERROR'
  readonly retryable = false

  /**
   * @param options - Standard `ErrorOptions`, use `cause` to keep the original error
   */
  constructor(options?: ErrorOptions) {
    super('An unexpected error occurred', options)
  }
}

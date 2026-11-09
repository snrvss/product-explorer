import { DomainError } from '@/errors/domain-error'

/**
 * Thrown when the caller aborted the request.
 *
 * @remarks
 * Not retryable and never shown in the UI: it means the result is no longer needed,
 * e.g. because the user navigated to another product.
 */
export class RequestAbortedError extends DomainError {
  readonly code = 'REQUEST_ABORTED'
  readonly retryable = false

  /**
   * @param options - Standard `ErrorOptions`
   */
  constructor(options?: ErrorOptions) {
    super('The request was aborted', options)
  }
}

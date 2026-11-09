import { DomainError } from '@/errors/domain-error'

/**
 * Thrown for 5xx and 429 responses.
 *
 * @remarks
 * Retryable.
 */
export class ServerError extends DomainError {
  readonly code = 'SERVER_ERROR'
  readonly retryable = true

  /**
   * @param status - The HTTP status code
   * @param options - Standard `ErrorOptions`
   */
  constructor(
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(`The server answered with status ${status}`, options)
  }
}

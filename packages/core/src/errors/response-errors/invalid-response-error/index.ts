import { DomainError } from '@/errors/domain-error'

/**
 * Thrown when the payload is not valid JSON or required fields are missing.
 *
 * @remarks
 * Not retryable: the same request would return the same payload.
 */
export class InvalidResponseError extends DomainError {
  readonly code = 'INVALID_RESPONSE'
  readonly retryable = false

  /**
   * @param reason - What was wrong with the payload, e.g. `"missing field id"`
   * @param options - Standard `ErrorOptions`
   */
  constructor(
    readonly reason: string,
    options?: ErrorOptions,
  ) {
    super(`Invalid response: ${reason}`, options)
  }
}

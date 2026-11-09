import { DomainError } from '@/errors/domain-error'

/**
 * Thrown when no response arrived within the configured time.
 *
 * @remarks
 * Retryable.
 */
export class TimeoutError extends DomainError {
  readonly code = 'TIMEOUT'
  readonly retryable = true

  /**
   * @param timeoutMs - The timeout that was exceeded, in milliseconds
   * @param options - Standard `ErrorOptions`
   */
  constructor(
    readonly timeoutMs: number,
    options?: ErrorOptions,
  ) {
    super(`No response within ${timeoutMs} ms`, options)
  }
}

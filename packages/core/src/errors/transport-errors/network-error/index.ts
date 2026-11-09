import { DomainError } from '@/errors/domain-error'

/**
 * Thrown when the request never reached the server (offline, DNS, CORS).
 *
 * @remarks
 * Retryable.
 */
export class NetworkError extends DomainError {
  readonly code = 'NETWORK_ERROR'
  readonly retryable = true

  /**
   * @param options - Standard `ErrorOptions`, use `cause` to keep the original `fetch` error
   */
  constructor(options?: ErrorOptions) {
    super('The server could not be reached', options)
  }
}

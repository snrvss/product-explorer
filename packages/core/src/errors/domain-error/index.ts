/**
 * Machine-readable code of a {@link DomainError}, one per subclass.
 */
export type DomainErrorCode =
  | 'INVALID_PRODUCT_ID'
  | 'PRODUCT_NOT_FOUND'
  | 'CATEGORY_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'INVALID_RESPONSE'
  | 'REQUEST_ABORTED'
  | 'UNEXPECTED_ERROR'

/**
 * Base class of every error that crosses a port.
 *
 * @remarks
 * Services use {@link DomainError.retryable} to decide whether to retry,
 * the UI uses it to decide whether to offer a "Retry" button.
 */
export abstract class DomainError extends Error {
  /** Machine-readable error code */
  abstract readonly code: DomainErrorCode
  /** `true` if the same call may succeed when tried again */
  abstract readonly retryable: boolean

  /**
   * @param message - Developer-facing message (UI texts are built from `code` in the app)
   * @param options - Standard `ErrorOptions`, use `cause` to keep the original error
   */
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = new.target.name
  }
}

/**
 * Type guard that tells expected domain errors apart from unexpected ones (bugs).
 *
 * @param error - Any caught value
 * @returns `true` if `error` is a {@link DomainError}
 */
export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError
}

import { type DomainError, isDomainError } from '@/errors/domain-error'
import { RequestAbortedError } from '@/errors/transport-errors'
import { UnexpectedError } from '@/errors/unexpected-errors'

/**
 * Converts any caught value into a {@link DomainError}, so only our own error types leave a service.
 *
 * @param error - Any caught value
 * @returns `error` itself if it already is a {@link DomainError}, a {@link RequestAbortedError}
 * for a native `AbortError`, otherwise an {@link UnexpectedError} with `error` as `cause`
 *
 * @example
 * ```ts
 * try {
 *   return await productPort.getProduct(id, opts)
 * } catch (error) {
 *   throw toDomainError(error)
 * }
 * ```
 */
export function toDomainError(error: unknown): DomainError {
  if (isDomainError(error)) {
    return error
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return new RequestAbortedError({ cause: error })
  }
  return new UnexpectedError({ cause: error })
}

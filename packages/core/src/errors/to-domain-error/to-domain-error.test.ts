import { describe, expect, it } from 'vitest'
import { toDomainError } from '.'
import { RequestAbortedError, ServerError, UnexpectedError } from '..'

describe('toDomainError', () => {
  it('returns a domain error unchanged', () => {
    const error = new ServerError(503)

    expect(toDomainError(error)).toBe(error)
  })

  it('turns a native AbortError into RequestAbortedError', () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError')

    const error = toDomainError(abortError)

    expect(error).toBeInstanceOf(RequestAbortedError)
    expect(error.cause).toBe(abortError)
  })

  it('wraps any other error in UnexpectedError and keeps it as cause', () => {
    const bug = new TypeError("Cannot read properties of undefined (reading 'id')")

    const error = toDomainError(bug)

    expect(error).toBeInstanceOf(UnexpectedError)
    expect(error.retryable).toBe(false)
    expect(error.cause).toBe(bug)
  })

  it('wraps values that are not errors', () => {
    expect(toDomainError('boom')).toBeInstanceOf(UnexpectedError)
  })
})

import { vi } from 'vitest'

/*
 * Test helpers for mocking `fetch`. Only used by tests, not exported from the package.
 */

/**
 * Creates a `fetch` mock that answers every request with the given body and status.
 *
 * @param body - Response body; objects are sent as JSON, strings as they are
 * @param status - HTTP status, default `200`
 * @param contentType - Content type header, default `application/json`
 * @returns The mock, to inspect the requested URLs
 */
export function respondWith(body: unknown, status = 200, contentType = 'application/json') {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return vi.fn<typeof fetch>(
    async () => new Response(text, { status, headers: { 'Content-Type': contentType } }),
  )
}

/**
 * Creates a `fetch` mock that never answers, but rejects with an `AbortError` once its signal aborts,
 * like the native `fetch` does.
 *
 * @returns The mock
 */
export function hangingFetch() {
  return vi.fn<typeof fetch>(
    (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError')),
        )
      }),
  )
}

/**
 * Returns the URL a `fetch` mock was called with.
 *
 * @param fetchMock - The mock
 * @param call - Index of the call, default `0`
 * @returns The requested URL
 */
export function requestedUrl(fetchMock: ReturnType<typeof respondWith>, call = 0): string {
  return String(fetchMock.mock.calls[call]?.[0])
}

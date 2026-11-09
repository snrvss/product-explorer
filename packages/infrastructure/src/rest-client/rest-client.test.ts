import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  InvalidResponseError,
  NetworkError,
  RequestAbortedError,
  ServerError,
  TimeoutError,
} from '@product-explorer/core'
import { RestClient } from '.'
import { hangingFetch, requestedUrl, respondWith } from '@/rest-client/fake-fetch'

describe('RestClient', () => {
  describe('URL', () => {
    it.each([
      ['/api/de/en/', 'products/PRD-1001'],
      ['/api/de/en', 'products/PRD-1001'],
      ['/api/de/en/', '/products/PRD-1001'],
    ])('joins base "%s" and path "%s" with exactly one slash', async (base, path) => {
      const fetch = respondWith({})

      await new RestClient(base, { fetch }).get(path)

      expect(requestedUrl(fetch)).toBe('/api/de/en/products/PRD-1001')
    })

    it('sends a GET request that accepts JSON', async () => {
      const fetch = respondWith({})

      await new RestClient('/api/', { fetch }).get('x')

      expect(fetch.mock.calls[0]?.[1]).toMatchObject({
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
    })
  })

  describe('responses', () => {
    it('returns status and parsed JSON body', async () => {
      const client = new RestClient('/api/', { fetch: respondWith({ id: 'PRD-1001' }) })

      await expect(client.get('x')).resolves.toEqual({ status: 200, body: { id: 'PRD-1001' } })
    })

    it('returns undefined as body for an empty response', async () => {
      const client = new RestClient('/api/', { fetch: respondWith('', 200, '') })

      await expect(client.get('x')).resolves.toEqual({ status: 200, body: undefined })
    })

    it.each([400, 404])(
      'returns a %i response with its status instead of throwing',
      async (status) => {
        const client = new RestClient('/api/', {
          fetch: respondWith({ status, title: 'Bad Request' }, status),
        })

        await expect(client.get('x')).resolves.toMatchObject({ status })
      },
    )

    it('ignores a non-JSON body on a 4xx response', async () => {
      const client = new RestClient('/api/', {
        fetch: respondWith('<html>Not Found</html>', 404, 'text/html'),
      })

      await expect(client.get('x')).resolves.toEqual({ status: 404, body: undefined })
    })

    it('throws InvalidResponseError for a 2xx response that is not JSON', async () => {
      const client = new RestClient('/api/', {
        fetch: respondWith('<html></html>', 200, 'text/html'),
      })

      await expect(client.get('x')).rejects.toThrow(InvalidResponseError)
    })
  })

  describe('failures', () => {
    it.each([500, 503, 429])('throws ServerError with status %i', async (status) => {
      const client = new RestClient('/api/', {
        fetch: respondWith('<html></html>', status, 'text/html'),
      })

      const error = await client.get('x').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(ServerError)
      expect((error as ServerError).status).toBe(status)
    })

    it('throws NetworkError when fetch rejects without a response, keeping the cause', async () => {
      const cause = new TypeError('Failed to fetch')
      const client = new RestClient('/api/', {
        fetch: vi.fn<typeof fetch>().mockRejectedValue(cause),
      })

      const error = await client.get('x').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(NetworkError)
      expect((error as NetworkError).cause).toBe(cause)
    })
  })

  describe('cancellation and timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('throws RequestAbortedError without a request if the signal is already aborted', async () => {
      const fetch = respondWith({})

      await expect(
        new RestClient('/api/', { fetch }).get('x', { signal: AbortSignal.abort() }),
      ).rejects.toThrow(RequestAbortedError)
      expect(fetch).not.toHaveBeenCalled()
    })

    it('throws RequestAbortedError when the caller aborts while waiting', async () => {
      const controller = new AbortController()
      const result = new RestClient('/api/', { fetch: hangingFetch() }).get('x', {
        signal: controller.signal,
      })

      controller.abort()

      await expect(result).rejects.toThrow(RequestAbortedError)
    })

    it('throws TimeoutError with the configured time when no response arrives', async () => {
      const result = new RestClient('/api/', { fetch: hangingFetch(), timeoutMs: 3000 }).get('x')
      const caught = result.catch((e: unknown) => e)

      await vi.advanceTimersByTimeAsync(3000)

      const error = await caught
      expect(error).toBeInstanceOf(TimeoutError)
      expect((error as TimeoutError).timeoutMs).toBe(3000)
    })

    it('does not time out before the configured time', async () => {
      const onSettled = vi.fn()
      new RestClient('/api/', { fetch: hangingFetch(), timeoutMs: 3000 }).get('x').catch(onSettled)

      await vi.advanceTimersByTimeAsync(2999)

      expect(onSettled).not.toHaveBeenCalled()
    })

    it('reports a caller abort as RequestAbortedError, not as TimeoutError', async () => {
      const controller = new AbortController()
      const result = new RestClient('/api/', { fetch: hangingFetch(), timeoutMs: 3000 })
        .get('x', { signal: controller.signal })
        .catch((e: unknown) => e)

      await vi.advanceTimersByTimeAsync(1000)
      controller.abort()

      expect(await result).toBeInstanceOf(RequestAbortedError)
    })

    it('clears its timer after a response, so a late timeout never fires', async () => {
      const client = new RestClient('/api/', { fetch: respondWith({}), timeoutMs: 3000 })

      await client.get('x')

      expect(vi.getTimerCount()).toBe(0)
    })
  })
})

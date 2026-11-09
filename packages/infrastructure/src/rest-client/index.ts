import {
  InvalidResponseError,
  isDomainError,
  NetworkError,
  RequestAbortedError,
  type RequestOptions,
  ServerError,
  TimeoutError,
} from '@product-explorer/core'

/** Default time a request may take before it fails with {@link TimeoutError}. */
export const DEFAULT_TIMEOUT_MS = 8000

/**
 * Options of the {@link RestClient}.
 */
export interface RestClientOptions {
  /** Time in milliseconds before a request fails with {@link TimeoutError}. Default {@link DEFAULT_TIMEOUT_MS}. */
  timeoutMs?: number
  /** The `fetch` implementation to use. Default: the browser's native `fetch`. Tests pass a mock. */
  fetch?: typeof fetch
}

/**
 * A response the endpoint has to interpret itself.
 *
 * @remarks
 * Only 2xx and 4xx (except 429) responses are returned; everything else is thrown by the client.
 */
export interface RestResponse {
  /** HTTP status code, e.g. `200`, `400` or `404` */
  readonly status: number
  /** Parsed JSON body; `undefined` if the body is empty (or not JSON on a non-2xx response) */
  readonly body: unknown
}

/**
 * Small wrapper around the native `fetch` for GET requests against one base URL.
 *
 * @remarks
 * `fetch` only rejects when the request did not complete, never for an HTTP status like 404 or 500,
 * so the client checks the status itself. Transport failures become core errors; 2xx and 4xx
 * responses are returned with their status, because only the endpoint knows what e.g. a 400 means.
 *
 * @example
 * ```ts
 * const client = new RestClient('/api/de/en/', { timeoutMs: 5000 })
 * const { status, body } = await client.get('products/PRD-1001', { signal })
 * ```
 */
export class RestClient {
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly fetchFn: typeof fetch

  /**
   * @param baseUrl - URL every path is appended to, including country and language,
   * e.g. `/api/de/en/` (goes through the Vite proxy)
   * @param options - Optional {@link RestClientOptions}
   */
  constructor(baseUrl: string, options: RestClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.fetchFn = options.fetch ?? ((input, init) => fetch(input, init))
  }

  /**
   * Sends a GET request and returns status and parsed body.
   *
   * @param path - Path relative to the base URL; parameters must already be encoded
   * @param opts - Optional {@link RequestOptions}
   * @returns The {@link RestResponse} for 2xx and 4xx (except 429) responses
   * @throws {@link RequestAbortedError} - Thrown if `opts.signal` is or gets aborted.
   * @throws {@link TimeoutError} - Thrown if no complete response arrived within the timeout.
   * @throws {@link ServerError} - Thrown for 5xx and 429 responses.
   * @throws {@link NetworkError} - Thrown if the request failed without a response (offline, DNS, CORS).
   * @throws {@link InvalidResponseError} - Thrown if a 2xx response body is not valid JSON.
   */
  async get(path: string, opts: RequestOptions = {}): Promise<RestResponse> {
    const callerSignal = opts.signal
    if (callerSignal?.aborted) {
      throw new RequestAbortedError({ cause: callerSignal.reason })
    }

    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, this.timeoutMs)
    const onCallerAbort = () => controller.abort()
    callerSignal?.addEventListener('abort', onCallerAbort, { once: true })

    try {
      const response = await this.fetchFn(this.url(path), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
      if (response.status >= 500 || response.status === 429) {
        throw new ServerError(response.status)
      }
      const text = await response.text()
      return { status: response.status, body: parseBody(text, response.ok, path) }
    } catch (error) {
      if (isDomainError(error)) {
        throw error
      }
      if (callerSignal?.aborted) {
        throw new RequestAbortedError({ cause: error })
      }
      if (timedOut) {
        throw new TimeoutError(this.timeoutMs, { cause: error })
      }
      throw new NetworkError({ cause: error })
    } finally {
      clearTimeout(timer)
      callerSignal?.removeEventListener('abort', onCallerAbort)
    }
  }

  private url(path: string): string {
    return `${this.baseUrl}/${path.replace(/^\/+/, '')}`
  }
}

/**
 * @throws {@link InvalidResponseError} - Thrown if a successful response is not valid JSON.
 */
function parseBody(text: string, ok: boolean, path: string): unknown {
  if (text.trim() === '') {
    return undefined
  }
  try {
    return JSON.parse(text) as unknown
  } catch (error) {
    if (!ok) {
      return undefined
    }
    throw new InvalidResponseError(`${path}: body is not valid JSON`, { cause: error })
  }
}

import {
  type AccessoryGroup,
  type DomainError,
  InvalidResponseError,
  NetworkError,
  type Product,
  type ProductId,
  type ProductPort,
  type ProductSummary,
  type ProductVariant,
  RequestAbortedError,
  type RequestOptions,
  ServerError,
  TimeoutError,
} from '@product-explorer/core'

/*
 * Demo mode: slow and failing requests on demand, to show every loading and error state without
 * waiting for a real API to misbehave. Wraps whichever adapter the app uses (mock or http).
 *
 * Only in development (`npm run dev`) and only with `?demo` in the URL, e.g.
 *   /de/en/product/PRD-1001?demo&delay=2000                         every request takes 2 s (loading states)
 *   /de/en/product/PRD-1001?demo&delay=forever                      requests never answer
 *   /de/en/product/PRD-1001?demo&fail=PRD-1302=timeout              one accessory card fails (Try again)
 *   /de/en/product/PRD-1001?demo&fail=accessories:PRD-1001=server   only the accessory list fails
 *   /de/en/product/PRD-1001?demo&fail=PRD-1001=network              product and its lists fail
 *   /de/en/product/PRD-1001?demo&fail=category:inductive-sensors=timeout  the category list fails
 *   /de/en/product/PRD-1001?demo&image=PRD-1001=broken              the photo file fails to load
 *   /de/en/product/PRD-1001?demo&image=PRD-1301=none,PRD-1302=broken  cards without / with a failing photo
 * Several entries are separated by commas. "Try again" keeps failing while the URL says so.
 */

/** Kinds of failure a request can be told to produce. */
export type DemoFailureKind = 'timeout' | 'server' | 'network' | 'invalid'

/** Requests a failure can be limited to: `accessories:PRD-1001=server`. */
export type DemoOperation = 'product' | 'accessories' | 'category' | 'variants'

/** What can be wrong with a product's photo: missing in the data, or failing to load. */
export type DemoImageKind = 'none' | 'broken'

/** How the demo mode behaves, read from the URL by {@link readDemoSettings}. */
export interface DemoSettings {
  /** Extra delay of every request in milliseconds */
  readonly delayMs: number
  /**
   * Failures by target: an id (`PRD-1302`, every request for it) or an operation and an id
   * (`accessories:PRD-1001`, only that request).
   */
  readonly failures: Readonly<Record<string, DemoFailureKind>>
  /** Photo problems by product id: `none` (no image in the data) or `broken` (file fails to load) */
  readonly images: Readonly<Record<string, DemoImageKind>>
}

/** `delay=forever`: the longest timer the browser allows, about 24 days. */
export const FOREVER_MS = 2_147_483_647

/** An image URL the browser cannot decode, so the `<img>` fires its `error` event. */
export const BROKEN_IMAGE_URL = 'data:image/png;base64,broken'

const FAILURE_KINDS: readonly string[] = ['timeout', 'server', 'network', 'invalid']
const IMAGE_KINDS: readonly string[] = ['none', 'broken']

/** Reads `target=kind` pairs separated by commas, keeping only the allowed kinds. */
function readPairs<Kind extends string>(
  value: string | null,
  allowed: readonly string[],
): Record<string, Kind> {
  const pairs: Record<string, Kind> = {}
  for (const entry of (value ?? '').split(',')) {
    const [target, kind] = entry.split('=').map((part) => part.trim())
    if (target && kind && allowed.includes(kind)) {
      pairs[target] = kind as Kind
    }
  }
  return pairs
}

/**
 * Reads the demo settings from the query string of the page URL.
 *
 * @param search - The query string, e.g. `window.location.search`
 * @returns The settings, or `null` if the URL does not ask for demo mode (`?demo` missing)
 */
export function readDemoSettings(search: string): DemoSettings | null {
  const params = new URLSearchParams(search)
  if (!params.has('demo')) {
    return null
  }

  const delay = params.get('delay')
  const delayMs = delay === 'forever' ? FOREVER_MS : Math.max(0, Number(delay) || 0)

  return {
    delayMs,
    failures: readPairs<DemoFailureKind>(params.get('fail'), FAILURE_KINDS),
    images: readPairs<DemoImageKind>(params.get('image'), IMAGE_KINDS),
  }
}

/**
 * Wraps an adapter so it is slowed down and fails as `settings` say.
 *
 * @param inner - The adapter the app would use without demo mode
 * @param settings - From {@link readDemoSettings}
 * @returns An adapter that behaves like `inner`, plus the requested delay, failures and photo problems
 */
export function createDemoAdapter(inner: ProductPort, settings: DemoSettings): ProductPort {
  return new DemoAdapter(inner, settings)
}

/**
 * Waits the demo delay (cancellable), asks the wrapped adapter, then fails or changes the photo
 * if asked, so a failure arrives as late as a real one would.
 */
class DemoAdapter implements ProductPort {
  constructor(
    private readonly inner: ProductPort,
    private readonly settings: DemoSettings,
  ) {}

  async getProduct(id: ProductId, opts?: RequestOptions): Promise<Product | null> {
    await this.wait(opts?.signal)
    const result = await this.inner.getProduct(id, opts)
    this.failIfAsked('product', id)
    return result && this.withImageProblem(result)
  }

  async getAccessoryGroups(id: ProductId, opts?: RequestOptions): Promise<AccessoryGroup[] | null> {
    await this.wait(opts?.signal)
    const result = await this.inner.getAccessoryGroups(id, opts)
    this.failIfAsked('accessories', id)
    return result
  }

  async getCategoryProducts(categoryId: string, opts?: RequestOptions): Promise<ProductSummary[]> {
    await this.wait(opts?.signal)
    const result = await this.inner.getCategoryProducts(categoryId, opts)
    this.failIfAsked('category', categoryId)
    return result
  }

  async getVariants(id: ProductId, opts?: RequestOptions): Promise<ProductVariant[]> {
    await this.wait(opts?.signal)
    const result = await this.inner.getVariants(id, opts)
    this.failIfAsked('variants', id)
    return result
  }

  /** Removes the photo (`none`) or points every size to an undecodable file (`broken`). */
  private withImageProblem(product: Product): Product {
    switch (this.settings.images[product.id]) {
      case 'none':
        return { ...product, image: null }
      case 'broken':
        return {
          ...product,
          image: {
            sizes: {
              140: BROKEN_IMAGE_URL,
              200: BROKEN_IMAGE_URL,
              300: BROKEN_IMAGE_URL,
              400: BROKEN_IMAGE_URL,
            },
          },
        }
      default:
        return product
    }
  }

  private failIfAsked(operation: DemoOperation, id: string): void {
    const kind = this.settings.failures[`${operation}:${id}`] ?? this.settings.failures[id]
    if (kind) {
      throw failureFor(kind)
    }
  }

  /** Resolves after the demo delay; rejects with {@link RequestAbortedError} when cancelled. */
  private wait(signal?: AbortSignal): Promise<void> {
    const { delayMs } = this.settings
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new RequestAbortedError())
        return
      }
      if (delayMs === 0) {
        resolve()
        return
      }
      const onAbort = () => {
        clearTimeout(timer)
        reject(new RequestAbortedError())
      }
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort)
        resolve()
      }, delayMs)
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  }
}

/** The domain error a real adapter would throw for this kind of failure. */
function failureFor(kind: DemoFailureKind): DomainError {
  switch (kind) {
    case 'timeout':
      return new TimeoutError(8000)
    case 'server':
      return new ServerError(503)
    case 'network':
      return new NetworkError()
    case 'invalid':
      return new InvalidResponseError('fake invalid response (demo mode)')
  }
}

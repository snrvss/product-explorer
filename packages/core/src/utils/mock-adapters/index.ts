import type { AccessoryGroup, Product } from '@/entities'
import { type DomainError, RequestAbortedError } from '@/errors'
import type { ProductId } from '@/fields'
import type { ProductSummary, ProductVariant } from '@/models'
import type { ProductPort, RequestOptions } from '@/ports'
import {
  fakeAccessoryGroups,
  fakeCategoryProducts,
  fakeProducts,
  fakeVariants,
} from '@/utils/mock-adapters/fake-data'

export * from '@/utils/mock-adapters/fake-data'

/**
 * Options of the {@link MockProductAdapter}.
 */
export interface MockProductAdapterOptions {
  /** Artificial latency per call in milliseconds, to simulate a slow API. Default `0`. */
  delayMs?: number
  /**
   * Errors to throw instead of returning data, keyed by product id or category id.
   * Example: `{ 'ACC-0002': new TimeoutError(8000) }` makes every call for ACC-0002 fail.
   */
  errors?: Readonly<Record<string, DomainError>>
  /** Replaces the default fake products, keyed by id */
  products?: Readonly<Record<string, Product>>
  /** Replaces the default fake accessory groups, keyed by product id */
  accessoryGroups?: Readonly<Record<string, readonly AccessoryGroup[]>>
  /** Replaces the default fake category lists, keyed by category id */
  categoryProducts?: Readonly<Record<string, readonly ProductSummary[]>>
  /** Replaces the default fake variant lists, keyed by product id */
  variants?: Readonly<Record<string, readonly ProductVariant[]>>
}

/**
 * In-memory implementation of {@link ProductPort} with fake data. Makes no requests.
 *
 * @remarks
 * Behaves like a real adapter: unknown ids return `null`, unknown categories and unknown variant
 * ids an empty list, and an aborted signal rejects with {@link RequestAbortedError}
 * (also while waiting for `delayMs`).
 * Meant for tests and for demoing slow or failing requests.
 *
 * @example
 * ```ts
 * const adapter = new MockProductAdapter({ delayMs: 500, errors: { 'ACC-0002': new ServerError(503) } })
 * await adapter.getProduct(tryToProductId('MAN-0001')) // MAIN_PRODUCT after 500 ms
 * ```
 */
export class MockProductAdapter implements ProductPort {
  private readonly delayMs: number
  private readonly errors: Readonly<Record<string, DomainError>>
  private readonly products: Readonly<Record<string, Product>>
  private readonly accessoryGroups: Readonly<Record<string, readonly AccessoryGroup[]>>
  private readonly categoryProducts: Readonly<Record<string, readonly ProductSummary[]>>
  private readonly variants: Readonly<Record<string, readonly ProductVariant[]>>

  /**
   * @param options - Optional {@link MockProductAdapterOptions}
   */
  constructor(options: MockProductAdapterOptions = {}) {
    this.delayMs = options.delayMs ?? 0
    this.errors = options.errors ?? {}
    this.products = options.products ?? fakeProducts
    this.accessoryGroups = options.accessoryGroups ?? fakeAccessoryGroups
    this.categoryProducts = options.categoryProducts ?? fakeCategoryProducts
    this.variants = options.variants ?? fakeVariants
  }

  async getProduct(id: ProductId, opts?: RequestOptions): Promise<Product | null> {
    await this.respond(id, opts)
    return this.products[id] ?? null
  }

  async getAccessoryGroups(id: ProductId, opts?: RequestOptions): Promise<AccessoryGroup[] | null> {
    await this.respond(id, opts)
    if (!this.products[id]) {
      return null
    }
    return [...(this.accessoryGroups[id] ?? [])]
  }

  async getCategoryProducts(categoryId: string, opts?: RequestOptions): Promise<ProductSummary[]> {
    await this.respond(categoryId, opts)
    return [...(this.categoryProducts[categoryId] ?? [])]
  }

  async getVariants(id: ProductId, opts?: RequestOptions): Promise<ProductVariant[]> {
    await this.respond(id, opts)
    return [...(this.variants[id] ?? [])]
  }

  /**
   * Waits `delayMs`, then throws the configured error for `key`, if any.
   *
   * @param key - Product id or category id
   * @param opts - Optional {@link RequestOptions}
   * @throws {@link RequestAbortedError} - Thrown if `opts.signal` is or gets aborted.
   * @throws {@link DomainError} - Thrown if an error is configured for `key`.
   */
  private async respond(key: string, opts?: RequestOptions): Promise<void> {
    await this.wait(opts?.signal)
    const error = this.errors[key]
    if (error) {
      throw error
    }
  }

  /**
   * Resolves after `delayMs`.
   *
   * @param signal - Optional abort signal
   * @throws {@link RequestAbortedError} - Thrown if `signal` is or gets aborted.
   */
  private wait(signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new RequestAbortedError())
        return
      }
      const onAbort = () => {
        clearTimeout(timer)
        reject(new RequestAbortedError())
      }
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort)
        resolve()
      }, this.delayMs)
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  }
}

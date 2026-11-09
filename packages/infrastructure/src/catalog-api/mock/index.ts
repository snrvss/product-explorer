import {
  type AccessoryGroup,
  type Product,
  type ProductId,
  type ProductPort,
  type ProductSummary,
  type ProductVariant,
  RequestAbortedError,
  type RequestOptions,
} from '@product-explorer/core'
import { convertProduct, readProduct } from '@/catalog-api/products/product/convert'
import {
  convertAccessories,
  readAccessories,
} from '@/catalog-api/products/accessory-groups/convert'
import {
  convertCategoryProducts,
  readCategoryProducts,
} from '@/catalog-api/products/category-products/convert'
import { convertVariants, readVariants } from '@/catalog-api/products/variants/convert'
import products from './mock-data/products.json'
import accessories from './mock-data/accessories.json'
import categoryProducts from './mock-data/category-products.json'
import variants from './mock-data/variants.json'

/**
 * Response bodies of the catalog API, keyed like the request they answer.
 *
 * @remarks
 * The values stay `unknown`: like an HTTP response, they only become core models after
 * `readX` (runtime check) and `convertX` (mapping). A broken entry fails with
 * {@link InvalidResponseError}, exactly as a broken API response would.
 */
export interface MockCatalogData {
  /** Bodies of `GET products/{id}`, keyed by product id */
  readonly products: Readonly<Record<string, unknown>>
  /** Bodies of `GET products/{id}/accessories`, keyed by product id */
  readonly accessories: Readonly<Record<string, unknown>>
  /** Bodies of `GET categories/{id}/products`, keyed by category id */
  readonly categoryProducts: Readonly<Record<string, unknown>>
  /** Bodies of `GET products/{id}/variants`, keyed by product id; missing means "no variants" */
  readonly variants: Readonly<Record<string, unknown>>
}

/**
 * The fictional product catalog in `mock-data/*.json`: 30 products in 5 categories, accessories
 * linking sensors to cables and mounting parts, and variant families (cable lengths, measuring
 * ranges).
 */
export const MOCK_CATALOG: MockCatalogData = { products, accessories, categoryProducts, variants }

/**
 * Options of the {@link MockCatalogAdapter}.
 */
export interface MockCatalogAdapterOptions {
  /** Artificial latency per call in milliseconds, so loading states are visible. Default `0`. */
  delayMs?: number
  /** Replaces the default {@link MOCK_CATALOG}, e.g. with broken data in tests */
  data?: MockCatalogData
}

/**
 * {@link ProductPort} implementation on local JSON files instead of an HTTP API.
 *
 * @remarks
 * The default adapter of the app (`VITE_CATALOG_ADAPTER=mock`). It behaves like
 * {@link HttpCatalogAdapter}: the same response format, the same `readX`/`convertX` steps, the
 * same "not found" results (`null` for an unknown product, `[]` for unknown categories and
 * variants), and an aborted signal rejects with {@link RequestAbortedError}, also while waiting
 * for `delayMs`.
 *
 * @example
 * ```ts
 * const services = createServices(new MockCatalogAdapter({ delayMs: 300 }))
 * await services.getProduct('PRD-1001')
 * ```
 */
export class MockCatalogAdapter implements ProductPort {
  private readonly delayMs: number
  private readonly data: MockCatalogData

  /**
   * @param options - Optional {@link MockCatalogAdapterOptions}
   */
  constructor(options: MockCatalogAdapterOptions = {}) {
    this.delayMs = options.delayMs ?? 0
    this.data = options.data ?? MOCK_CATALOG
  }

  /** {@inheritDoc ProductPort.getProduct} */
  async getProduct(id: ProductId, opts?: RequestOptions): Promise<Product | null> {
    await this.wait(opts?.signal)
    const body = lookup(this.data.products, id)
    return body === undefined ? null : convertProduct(readProduct(body))
  }

  /** {@inheritDoc ProductPort.getAccessoryGroups} */
  async getAccessoryGroups(id: ProductId, opts?: RequestOptions): Promise<AccessoryGroup[] | null> {
    await this.wait(opts?.signal)
    if (lookup(this.data.products, id) === undefined) {
      return null
    }
    const body = lookup(this.data.accessories, id) ?? { groups: [] }
    return convertAccessories(readAccessories(body))
  }

  /** {@inheritDoc ProductPort.getCategoryProducts} */
  async getCategoryProducts(categoryId: string, opts?: RequestOptions): Promise<ProductSummary[]> {
    await this.wait(opts?.signal)
    const body = lookup(this.data.categoryProducts, categoryId)
    return body === undefined ? [] : convertCategoryProducts(readCategoryProducts(body))
  }

  /** {@inheritDoc ProductPort.getVariants} */
  async getVariants(id: ProductId, opts?: RequestOptions): Promise<ProductVariant[]> {
    await this.wait(opts?.signal)
    const body = lookup(this.data.variants, id)
    return body === undefined ? [] : convertVariants(readVariants(body))
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

/** Own entries only, so keys like `constructor` don't find `Object.prototype` members. */
function lookup(entries: Readonly<Record<string, unknown>>, key: string): unknown {
  return Object.hasOwn(entries, key) ? entries[key] : undefined
}

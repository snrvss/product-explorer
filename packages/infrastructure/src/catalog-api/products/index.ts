import type {
  AccessoryGroup,
  Product,
  ProductId,
  ProductPort,
  ProductSummary,
  ProductVariant,
  RequestOptions,
} from '@product-explorer/core'
import type { RestClient } from '@/rest-client'
import { fetchAccessoryGroups } from '@/catalog-api/products/accessory-groups'
import { fetchCategoryProducts } from '@/catalog-api/products/category-products'
import { fetchProduct } from '@/catalog-api/products/product'
import { fetchVariants } from '@/catalog-api/products/variants'

/**
 * {@link ProductPort} implementation against a catalog REST API over HTTP.
 *
 * @remarks
 * Each method delegates to its operation (`product`, `accessory-groups`, …), which sends the
 * request through the injected {@link RestClient}, checks the payload and maps it to core models.
 * Country and language come from the client's base URL. Id validation and "not found" errors stay
 * in the core services; this adapter only returns `null` / `[]` as the port defines.
 *
 * @example
 * ```ts
 * const client = new RestClient('/api/de/en/')
 * const adapter = new HttpCatalogAdapter(client)
 * const services = createServices(adapter)
 * ```
 */
export class HttpCatalogAdapter implements ProductPort {
  /**
   * @param client - The {@link RestClient} configured with the catalog API base URL for one locale
   */
  constructor(private readonly client: RestClient) {}

  /** {@inheritDoc ProductPort.getProduct} */
  getProduct(id: ProductId, opts?: RequestOptions): Promise<Product | null> {
    return fetchProduct(this.client, id, opts)
  }

  /** {@inheritDoc ProductPort.getAccessoryGroups} */
  getAccessoryGroups(id: ProductId, opts?: RequestOptions): Promise<AccessoryGroup[] | null> {
    return fetchAccessoryGroups(this.client, id, opts)
  }

  /** {@inheritDoc ProductPort.getCategoryProducts} */
  getCategoryProducts(categoryId: string, opts?: RequestOptions): Promise<ProductSummary[]> {
    return fetchCategoryProducts(this.client, categoryId, opts)
  }

  /** {@inheritDoc ProductPort.getVariants} */
  getVariants(id: ProductId, opts?: RequestOptions): Promise<ProductVariant[]> {
    return fetchVariants(this.client, id, opts)
  }
}

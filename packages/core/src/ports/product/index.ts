import type { AccessoryGroup, Product } from '@/entities'
import type { ProductId } from '@/fields'
import type { ProductSummary, ProductVariant } from '@/models'

/**
 * Options every {@link ProductPort} call accepts.
 */
export interface RequestOptions {
  /**
   * Aborting it makes the call reject with {@link RequestAbortedError}.
   */
  signal?: AbortSignal
}

/**
 * Read access to the product catalog.
 *
 * @remarks
 * Implemented in the infrastructure layer. "Nothing found" is a normal result (`null` or an
 * empty list), not an error: the services decide which {@link DomainError} that becomes.
 * The port only throws what the services can't detect themselves: transport failures
 * ({@link NetworkError}, {@link TimeoutError}, {@link ServerError}, all retryable),
 * {@link InvalidResponseError} and {@link RequestAbortedError}.
 */
export interface ProductPort {
  /**
   * Fetches the full details of one product.
   *
   * @param id - The product to fetch
   * @param opts - Optional {@link RequestOptions}
   * @returns The product, or `null` if no product with this id exists
   * @throws {@link NetworkError} - Thrown if the server could not be reached.
   * @throws {@link TimeoutError} - Thrown if no response arrived in time.
   * @throws {@link ServerError} - Thrown for 5xx and 429 responses.
   * @throws {@link InvalidResponseError} - Thrown if the payload could not be mapped to a {@link Product}.
   * @throws {@link RequestAbortedError} - Thrown if `opts.signal` was aborted.
   */
  getProduct(id: ProductId, opts?: RequestOptions): Promise<Product | null>

  /**
   * Fetches the accessory groups of a product.
   *
   * @remarks
   * The API only returns ids, no details. Each id needs its own {@link ProductPort.getProduct} call.
   *
   * @param id - The product whose accessories to fetch
   * @param opts - Optional {@link RequestOptions}
   * @returns The groups, an empty array if the product has no accessories, or `null` if no product with this id exists
   * @throws {@link NetworkError} - Thrown if the server could not be reached.
   * @throws {@link TimeoutError} - Thrown if no response arrived in time.
   * @throws {@link ServerError} - Thrown for 5xx and 429 responses.
   * @throws {@link InvalidResponseError} - Thrown if the payload could not be mapped to {@link AccessoryGroup}s.
   * @throws {@link RequestAbortedError} - Thrown if `opts.signal` was aborted.
   */
  getAccessoryGroups(id: ProductId, opts?: RequestOptions): Promise<AccessoryGroup[] | null>

  /**
   * Fetches the products of a category.
   *
   * @remarks
   * Lightweight records without images, see {@link ProductSummary}.
   *
   * @param categoryId - The category id, e.g. `inductive-sensors` (from {@link Product.categoryId})
   * @param opts - Optional {@link RequestOptions}
   * @returns The products in API order, or an empty array if the category is empty or unknown
   * @throws {@link NetworkError} - Thrown if the server could not be reached.
   * @throws {@link TimeoutError} - Thrown if no response arrived in time.
   * @throws {@link ServerError} - Thrown for 5xx and 429 responses.
   * @throws {@link InvalidResponseError} - Thrown if the payload could not be mapped to {@link ProductSummary}s.
   * @throws {@link RequestAbortedError} - Thrown if `opts.signal` was aborted.
   */
  getCategoryProducts(categoryId: string, opts?: RequestOptions): Promise<ProductSummary[]>

  /**
   * Fetches the variants of a product, e.g. the same cable in other lengths.
   *
   * @remarks
   * The list contains the requested product itself. The API answers unknown ids with an empty
   * list as well, so `[]` means "no variants" and can't be told apart from "unknown product".
   *
   * @param id - The product whose variants to fetch
   * @param opts - Optional {@link RequestOptions}
   * @returns The variants in API order (by cable length), or an empty array
   * @throws {@link NetworkError} - Thrown if the server could not be reached.
   * @throws {@link TimeoutError} - Thrown if no response arrived in time.
   * @throws {@link ServerError} - Thrown for 5xx and 429 responses.
   * @throws {@link InvalidResponseError} - Thrown if the payload could not be mapped to {@link ProductVariant}s.
   * @throws {@link RequestAbortedError} - Thrown if `opts.signal` was aborted.
   */
  getVariants(id: ProductId, opts?: RequestOptions): Promise<ProductVariant[]>
}

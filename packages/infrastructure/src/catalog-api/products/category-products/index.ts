import type { ProductSummary, RequestOptions } from '@product-explorer/core'
import type { RestClient } from '@/rest-client'
import { isNotFound } from '@/catalog-api/products/convert'
import { productEndpoints } from '@/catalog-api/products/endpoints'
import {
  convertCategoryProducts,
  readCategoryProducts,
  RESPONSE_PATH,
} from '@/catalog-api/products/category-products/convert'

/**
 * Loads the products of a category from `GET categories/{categoryId}/products`.
 *
 * @param client - The {@link RestClient} to send the request with
 * @param categoryId - The category id, e.g. `inductive-sensors`
 * @param opts - Optional {@link RequestOptions}
 * @returns The products in API order, or `[]` for an unknown category (404, 400 or empty body)
 * @throws {@link InvalidResponseError} - Thrown if the payload is malformed or the status is unexpected.
 * @throws {@link ServerError} - Thrown for 5xx and 429 responses.
 * @throws {@link NetworkError} - Thrown if the server could not be reached.
 * @throws {@link TimeoutError} - Thrown if no response arrived in time.
 * @throws {@link RequestAbortedError} - Thrown if `opts.signal` was aborted.
 */
export async function fetchCategoryProducts(
  client: RestClient,
  categoryId: string,
  opts?: RequestOptions,
): Promise<ProductSummary[]> {
  const response = await client.get(productEndpoints.categoryProducts(categoryId), opts)
  if (isNotFound(response, RESPONSE_PATH)) {
    return []
  }
  return convertCategoryProducts(readCategoryProducts(response.body))
}

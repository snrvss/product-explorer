import type { ProductId, ProductVariant, RequestOptions } from '@product-explorer/core'
import type { RestClient } from '@/rest-client'
import { isNotFound } from '@/catalog-api/products/convert'
import { productEndpoints } from '@/catalog-api/products/endpoints'
import {
  convertVariants,
  readVariants,
  RESPONSE_PATH,
} from '@/catalog-api/products/variants/convert'

/**
 * Loads the variants of a product from `GET products/{productId}/variants`.
 *
 * @remarks
 * The port does not tell "no variants" and "unknown product" apart, so both become `[]`.
 *
 * @param client - The {@link RestClient} to send the request with
 * @param id - The product whose variants to load
 * @param opts - Optional {@link RequestOptions}
 * @returns The variants including the product itself, or `[]` (also for 404, 400 or empty body)
 * @throws {@link InvalidResponseError} - Thrown if the payload is malformed or the status is unexpected.
 * @throws {@link ServerError} - Thrown for 5xx and 429 responses.
 * @throws {@link NetworkError} - Thrown if the server could not be reached.
 * @throws {@link TimeoutError} - Thrown if no response arrived in time.
 * @throws {@link RequestAbortedError} - Thrown if `opts.signal` was aborted.
 */
export async function fetchVariants(
  client: RestClient,
  id: ProductId,
  opts?: RequestOptions,
): Promise<ProductVariant[]> {
  const response = await client.get(productEndpoints.variants(id), opts)
  if (isNotFound(response, RESPONSE_PATH)) {
    return []
  }
  return convertVariants(readVariants(response.body))
}

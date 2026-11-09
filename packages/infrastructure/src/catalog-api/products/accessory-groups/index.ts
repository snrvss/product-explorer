import type { AccessoryGroup, ProductId, RequestOptions } from '@product-explorer/core'
import type { RestClient } from '@/rest-client'
import { isNotFound } from '@/catalog-api/products/convert'
import { productEndpoints } from '@/catalog-api/products/endpoints'
import {
  convertAccessories,
  readAccessories,
  RESPONSE_PATH,
} from '@/catalog-api/products/accessory-groups/convert'

/**
 * Loads the accessory groups of a product from `GET products/{productId}/accessories`.
 *
 * @remarks
 * A product without accessories answers `groups: []`, which is returned as `[]`, never as `null`.
 * `null` is returned for an unknown product (404, 400 or empty body).
 *
 * @param client - The {@link RestClient} to send the request with
 * @param id - The product whose accessories to load
 * @param opts - Optional {@link RequestOptions}
 * @returns The groups, `[]` if the product has no accessories, or `null` for a "not found" response
 * @throws {@link InvalidResponseError} - Thrown if the payload is malformed or the status is unexpected.
 * @throws {@link ServerError} - Thrown for 5xx and 429 responses.
 * @throws {@link NetworkError} - Thrown if the server could not be reached.
 * @throws {@link TimeoutError} - Thrown if no response arrived in time.
 * @throws {@link RequestAbortedError} - Thrown if `opts.signal` was aborted.
 */
export async function fetchAccessoryGroups(
  client: RestClient,
  id: ProductId,
  opts?: RequestOptions,
): Promise<AccessoryGroup[] | null> {
  const response = await client.get(productEndpoints.accessories(id), opts)
  if (isNotFound(response, RESPONSE_PATH)) {
    return null
  }
  return convertAccessories(readAccessories(response.body))
}

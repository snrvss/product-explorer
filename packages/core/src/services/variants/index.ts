import { toDomainError } from '@/errors'
import { tryToProductId } from '@/fields'
import type { ProductVariant } from '@/models'
import type { ProductPort, RequestOptions } from '@/ports'

/**
 * Loads the variants of a product, e.g. the same cable in other lengths.
 *
 * @remarks
 * Validates the id with `tryToProductId` and calls {@link ProductPort.getVariants}. An invalid id
 * never causes a request. An empty list is a valid result, not an error: the API answers unknown
 * ids with `[]` too, so a not-found error can't be detected here.
 * Every error of the port is converted with `toDomainError`, so only domain errors leave this service.
 */
export class VariantsService {
  /**
   * @param productPort - The adapter that implements {@link ProductPort}
   */
  constructor(private readonly productPort: ProductPort) {}

  /**
   * @param rawId - The product whose variants to load
   * @param opts - Optional {@link RequestOptions}
   * @returns The variants including the product itself, or an empty array if there are none
   * @throws {@link InvalidProductIdError} - Thrown if `rawId` is not a valid product id. The port is not called.
   * @throws {@link NetworkError} - Thrown if the server could not be reached.
   * @throws {@link TimeoutError} - Thrown if no response arrived in time.
   * @throws {@link ServerError} - Thrown for 5xx and 429 responses.
   * @throws {@link InvalidResponseError} - Thrown if the payload could not be mapped.
   * @throws {@link RequestAbortedError} - Thrown if `opts.signal` was aborted.
   * @throws {@link UnexpectedError} - Thrown if the port failed with an error that is not a domain error.
   */
  async getVariants(rawId: string, opts?: RequestOptions): Promise<ProductVariant[]> {
    const id = tryToProductId(rawId)

    try {
      return await this.productPort.getVariants(id, opts)
    } catch (error) {
      throw toDomainError(error)
    }
  }
}

import type { AccessoryGroup } from '@/entities'
import { ProductNotFoundError, toDomainError } from '@/errors'
import { tryToProductId } from '@/fields'
import type { ProductPort, RequestOptions } from '@/ports'

/**
 * Loads the accessory groups of a product (ids only, no details).
 *
 * @remarks
 * Validates the id with `tryToProductId`, calls {@link ProductPort.getAccessoryGroups} and throws
 * {@link ProductNotFoundError} if the port does not know the product. An invalid id never causes a request.
 * Every error of the port is converted with `toDomainError`, so only domain errors leave this service.
 */
export class AccessoryGroupsService {
  /**
   * @param productPort - The adapter that implements {@link ProductPort}
   */
  constructor(private readonly productPort: ProductPort) {}

  /**
   * @param rawId - The product whose accessories to load
   * @param opts - Optional {@link RequestOptions}
   * @returns The groups, or an empty array if the product has no accessories
   * @throws {@link InvalidProductIdError} - Thrown if `rawId` is not a valid product id. The port is not called.
   * @throws {@link ProductNotFoundError} - Thrown if no product with this id exists.
   * @throws {@link NetworkError} - Thrown if the server could not be reached.
   * @throws {@link TimeoutError} - Thrown if no response arrived in time.
   * @throws {@link ServerError} - Thrown for 5xx and 429 responses.
   * @throws {@link InvalidResponseError} - Thrown if the payload could not be mapped.
   * @throws {@link RequestAbortedError} - Thrown if `opts.signal` was aborted.
   * @throws {@link UnexpectedError} - Thrown if the port failed with an error that is not a domain error.
   */
  async getAccessoryGroups(rawId: string, opts?: RequestOptions): Promise<AccessoryGroup[]> {
    const id = tryToProductId(rawId)

    let groups: AccessoryGroup[] | null
    try {
      groups = await this.productPort.getAccessoryGroups(id, opts)
    } catch (error) {
      throw toDomainError(error)
    }

    if (!groups) {
      throw new ProductNotFoundError(id)
    }
    return groups
  }
}

import type { Product } from '@/entities'
import { ProductNotFoundError, toDomainError } from '@/errors'
import { tryToProductId } from '@/fields'
import type { ProductPort, RequestOptions } from '@/ports'

/**
 * Loads the full details of one product.
 *
 * @remarks
 * Validates the id with `tryToProductId`, calls {@link ProductPort.getProduct} and throws
 * {@link ProductNotFoundError} if the port finds nothing. An invalid id never causes a request.
 * Every error of the port is converted with `toDomainError`, so only domain errors leave this service.
 */
export class ProductService {
  /**
   * @param productPort - The adapter that implements {@link ProductPort}
   */
  constructor(private readonly productPort: ProductPort) {}

  /**
   * @param rawId - The product id, e.g. from the URL (`"prd-1001"` is accepted)
   * @param opts - Optional {@link RequestOptions}
   * @returns The product
   * @throws {@link InvalidProductIdError} - Thrown if `rawId` is not a valid product id. The port is not called.
   * @throws {@link ProductNotFoundError} - Thrown if no product with this id exists.
   * @throws {@link NetworkError} - Thrown if the server could not be reached.
   * @throws {@link TimeoutError} - Thrown if no response arrived in time.
   * @throws {@link ServerError} - Thrown for 5xx and 429 responses.
   * @throws {@link InvalidResponseError} - Thrown if the payload could not be mapped.
   * @throws {@link RequestAbortedError} - Thrown if `opts.signal` was aborted.
   * @throws {@link UnexpectedError} - Thrown if the port failed with an error that is not a domain error.
   */
  async getProduct(rawId: string, opts?: RequestOptions): Promise<Product> {
    const id = tryToProductId(rawId)

    let product: Product | null
    try {
      product = await this.productPort.getProduct(id, opts)
    } catch (error) {
      throw toDomainError(error)
    }

    if (!product) {
      throw new ProductNotFoundError(id)
    }
    return product
  }
}

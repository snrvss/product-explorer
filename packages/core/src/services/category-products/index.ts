import { CategoryNotFoundError, toDomainError } from '@/errors'
import type { ProductPort, RequestOptions } from '@/ports'
import type { ProductSummary } from '@/models'

/**
 * Loads the products of a category (summaries without images).
 *
 * @remarks
 * Calls {@link ProductPort.getCategoryProducts} and throws {@link CategoryNotFoundError}
 * if the port returns no products. Every error of the port is converted with `toDomainError`,
 * so only domain errors leave this service.
 */
export class CategoryProductsService {
  /**
   * @param productPort - The adapter that implements {@link ProductPort}
   */
  constructor(private readonly productPort: ProductPort) {}

  /**
   * @param categoryId - The category id, usually {@link Product.categoryId}
   * @param opts - Optional {@link RequestOptions}
   * @returns The products in API order, never empty
   * @throws {@link CategoryNotFoundError} - Thrown if the category is empty or unknown.
   * @throws {@link NetworkError} - Thrown if the server could not be reached.
   * @throws {@link TimeoutError} - Thrown if no response arrived in time.
   * @throws {@link ServerError} - Thrown for 5xx and 429 responses.
   * @throws {@link InvalidResponseError} - Thrown if the payload could not be mapped.
   * @throws {@link RequestAbortedError} - Thrown if `opts.signal` was aborted.
   * @throws {@link UnexpectedError} - Thrown if the port failed with an error that is not a domain error.
   */
  async getCategoryProducts(categoryId: string, opts?: RequestOptions): Promise<ProductSummary[]> {
    let products: ProductSummary[]
    try {
      products = await this.productPort.getCategoryProducts(categoryId, opts)
    } catch (error) {
      throw toDomainError(error)
    }

    if (products.length === 0) {
      throw new CategoryNotFoundError(categoryId)
    }
    return products
  }
}

import {
  type DomainError,
  type Product,
  ProductNotFoundError,
  RequestAbortedError,
  type Services,
  toDomainError,
} from '@product-explorer/core'

/** Where loading the details of one product card stands. */
export type ProductCardState =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly product: Product }
  | { readonly status: 'error'; readonly error: DomainError }
  /** The product is listed, but no longer exists. */
  | { readonly status: 'unavailable' }

/** Product cards shown at first and added by each `loadMore()` of a card store. */
export const PAGE_SIZE = 4

/** Detail requests running at the same time, so long lists don't flood the API. */
export const MAX_PARALLEL_REQUESTS = 4

/**
 * Loads the details of product cards, at most {@link MAX_PARALLEL_REQUESTS} at the same time.
 *
 * @remarks
 * Shared by the stores that show product cards (accessories, category products). Each result is
 * reported on its own, as soon as it is there, so slow products never block the others. A product
 * that is not found becomes `unavailable`, any other error `error`. Aborted requests are not
 * reported: the store that cancelled them no longer needs them.
 *
 * @param ids - Product ids to load, in display order
 * @param services - Core services of the current locale
 * @param signal - Cancels every request that has not finished yet
 * @param onResult - Called once per product with its new state
 */
export async function loadProductCards(
  ids: readonly string[],
  services: Services,
  signal: AbortSignal,
  onResult: (productId: string, state: ProductCardState) => void,
): Promise<void> {
  const queue = [...ids]

  const loadOne = async (productId: string): Promise<void> => {
    if (signal.aborted) {
      return // cancelled before this card's turn
    }
    try {
      const product = await services.getProduct(productId, { signal })
      onResult(productId, { status: 'success', product })
    } catch (caught) {
      const error = toDomainError(caught)
      if (error instanceof RequestAbortedError) {
        return
      }
      onResult(
        productId,
        error instanceof ProductNotFoundError
          ? { status: 'unavailable' }
          : { status: 'error', error },
      )
    }
  }

  const worker = async (): Promise<void> => {
    for (let productId = queue.shift(); productId !== undefined; productId = queue.shift()) {
      await loadOne(productId)
    }
  }

  const workerCount = Math.min(MAX_PARALLEL_REQUESTS, queue.length)
  await Promise.all(Array.from({ length: workerCount }, worker))
}

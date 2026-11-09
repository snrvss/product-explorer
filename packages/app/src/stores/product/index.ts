import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  type DomainError,
  type Locale,
  type Product,
  RequestAbortedError,
  TimeoutError,
  toDomainError,
} from '@product-explorer/core'
import { createCatalogServices } from '@/api'

/** Where loading the product stands. */
export type ProductStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Loads and holds the main product of the product page.
 *
 * @remarks
 * - `status`: `idle` → `loading` → `success` (with `product`) or `error` (with `error`).
 * - Timeout: every request has a time limit (`REQUEST_TIMEOUT_MS` in `@/api`). When it runs out,
 *   `error` is a `TimeoutError` and `isTimeout` is `true`; it can be retried.
 * - A new `load()` cancels the request that is still running, so a slow answer for the previous
 *   product can never replace the current one. The cancelled request ends with a
 *   `RequestAbortedError`, which is ignored.
 *
 * Each `load()` gets its services from `createCatalogServices(locale)` (`@/api`), so the request uses
 * the country and language passed in. Tests mock `@/api` with the core mock adapter.
 *
 * @example
 * ```ts
 * const productStore = useProductStore()
 * await productStore.load('PRD-1001', { country: 'de', language: 'en' })
 * productStore.product // the product, or null
 * ```
 */
export const useProductStore = defineStore('product', () => {
  const status = ref<ProductStatus>('idle')
  const product = shallowRef<Product | null>(null)
  const error = shallowRef<DomainError | null>(null)

  /** Arguments of the last `load()`, for `retry()`. */
  let lastRequest: { productId: string; locale: Locale } | null = null
  /** Cancels the running request; `null` when nothing is running. */
  let controller: AbortController | null = null

  const isLoading = computed(() => status.value === 'loading')
  const isTimeout = computed(() => error.value instanceof TimeoutError)

  /**
   * Loads a product. Cancels a request that is still running.
   *
   * @param productId - Product id, e.g. from the URL; it is validated by the core service
   * @param locale - Country and language of the request
   */
  async function load(productId: string, locale: Locale): Promise<void> {
    cancel()
    lastRequest = { productId, locale }
    const ownController = new AbortController()
    controller = ownController

    status.value = 'loading'
    product.value = null
    error.value = null

    try {
      const result = await createCatalogServices(locale).getProduct(productId, {
        signal: ownController.signal,
      })
      if (controller !== ownController) {
        return // a newer load() started meanwhile
      }
      product.value = result
      status.value = 'success'
    } catch (caught) {
      const domainError = toDomainError(caught)
      if (domainError instanceof RequestAbortedError || controller !== ownController) {
        return // cancelled on purpose; the newer request decides the state
      }
      error.value = domainError
      status.value = 'error'
    } finally {
      if (controller === ownController) {
        controller = null
      }
    }
  }

  /** Loads the last product again, e.g. after a timeout. Does nothing before the first load. */
  async function retry(): Promise<void> {
    if (lastRequest) {
      await load(lastRequest.productId, lastRequest.locale)
    }
  }

  /** Cancels the running request, e.g. when the page is left; a load in progress goes back to `idle`. */
  function cancel(): void {
    if (!controller) {
      return
    }
    controller.abort()
    controller = null
    if (status.value === 'loading') {
      status.value = 'idle'
    }
  }

  return { status, product, error, isLoading, isTimeout, load, retry, cancel }
})

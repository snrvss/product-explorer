import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  type DomainError,
  type Locale,
  type ProductSummary,
  RequestAbortedError,
  type Services,
  TimeoutError,
  toDomainError,
} from '@product-explorer/core'
import { createCatalogServices } from '@/api'
import { loadProductCards, PAGE_SIZE, type ProductCardState } from '@/stores/product-cards'

/** Where loading the category list stands. */
export type CategoryProductsStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Loads and holds the other products of the main product's category.
 *
 * @remarks
 * Built like the accessories store, in two steps:
 * 1. `load()` loads the category list (summaries without images) and removes the main product
 *    itself, which the API lists too. `status`: `idle` → `loading` → `success` or `error` (with
 *    `error`).
 * 2. The details (name, image) are loaded per card, page by page ({@link PAGE_SIZE} at a time,
 *    `loadMore()` for the next page), with at most `MAX_PARALLEL_REQUESTS` requests at once
 *    (`@/stores/product-cards`). Each card has its own state in `cards`; `retryCard()` loads one
 *    card again.
 *
 * - Timeout: every request has a time limit (`REQUEST_TIMEOUT_MS` in `@/api`). When it runs out
 *   for the list, `isTimeout` is `true`; a card that times out shows its own error.
 * - A new `load()` cancels everything still running for the previous category, so a slow answer
 *   can never end up on the wrong page. Cancelled requests end with a `RequestAbortedError`,
 *   which is ignored.
 *
 * Each `load()` gets its services from `createCatalogServices(locale)` (`@/api`). Tests mock `@/api`
 * with the core mock adapter.
 *
 * @example
 * ```ts
 * const categoryStore = useCategoryProductsStore()
 * await categoryStore.load(product.categoryId, product.id, { country: 'de', language: 'en' })
 * categoryStore.visibleIds // the first page of other products in the category
 * ```
 */
export const useCategoryProductsStore = defineStore('categoryProducts', () => {
  const status = ref<CategoryProductsStatus>('idle')
  /** The other products of the category, in API order, without the main product. */
  const summaries = shallowRef<readonly ProductSummary[]>([])
  const error = shallowRef<DomainError | null>(null)
  /** State per requested product id; ids not requested yet are missing. */
  const cards = shallowRef<Readonly<Record<string, ProductCardState>>>({})
  /** How many products (in API order) are shown and requested. */
  const visibleCount = ref(0)

  /** Arguments of the last `load()`, for `retry()`. */
  let lastRequest: { categoryId: string; mainProductId: string; locale: Locale } | null = null
  /** Cancels all requests of the current category; `null` when nothing belongs to a category. */
  let controller: AbortController | null = null
  /** Services of the current locale, reused for the card requests. */
  let services: Services | null = null

  const isLoading = computed(() => status.value === 'loading')
  const isTimeout = computed(() => error.value instanceof TimeoutError)

  const productIds = computed(() => summaries.value.map((summary) => summary.id))
  const visibleIds = computed(() => productIds.value.slice(0, visibleCount.value))
  const hasMore = computed(() => visibleCount.value < productIds.value.length)

  /** Numbers for the progress line, e.g. "4 of 7 loaded" (plus "· 1 failed" when cards failed). */
  const stats = computed(() => {
    const requested = visibleIds.value.map((id) => cards.value[id])
    return {
      total: productIds.value.length,
      loaded: requested.filter((card) => card?.status === 'success').length,
      failed: requested.filter((card) => card?.status === 'error').length,
    }
  })

  /**
   * Loads the products of a category without the main product, then the details of the first
   * page. Cancels everything still running for the previous category.
   *
   * @param categoryId - Category of the main product, `Product.categoryId`
   * @param mainProductId - Product id of the main product; left out of the list
   * @param locale - Country and language of the requests
   */
  async function load(categoryId: string, mainProductId: string, locale: Locale): Promise<void> {
    cancel()
    lastRequest = { categoryId, mainProductId, locale }
    const ownController = new AbortController()
    controller = ownController
    services = createCatalogServices(locale)

    status.value = 'loading'
    summaries.value = []
    error.value = null
    cards.value = {}
    visibleCount.value = 0

    try {
      const result = await services.getCategoryProducts(categoryId, {
        signal: ownController.signal,
      })
      if (controller !== ownController) {
        return // a newer load() started meanwhile
      }
      summaries.value = result.filter((summary) => summary.id !== mainProductId)
      status.value = 'success'
    } catch (caught) {
      const domainError = toDomainError(caught)
      if (domainError instanceof RequestAbortedError || controller !== ownController) {
        return // cancelled on purpose; the newer request decides the state
      }
      error.value = domainError
      status.value = 'error'
      return
    }

    await loadMore()
  }

  /** Shows the next {@link PAGE_SIZE} products and loads their details. */
  async function loadMore(): Promise<void> {
    if (status.value !== 'success' || !hasMore.value) {
      return
    }
    const nextIds = productIds.value.slice(visibleCount.value, visibleCount.value + PAGE_SIZE)
    visibleCount.value += nextIds.length
    await loadCards(nextIds)
  }

  /** Loads the details of one card again, e.g. after its timeout. */
  async function retryCard(productId: string): Promise<void> {
    if (status.value === 'success' && visibleIds.value.some((id) => id === productId)) {
      await loadCards([productId])
    }
  }

  /** Loads the last category again. Does nothing before the first load. */
  async function retry(): Promise<void> {
    if (lastRequest) {
      await load(lastRequest.categoryId, lastRequest.mainProductId, lastRequest.locale)
    }
  }

  /** Cancels all running requests, e.g. when the page is left; a load in progress goes back to `idle`. */
  function cancel(): void {
    if (!controller) {
      return
    }
    controller.abort()
    controller = null
    services = null
    if (status.value === 'loading') {
      status.value = 'idle'
    }
  }

  /** Loads the details of `ids`; results of an older category are dropped. */
  async function loadCards(ids: readonly string[]): Promise<void> {
    const ownController = controller
    const ownServices = services
    if (!ownController || !ownServices) {
      return
    }
    setCards(Object.fromEntries(ids.map((id) => [id, { status: 'loading' } as const])))
    await loadProductCards(ids, ownServices, ownController.signal, (id, state) => {
      if (controller === ownController) {
        setCards({ [id]: state })
      }
    })
  }

  /** Replaces the given card states; a new object, so the shallow ref notices. */
  function setCards(changes: Readonly<Record<string, ProductCardState>>): void {
    cards.value = { ...cards.value, ...changes }
  }

  return {
    status,
    summaries,
    error,
    cards,
    isLoading,
    isTimeout,
    productIds,
    visibleIds,
    hasMore,
    stats,
    load,
    loadMore,
    retryCard,
    retry,
    cancel,
  }
})

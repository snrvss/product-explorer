import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  type AccessoryGroup,
  type DomainError,
  type Locale,
  RequestAbortedError,
  type Services,
  TimeoutError,
  toDomainError,
} from '@product-explorer/core'
import { createCatalogServices } from '@/api'
import { loadProductCards, PAGE_SIZE, type ProductCardState } from '@/stores/product-cards'

/** Where loading the accessory groups stands. */
export type AccessoriesStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Loads and holds the accessories of the main product.
 *
 * @remarks
 * Two steps, because the API returns the accessories as ids only:
 * 1. `load()` loads the accessory groups (ids). `status`: `idle` → `loading` → `success` or
 *    `error` (with `error`), like the product store.
 * 2. The details (name, image) of each accessory are loaded per card, page by page
 *    ({@link PAGE_SIZE} at a time, `loadMore()` for the next page), with at most
 *    `MAX_PARALLEL_REQUESTS` requests at once (shared with the category store, see
 *    `@/stores/product-cards`). Each card has its own state in `cards`, so a slow or failed
 *    accessory never blocks the others; `retryCard()` loads one card again.
 *
 * - Timeout: every request has a time limit (`REQUEST_TIMEOUT_MS` in `@/api`). When it runs out
 *   for the groups, `isTimeout` is `true`; a card that times out shows its own error.
 * - A new `load()` cancels everything still running for the previous product, so a slow answer
 *   can never end up on the wrong page. Cancelled requests end with a `RequestAbortedError`,
 *   which is ignored.
 *
 * Each `load()` gets its services from `createCatalogServices(locale)` (`@/api`). Tests mock `@/api`
 * with the core mock adapter.
 *
 * @example
 * ```ts
 * const accessoriesStore = useAccessoriesStore()
 * await accessoriesStore.load('PRD-1001', { country: 'de', language: 'en' })
 * accessoriesStore.visibleIds // the first page of accessory ids
 * accessoriesStore.cards['PRD-1301'] // { status: 'success', product }
 * ```
 */
export const useAccessoriesStore = defineStore('accessories', () => {
  const status = ref<AccessoriesStatus>('idle')
  const groups = shallowRef<readonly AccessoryGroup[]>([])
  const error = shallowRef<DomainError | null>(null)
  /** State per requested accessory id; ids not requested yet are missing. */
  const cards = shallowRef<Readonly<Record<string, ProductCardState>>>({})
  /** How many accessories (in group order) are shown and requested. */
  const visibleCount = ref(0)

  /** Arguments of the last `load()`, for `retry()`. */
  let lastRequest: { productId: string; locale: Locale } | null = null
  /** Cancels all requests of the current product; `null` when nothing belongs to a product. */
  let controller: AbortController | null = null
  /** Services of the current product's locale, reused for its card requests. */
  let services: Services | null = null

  const isLoading = computed(() => status.value === 'loading')
  const isTimeout = computed(() => error.value instanceof TimeoutError)

  /** All accessory ids in group order, each once (an accessory can be in several groups). */
  const productIds = computed(() => [...new Set(groups.value.flatMap((group) => group.productIds))])
  const visibleIds = computed(() => productIds.value.slice(0, visibleCount.value))
  const hasMore = computed(() => visibleCount.value < productIds.value.length)

  /** Numbers for the progress line, e.g. "24 of 377 loaded · 2 failed". */
  const stats = computed(() => {
    const requested = visibleIds.value.map((id) => cards.value[id])
    return {
      total: productIds.value.length,
      loaded: requested.filter((card) => card?.status === 'success').length,
      failed: requested.filter((card) => card?.status === 'error').length,
    }
  })

  /**
   * Loads the accessory groups of a product, then the details of the first page. Cancels
   * everything still running for the previous product.
   *
   * @param productId - Product id of the main product, e.g. from the URL
   * @param locale - Country and language of the requests
   */
  async function load(productId: string, locale: Locale): Promise<void> {
    cancel()
    lastRequest = { productId, locale }
    const ownController = new AbortController()
    controller = ownController
    services = createCatalogServices(locale)

    status.value = 'loading'
    groups.value = []
    error.value = null
    cards.value = {}
    visibleCount.value = 0

    try {
      const result = await services.getAccessoryGroups(productId, {
        signal: ownController.signal,
      })
      if (controller !== ownController) {
        return // a newer load() started meanwhile
      }
      groups.value = result
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

  /** Shows the next {@link PAGE_SIZE} accessories and loads their details. */
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

  /** Loads the groups of the last product again. Does nothing before the first load. */
  async function retry(): Promise<void> {
    if (lastRequest) {
      await load(lastRequest.productId, lastRequest.locale)
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

  /** Loads the details of `ids`; results of an older product are dropped. */
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
    groups,
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

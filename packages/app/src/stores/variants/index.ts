import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  type DomainError,
  type Locale,
  type ProductVariant,
  RequestAbortedError,
  toDomainError,
} from '@product-explorer/core'
import { createCatalogServices } from '@/api'

/** Where loading the variants stands. */
export type VariantsStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Loads and holds the variants of the main product, e.g. the same cable in other lengths.
 *
 * @remarks
 * - `status`: `idle` → `loading` → `success` (with `variants`) or `error` (with `error`).
 * - Variants are extra information: the page shows the picker only on `success` with more than one
 *   variant, and simply leaves it out while loading or after an error. So there is no `retry()`.
 * - Switching to another variant of the same family keeps the list: if the new product id is
 *   already in `variants` (same country and language), `load()` requests nothing. Only a product
 *   from outside the family loads a new list.
 * - A new `load()` cancels the request that is still running; the cancelled request ends with a
 *   `RequestAbortedError`, which is ignored.
 *
 * @example
 * ```ts
 * const variantsStore = useVariantsStore()
 * await variantsStore.load('PRD-1305', { country: 'de', language: 'en' })
 * variantsStore.variants // PRD-1305 and its other cable lengths, or []
 * ```
 */
export const useVariantsStore = defineStore('variants', () => {
  const status = ref<VariantsStatus>('idle')
  const variants = shallowRef<readonly ProductVariant[]>([])
  const error = shallowRef<DomainError | null>(null)

  /** Locale of the loaded list, to know whether it can be kept for another variant. */
  let loadedLocale: Locale | null = null
  /** Cancels the running request; `null` when nothing is running. */
  let controller: AbortController | null = null

  const isLoading = computed(() => status.value === 'loading')

  function isSameLocale(locale: Locale): boolean {
    return loadedLocale?.country === locale.country && loadedLocale.language === locale.language
  }

  /**
   * Loads the variants of a product, unless it is a variant of the list already loaded.
   *
   * @param productId - Product id, e.g. from the URL; it is validated by the core service
   * @param locale - Country and language of the request
   */
  async function load(productId: string, locale: Locale): Promise<void> {
    const inLoadedFamily = variants.value.some((variant) => variant.id === productId)
    if (status.value === 'success' && inLoadedFamily && isSameLocale(locale)) {
      return // e.g. 2 m → 5 m of the same cable: the list is the same
    }

    cancel()
    const ownController = new AbortController()
    controller = ownController

    status.value = 'loading'
    variants.value = []
    error.value = null
    loadedLocale = null

    try {
      const result = await createCatalogServices(locale).getVariants(productId, {
        signal: ownController.signal,
      })
      if (controller !== ownController) {
        return // a newer load() started meanwhile
      }
      variants.value = result
      loadedLocale = locale
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

  return { status, variants, error, isLoading, load, cancel }
})

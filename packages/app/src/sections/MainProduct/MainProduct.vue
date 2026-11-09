<template>
  <section
    class="main-product"
    :aria-label="product?.title ?? productId"
    :aria-busy="isLoading || undefined"
  >
    <!-- Loading: placeholders in the shape of the content, so nothing jumps when it arrives -->
    <template v-if="isLoading">
      <span class="visually-hidden" role="status">{{ t('mainProduct.loading') }}</span>
      <div class="main-product__media main-product__media-skeleton">
        <Skeleton shape="block" height="100%" />
      </div>
      <div class="main-product__details main-product__details-skeleton">
        <Skeleton width="40%" height="0.75rem" />
        <Skeleton width="60%" height="3rem" />
        <Skeleton width="25%" />
        <Skeleton width="90%" height="1.25rem" />
        <Skeleton width="35%" height="2.5rem" />
        <Skeleton height="3.25rem" />
      </div>
    </template>

    <!-- Failed: illustration, what went wrong, and "Try again" when that can help (network,
         timeout, server) -->
    <div v-else-if="error" class="main-product__error">
      <StatusCard
        kind="error"
        :title="errorTitle"
        :text="errorMessage"
        :retryable="error.retryable"
        @retry="retry"
      />
    </div>

    <!-- Result: the product -->
    <template v-else-if="product">
      <!-- Left half: the product photo, enlargeable. The key starts it fresh per product, so an
           open enlarged view closes when the user navigates to another product. -->
      <ProductPhoto
        :key="product.id"
        class="main-product__media"
        :image="product.image"
        :alt="photoAlt"
      />

      <!-- Right half: information, then the key features below a divider -->
      <div class="main-product__details">
        <ProductInfo :product="product" :site-url="config.catalogSiteUrl">
          <!-- Variant picker, only once the variants are there and the product has others -->
          <template v-if="variants.length > 1" #variants>
            <VariantPicker :variants="variants" :current-id="product.id" />
          </template>
        </ProductInfo>
        <KeyFeatures
          v-if="product.bulletPoints.length > 0"
          class="main-product__features"
          :features="product.bulletPoints"
        />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
/**
 * The main product at the top of the page: photo on the left, information and key features on
 * the right. On phones and tablets the two halves stack, photo first.
 *
 * @remarks
 * Loads the product itself: `productStore.load()` for the product id, country and language it
 * gets, again whenever one of them changes; leaving the section cancels the request. It is the
 * only place that starts the product store. It loads the variants (`variantsStore`) in parallel;
 * they are extra information, so the picker simply appears once they are there and stays away
 * while they load or if they fail. It shows one of three states:
 * - loading: skeletons in the layout of the content, announced to screen readers
 * - error: a `StatusCard` with a title and message per error, and "Try again" for retryable errors
 *   (network, timeout, server); not for an invalid or unknown product id
 * - result: `ProductPhoto`, `ProductInfo` (with the `VariantPicker` if the product has variants)
 *   and `KeyFeatures`
 *
 * @example
 * ```vue
 * <MainProduct product-id="PRD-1001" country="de" language="en" />
 * ```
 */
import { computed, onBeforeUnmount, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { InvalidProductIdError, ProductNotFoundError } from '@product-explorer/core'
import { StatusCard } from '@/components/StatusCard'
import { KeyFeatures } from '@/components/KeyFeatures'
import { ProductInfo } from '@/components/ProductInfo'
import { ProductPhoto } from '@/components/ProductPhoto'
import { Skeleton } from '@/components/Skeleton'
import { VariantPicker } from '@/components/VariantPicker'
import { config } from '@/config'
import { t } from '@/i18n'
import { useProductStore, useVariantsStore } from '@/stores'

const props = defineProps({
  /** Product id from the URL; loaded, and used in the error messages */
  productId: {
    type: String,
    required: true,
  },
  /** Country code from the URL, e.g. `de` */
  country: {
    type: String,
    required: true,
  },
  /** Language code from the URL, e.g. `en` */
  language: {
    type: String,
    required: true,
  },
})

const productStore = useProductStore()
const { product, error, isLoading, isTimeout } = storeToRefs(productStore)
const { retry } = productStore

const variantsStore = useVariantsStore()
const { variants } = storeToRefs(variantsStore)

watch(
  () => [props.productId, props.country, props.language] as const,
  ([productId, country, language]) => {
    void productStore.load(productId, { country, language })
    void variantsStore.load(productId, { country, language })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  productStore.cancel()
  variantsStore.cancel()
})

/** What the photo shows, e.g. "Photoelectric distance sensor PRD-1001". */
const photoAlt = computed(() =>
  product.value ? `${product.value.headline} ${product.value.title}`.trim() : '',
)

/** "Nothing found" when the product id is invalid or unknown, otherwise "Something went wrong". */
const errorTitle = computed(() =>
  error.value instanceof InvalidProductIdError || error.value instanceof ProductNotFoundError
    ? t('common.notFoundTitle')
    : t('common.errorTitle'),
)

const errorMessage = computed(() => {
  const productId = props.productId
  if (error.value instanceof InvalidProductIdError) {
    return t('mainProduct.invalidId', { productId })
  }
  if (error.value instanceof ProductNotFoundError) {
    return t('mainProduct.notFound', { productId })
  }
  if (isTimeout.value) {
    return t('mainProduct.timeout')
  }
  return t('mainProduct.loadFailed')
})
</script>

<style scoped lang="scss">
@use 'breakpoints' as *;

.main-product {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-8);
  max-width: var(--container-max);
  margin-inline: auto;
  padding: var(--space-8) var(--container-padding) var(--space-12);

  @include from('desktop') {
    grid-template-columns: 1fr 1fr; // half photo, half information
    gap: var(--space-12);
  }

  &__media {
    // Not stretched to the row height: with an aspect ratio, a taller tile would also get wider
    // and squeeze the information column.
    align-self: start;
  }

  // Same shape as ProductPhoto's tile
  &__media-skeleton {
    aspect-ratio: 5 / 4;
    overflow: hidden;
    border-radius: var(--radius-lg);
  }

  &__details {
    display: flex;
    flex-direction: column;
    min-width: 0; // long texts wrap instead of widening the column
  }

  &__details-skeleton {
    gap: var(--space-4);
  }

  &__error {
    grid-column: 1 / -1; // across both halves
  }

  &__features {
    margin-top: var(--space-8);
    padding-top: var(--space-8);
    border-top: 1px solid var(--color-border);
  }
}
</style>

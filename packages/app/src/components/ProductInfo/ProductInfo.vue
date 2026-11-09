<template>
  <div class="product-info">
    <!-- Product type above the name, e.g. "INDUCTIVE PROXIMITY SENSOR" -->
    <p v-if="product.headline" class="product-info__eyebrow">{{ product.headline }}</p>

    <!-- The page's only <h1>: the product name, usually the product id -->
    <h1 class="product-info__title">{{ product.title }}</h1>

    <!-- The product id, grey below the name, like in the mockup -->
    <p class="product-info__id">{{ product.id }}</p>

    <!-- One-line summary below the name -->
    <p v-if="product.shortDescription" class="product-info__description">
      {{ product.shortDescription }}
    </p>

    <!-- Optional content before the price, e.g. the variant picker -->
    <div v-if="$slots.variants" class="product-info__variants">
      <slot name="variants" />
    </div>

    <!-- As formatted by the catalog, e.g. "84,90 €"; "Price on request" when there is no public price -->
    <p
      :class="[
        'product-info__price',
        { 'product-info__price--on-request': !product.formattedPrice },
      ]"
    >
      {{ product.formattedPrice ?? t('productCard.priceOnRequest') }}
    </p>

    <!-- Actions: open the product on the catalog website (a link, only if one is configured),
         copy the product id (a button) -->
    <div class="product-info__actions">
      <ButtonLink v-if="websiteUrl" :href="websiteUrl" size="large">
        <template #leading>
          <FontAwesomeIcon :icon="faArrowUpRightFromSquare" />
        </template>
        {{ t('mainProduct.viewOnWebsite') }}
      </ButtonLink>

      <BaseButton variant="outlined" size="large" @click="copyProductId">
        <template #leading>
          <FontAwesomeIcon :icon="copyIcon" />
        </template>
        {{ copyLabel }}
      </BaseButton>
    </div>

    <!-- Read out by screen readers after copying; the button label changes only visually -->
    <span class="visually-hidden" role="status">{{ copyAnnouncement }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * Information about the main product: type, name, summary, price and actions.
 *
 * @remarks
 * Shows a {@link Product} from core as it is; the page decides where it comes from. The texts
 * from the API are already in the language of the URL, and the price comes formatted by the
 * catalog (for the country in the URL).
 *
 * The `variants` slot sits between description and price, e.g. for a variant picker.
 *
 * "Copy product ID" copies the product id and shows "Copied" for two seconds. Screen readers
 * hear it through a status message, because the changed button label alone is not announced.
 *
 * @example
 * ```vue
 * <ProductInfo :product="product" site-url="https://shop.example.com" />
 * ```
 */
import { computed, onBeforeUnmount, ref, type PropType } from 'vue'
import {
  faArrowUpRightFromSquare,
  faCheck,
  faCopy,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import type { Product } from '@product-explorer/core'
import { BaseButton } from '@/components/BaseButton'
import { ButtonLink } from '@/components/ButtonLink'
import { t } from '@/i18n'

/** How long "Copied" / "Could not copy" stays on the button. */
const COPY_FEEDBACK_MS = 2000

const props = defineProps({
  /** The product to show */
  product: {
    type: Object as PropType<Product>,
    required: true,
  },
  /**
   * Base URL of the catalog website, e.g. `https://shop.example.com`; `Product.detailUrl` is a
   * path on it. Without it there is no "View on website" button.
   */
  siteUrl: {
    type: String as PropType<string | null>,
    default: null,
  },
})

/** Link to the product page on the catalog website, or `null` if there is no website. */
const websiteUrl = computed(() =>
  props.siteUrl ? `${props.siteUrl}${props.product.detailUrl}` : null,
)

/** Result of the last copy, shown for a moment; `idle` shows the normal label. */
const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
let resetTimer: ReturnType<typeof setTimeout> | undefined

const copyLabel = computed(() => {
  switch (copyState.value) {
    case 'copied':
      return t('mainProduct.copied')
    case 'failed':
      return t('mainProduct.copyFailed')
    default:
      return t('mainProduct.copyId')
  }
})

const copyIcon = computed(() => {
  switch (copyState.value) {
    case 'copied':
      return faCheck
    case 'failed':
      return faTriangleExclamation
    default:
      return faCopy
  }
})

const copyAnnouncement = computed(() => {
  switch (copyState.value) {
    case 'copied':
      return t('mainProduct.copiedAnnouncement', { productId: props.product.id })
    case 'failed':
      return t('mainProduct.copyFailed')
    default:
      return ''
  }
})

async function copyProductId(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.product.id)
    copyState.value = 'copied'
  } catch {
    // Clipboard blocked (no permission, insecure context, old browser)
    copyState.value = 'failed'
  }
  clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    copyState.value = 'idle'
  }, COPY_FEEDBACK_MS)
}

onBeforeUnmount(() => clearTimeout(resetTimer))
</script>

<style scoped lang="scss">
.product-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);

  &__eyebrow {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-eyebrow);
    text-transform: uppercase;
  }

  &__title {
    margin: 0;
    color: var(--color-text);
    font-size: var(--font-size-display);
    font-weight: var(--font-weight-extrabold);
    letter-spacing: var(--letter-spacing-display);
    line-height: var(--line-height-tight);
    overflow-wrap: anywhere; // long product ids break instead of overflowing on phones
  }

  &__id {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-md);
  }

  &__description {
    margin: var(--space-2) 0 0;
    color: var(--color-text);
    font-size: var(--font-size-lg);
    line-height: var(--line-height-snug);
  }

  &__variants {
    align-self: stretch;
    margin-top: var(--space-3);
  }

  &__price {
    margin: var(--space-3) 0 0;
    color: var(--color-text);
    font-size: var(--font-size-price);
    font-weight: var(--font-weight-extrabold);
    letter-spacing: var(--letter-spacing-display);
    line-height: var(--line-height-tight);

    &--on-request {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
      letter-spacing: normal;
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    align-self: stretch;
    margin-top: var(--space-2);

    // Both buttons share the row equally, and stack on narrow screens
    > * {
      flex: 1 1 14rem;
    }
  }
}
</style>

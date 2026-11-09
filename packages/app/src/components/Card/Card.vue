<template>
  <article :class="['card', `card--${status}`]" :aria-busy="status === 'loading' || undefined">
    <!-- Image tile: skeleton while loading, the default picture if there is no usable image -->
    <div :class="['card__media', { 'card__media--empty': isEmptyTile }]">
      <Skeleton v-if="status === 'loading'" shape="block" height="100%" />
      <ImagePlaceholder v-else-if="isEmptyTile" />
      <img
        v-else-if="image"
        class="card__image"
        :src="image.sizes[300]"
        :srcset="srcset"
        sizes="(min-width: 640px) 15rem, 50vw"
        alt=""
        loading="lazy"
        decoding="async"
        @error="imageFailed = true"
      />
    </div>

    <div class="card__body">
      <!-- The product id is known from the id list, so it shows in every state -->
      <span class="card__id">{{ productId }}</span>

      <Skeleton v-if="status === 'loading'" width="80%" height="1.25rem" />
      <h3 v-else-if="status === 'ready'" class="card__name">{{ name }}</h3>
      <p v-else-if="status === 'unavailable'" class="card__message">
        {{ t('productCard.unavailable') }}
      </p>
      <CardError
        v-else
        retryable
        :message="t('productCard.detailsFailed')"
        @retry="emit('retry')"
      />

      <RouterLink v-if="status !== 'unavailable'" class="card__link" :to="to">
        {{ t('productCard.viewProduct') }}
        <span class="visually-hidden">{{ productId }}</span>
        <FontAwesomeIcon class="card__arrow" :icon="faArrowRight" />
      </RouterLink>
    </div>
  </article>
</template>

<script setup lang="ts">
/**
 * Card for one related product (accessory or product of the same category).
 *
 * @remarks
 * Every card has its own state, so slow or failed products never block the others:
 * - `loading`: skeleton for image and name; the product id is already shown
 * - `ready`: image, name and the link to the product
 * - `error`: "Details could not be loaded" with "Try again" (emits `retry`); the link still works
 * - `unavailable`: "No longer available" (the product was not found), no retry and no link
 *
 * The card only shows what it gets. Mapping a store's card state to these props is done by the
 * section that renders the cards.
 *
 * Product photos usually have a white background baked in. `mix-blend-mode: multiply` lets the tile
 * colour shine through the white, like the peach tiles in the mockup. Without an image, or if it
 * fails to load, the tile shows the default picture ({@link ImagePlaceholder}).
 *
 * @example
 * ```vue
 * <Card product-id="PRD-1301" name="Connecting cable" :image="product.image" :to="link" />
 * ```
 */
import { computed, ref, watch, type PropType } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import type { ProductImage } from '@product-explorer/core'
import { CardError } from '@/components/error'
import { ImagePlaceholder } from '@/components/ImagePlaceholder'
import { Skeleton } from '@/components/Skeleton'
import { t } from '@/i18n'

const props = defineProps({
  /** Product id, e.g. `PRD-1301` */
  productId: {
    type: String,
    required: true,
  },
  /** Product name, e.g. "Connecting cable with socket". Only shown when `ready`. */
  name: {
    type: String,
    default: '',
  },
  /** Product image in several sizes, or `null` if the product has none */
  image: {
    type: Object as PropType<ProductImage | null>,
    default: null,
  },
  /** Where "View product" leads, e.g. the product page of this app */
  to: {
    type: [String, Object] as PropType<RouteLocationRaw>,
    required: true,
  },
  /** Loading state of this card. Default `ready`. */
  status: {
    type: String as PropType<'loading' | 'ready' | 'error' | 'unavailable'>,
    default: 'ready',
  },
})

const emit = defineEmits<{
  /** "Try again" was clicked on a failed card */
  retry: []
}>()

/** Set when the browser could not load the image; then the default picture is shown. */
const imageFailed = ref(false)

watch(
  () => props.image,
  () => {
    imageFailed.value = false
  },
)

const showImage = computed(() => props.status !== 'unavailable' && !imageFailed.value)

/** No skeleton and no photo: the tile shows the default picture on a quieter colour. */
const isEmptyTile = computed(() => props.status !== 'loading' && !(showImage.value && props.image))

const srcset = computed(() => {
  if (!props.image) {
    return undefined
  }
  return Object.entries(props.image.sizes)
    .map(([size, url]) => `${url} ${size}w`)
    .join(', ')
})
</script>

<style scoped lang="scss">
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);

  &__media {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 3 / 2;
    overflow: hidden;
    border-radius: var(--radius-md);
    background: var(--color-surface-image);

    // Without a photo the light image colour would glare in dark mode
    &--empty {
      background: var(--color-surface-chip);
    }
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    mix-blend-mode: multiply; // the photo's white background takes the tile colour
  }

  &__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-2);
    padding-inline: var(--space-2);
    padding-bottom: var(--space-2);
  }

  &__id {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  &__name {
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    color: var(--color-text);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-snug);
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2; // long names end with "…" after two lines, so cards stay even
  }

  &__message {
    margin: 0;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  &__link {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: var(--space-2);
    margin-top: auto; // keeps the links on one line across a row of cards
    padding-top: var(--space-2);
    color: var(--color-primary-text);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }

    &:hover .card__arrow {
      transform: translateX(0.125rem);
    }
  }

  &__arrow {
    width: var(--icon-size-sm);
    height: var(--icon-size-sm);
    transition: transform 150ms ease;
  }
}
</style>

<template>
  <div class="product-photo">
    <!-- With a usable image: the photo is a button that opens the enlarged view -->
    <button
      v-if="usableImage"
      ref="trigger"
      class="product-photo__trigger"
      type="button"
      aria-haspopup="dialog"
      :aria-label="t('mainProduct.enlargeImage', { name: alt })"
      @click="open"
    >
      <img
        class="product-photo__image"
        :src="usableImage.sizes[300]"
        :srcset="srcset"
        sizes="(min-width: 1024px) 34rem, 100vw"
        alt=""
        decoding="async"
        @error="imageFailed = true"
      />
      <!-- Visible hint that the photo can be enlarged -->
      <span class="product-photo__zoom">
        <FontAwesomeIcon :icon="faMagnifyingGlassPlus" />
      </span>
    </button>

    <!-- No image, or it could not be loaded: the default picture, nothing to enlarge -->
    <ImagePlaceholder v-else class="product-photo__placeholder" :label="t('mainProduct.noImage')" />

    <!-- Enlarged view. Native modal: traps focus, closes on Escape, the page behind is inert -->
    <dialog
      v-if="usableImage"
      ref="dialog"
      class="product-photo__dialog"
      :aria-label="alt"
      @click="onDialogClick"
      @close="onClose"
    >
      <div class="product-photo__dialog-content">
        <BaseButton class="product-photo__close" variant="text" @click="close">
          <template #leading>
            <FontAwesomeIcon :icon="faXmark" />
          </template>
          {{ t('mainProduct.closeImage') }}
        </BaseButton>

        <!-- Loaded only while open; the largest size the API offers -->
        <div v-if="isOpen && !enlargedFailed" class="product-photo__stage">
          <img
            class="product-photo__enlarged"
            :src="largestUrl"
            :alt="alt"
            decoding="async"
            @error="enlargedFailed = true"
          />
        </div>
        <p v-else-if="enlargedFailed" class="product-photo__message">
          {{ t('mainProduct.imageFailed') }}
        </p>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * The main product's photo. A click (or Enter / Space) opens it enlarged in a modal dialog.
 *
 * @remarks
 * Uses the native `<dialog>` with `showModal()`: the browser moves focus into the dialog, keeps
 * it there, closes on Escape and makes the page behind inert. Closing also works with the
 * "Close" button and by clicking the dimmed area around the photo; clicking the photo itself does
 * nothing. After closing, focus goes back to the photo, and the page can scroll again.
 *
 * The four sizes of a {@link ProductImage} (140–400 px) are the same photo; the enlarged view uses
 * the largest one. Without a usable image (none, or it failed to load) only a placeholder is
 * shown and nothing can be enlarged.
 *
 * Give the component a `:key` per product, so it starts fresh (and an open dialog closes) when
 * the user navigates to another product.
 *
 * @example
 * ```vue
 * <ProductPhoto :key="product.id" :image="product.image" :alt="product.title" />
 * ```
 */
import { computed, onBeforeUnmount, ref, useTemplateRef, type PropType } from 'vue'
import { faMagnifyingGlassPlus, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import type { ProductImage, ProductImageSize } from '@product-explorer/core'
import { BaseButton } from '@/components/BaseButton'
import { ImagePlaceholder } from '@/components/ImagePlaceholder'
import { t } from '@/i18n'

const props = defineProps({
  /** The product's photo in several sizes, or `null` if it has none */
  image: {
    type: Object as PropType<ProductImage | null>,
    default: null,
  },
  /** What the photo shows, e.g. "Photoelectric distance sensor PRD-1001" */
  alt: {
    type: String,
    required: true,
  },
})

const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const dialog = useTemplateRef<HTMLDialogElement>('dialog')

/** The photo on the page could not be loaded: show the placeholder instead. */
const imageFailed = ref(false)
/** The enlarged photo could not be loaded: show a message in the dialog. */
const enlargedFailed = ref(false)
const isOpen = ref(false)

const usableImage = computed(() => (imageFailed.value ? null : props.image))

const srcset = computed(() => {
  const sizes = usableImage.value?.sizes
  if (!sizes) {
    return undefined
  }
  return Object.entries(sizes)
    .map(([size, url]) => `${url} ${size}w`)
    .join(', ')
})

const largestUrl = computed(() => {
  const sizes = usableImage.value?.sizes
  if (!sizes) {
    return ''
  }
  const largest = Math.max(...Object.keys(sizes).map(Number)) as ProductImageSize
  return sizes[largest]
})

/** `overflow` of `<html>` before opening, restored on close; `null` while not locked. */
let overflowBeforeOpen: string | null = null

function lockPageScroll(): void {
  if (overflowBeforeOpen !== null) {
    return
  }
  overflowBeforeOpen = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'
}

function unlockPageScroll(): void {
  if (overflowBeforeOpen === null) {
    return
  }
  document.documentElement.style.overflow = overflowBeforeOpen
  overflowBeforeOpen = null
}

function open(): void {
  const element = dialog.value
  if (!element || element.open) {
    return
  }
  enlargedFailed.value = false
  element.showModal()
  isOpen.value = true
  lockPageScroll()
}

/** Closes the dialog; the `close` event then runs {@link onClose}. */
function close(): void {
  dialog.value?.close()
}

/** Runs however the dialog was closed: button, Escape or the dimmed area. */
function onClose(): void {
  isOpen.value = false
  unlockPageScroll()
  trigger.value?.focus()
}

/** A click on the dialog element itself is a click on the dimmed area around the content. */
function onDialogClick(event: MouseEvent): void {
  if (event.target === dialog.value) {
    close()
  }
}

onBeforeUnmount(() => {
  if (dialog.value?.open) {
    dialog.value.close()
  }
  unlockPageScroll()
})
</script>

<style scoped lang="scss">
.product-photo {
  position: relative;
  aspect-ratio: 5 / 4; // like the picture in the mockup
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--color-surface-image);

  &__trigger {
    display: block;
    width: 100%;
    height: 100%;
    padding: var(--space-8);
    border: 0;
    border-radius: inherit;
    background: transparent;
    cursor: zoom-in;

    // The tile clips its content, so the focus ring is drawn inside
    &:focus-visible {
      outline-offset: -3px;
    }

    &:hover .product-photo__zoom {
      transform: scale(1.08);
    }
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    mix-blend-mode: multiply; // the photo's white background takes the tile colour
  }

  &__zoom {
    position: absolute;
    right: var(--space-4);
    bottom: var(--space-4);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    box-shadow: var(--shadow-card);
    color: var(--color-text);
    font-size: var(--icon-size-md);
    transition: transform 150ms ease;
  }

  &__placeholder {
    background: var(--color-surface-chip); // quieter than the photo colour, also in dark mode
  }

  &__dialog {
    width: min(92vw, 44rem);
    max-width: none;
    padding: 0;
    border: 0;
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-card);

    &[open] {
      animation: product-photo-open 150ms ease-out;
    }

    &::backdrop {
      background: var(--color-scrim);
    }
  }

  &__dialog-content {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-4);
  }

  &__close {
    justify-self: end;
  }

  &__stage {
    display: flex;
    justify-content: center;
    border-radius: var(--radius-md);
    background: var(--color-surface-image);
  }

  &__enlarged {
    width: 100%;
    max-height: 75dvh;
    aspect-ratio: 1; // product photos are square
    object-fit: contain;
    mix-blend-mode: multiply;
    cursor: default;
  }

  &__message {
    margin: 0;
    padding: var(--space-12) var(--space-4);
    color: var(--color-text-muted);
    text-align: center;
  }
}

@keyframes product-photo-open {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
}

@media (prefers-reduced-motion: reduce) {
  .product-photo__dialog[open] {
    animation: none;
  }

  .product-photo__zoom {
    transition: none;
  }
}
</style>

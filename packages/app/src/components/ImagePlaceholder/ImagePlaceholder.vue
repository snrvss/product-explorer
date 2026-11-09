<template>
  <div class="image-placeholder">
    <!-- Only decoration: the product name next to it says what is missing -->
    <img class="image-placeholder__illustration" :src="noImageIllustration" alt="" />
    <!-- Optional text below, e.g. "No image available" where there is room for it -->
    <span v-if="label" class="image-placeholder__label">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * Default picture for a product without photo, like in online shops: a calm illustration of an
 * empty picture frame, optionally with a short text below.
 *
 * @remarks
 * Shown when a product has no image in its data, and when its photo file cannot be loaded (the
 * photo comes from the image server in its own request, so it can fail even if the product
 * loaded). Both cases look the same, because for the user the cause doesn't matter.
 *
 * Fills its parent (e.g. a card's image tile) and keeps the illustration centred. The illustration
 * is a local file, so it needs no extra API request. It deliberately looks nothing like a product
 * photo, so nobody mistakes it for the real product.
 *
 * @example
 * ```vue
 * <ImagePlaceholder />
 * <ImagePlaceholder :label="t('mainProduct.noImage')" />
 * ```
 */
import noImageIllustration from '@/assets/illustrations/no-image.svg'

defineProps({
  /** Text below the illustration, already translated; leave empty in small places like cards */
  label: {
    type: String,
    default: '',
  },
})
</script>

<style scoped lang="scss">
.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  height: 100%;
  padding: var(--space-4);

  &__illustration {
    width: min(55%, 10rem);
    height: auto;
  }

  &__label {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    text-align: center;
  }
}
</style>

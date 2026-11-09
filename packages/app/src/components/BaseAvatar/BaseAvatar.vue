<template>
  <span :class="classes">
    <img class="base-avatar__image" :src="src" :alt="alt" />
  </span>
</template>

<script setup lang="ts">
/**
 * Round image, e.g. the logo next to "Product Explorer" in the header and footer.
 *
 * @remarks
 * The image fills the circle (`object-fit: cover`), so non-square images are cropped, not
 * stretched. Until the image has loaded, the circle shows the image placeholder colour.
 *
 * @example
 * ```vue
 * <BaseAvatar :src="logoUrl" alt="" size="small" />
 * ```
 */
import { computed, type PropType } from 'vue'

const props = defineProps({
  /** Image URL */
  src: {
    type: String,
    required: true,
  },
  /**
   * Text for screen readers. Use `''` when text next to the avatar already says the same, e.g.
   * the logo next to "Product Explorer", so it isn't read twice.
   */
  alt: {
    type: String,
    required: true,
  },
  /** `small` 36 px (footer), `large` 52 px (header). Default `large`. */
  size: {
    type: String as PropType<'small' | 'large'>,
    default: 'large',
  },
})

const classes = computed(() => ['base-avatar', `base-avatar--${props.size}`])
</script>

<style scoped lang="scss">
.base-avatar {
  display: inline-flex;
  flex-shrink: 0; // stays round inside flex rows, e.g. next to a long title
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--color-surface-image);

  &--small {
    width: 2.25rem; // 36px, footer in the mockup
    height: 2.25rem;
  }

  &--large {
    width: 3.25rem; // 52px, header in the mockup
    height: 3.25rem;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>

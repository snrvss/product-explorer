<template>
  <span :class="['skeleton', `skeleton--${shape}`]" :style="{ width, height }" aria-hidden="true" />
</template>

<script setup lang="ts">
/**
 * Loading placeholder with a soft shimmer, shown where content will appear.
 *
 * @remarks
 * Purely visual, so it is hidden from screen readers. The surrounding element tells them that
 * something is loading, e.g. with `aria-busy="true"` or a loading text.
 *
 * Give it the size of the content it stands for, so nothing jumps when the content arrives.
 * The shimmer stops for users who prefer reduced motion (see `main.scss`).
 *
 * @example
 * ```vue
 * <Skeleton width="80%" height="1.25rem" />
 * <Skeleton shape="block" />
 * ```
 */
import type { PropType } from 'vue'

defineProps({
  /** Any CSS width, e.g. `80%` or `12rem`. Default `100%`. */
  width: {
    type: String,
    default: '100%',
  },
  /** Any CSS height, e.g. `1.25rem` or `100%`. Default `1em` (one line of the current text). */
  height: {
    type: String,
    default: '1em',
  },
  /**
   * `text`: slightly rounded, for lines of text (default)
   * `block`: square corners, fills e.g. an image tile that rounds itself
   * `circle`: round, e.g. for an avatar
   */
  shape: {
    type: String as PropType<'text' | 'block' | 'circle'>,
    default: 'text',
  },
})
</script>

<style scoped lang="scss">
.skeleton {
  display: block;
  background: linear-gradient(
    90deg,
    var(--color-skeleton) 0%,
    var(--color-skeleton-highlight) 50%,
    var(--color-skeleton) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;

  &--text {
    border-radius: var(--radius-sm);
  }

  &--block {
    border-radius: 0;
  }

  &--circle {
    border-radius: var(--radius-pill);
  }
}

@keyframes skeleton-shimmer {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: -100% 0;
  }
}
</style>

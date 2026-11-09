<template>
  <a :class="classes" :href="href">
    <!-- Icon before the label (18 px, 20 px when large) -->
    <span v-if="$slots.leading" class="button-link__icon">
      <slot name="leading" />
    </span>

    <!-- The label -->
    <span class="button-link__label">
      <slot />
    </span>

    <!-- Icon after the label, e.g. an arrow -->
    <span v-if="$slots.trailing" class="button-link__icon">
      <slot name="trailing" />
    </span>
  </a>
</template>

<script setup lang="ts">
/**
 * Link that looks like a button, for navigation, e.g. "View on website".
 *
 * @remarks
 * Use it when a click leads somewhere; for an action on the page use `BaseButton`. A real `<a>`
 * keeps what users expect from links: open in a new tab, copy the address, the browser's status
 * bar, and screen readers announce it as a link. It shares its look with `BaseButton`
 * (`styles/_button.scss`).
 *
 * @example
 * ```vue
 * <ButtonLink href="https://shop.example.com/products/PRD-1001" size="large">
 *   <template #leading><FontAwesomeIcon :icon="faArrowUpRightFromSquare" /></template>
 *   View on website
 * </ButtonLink>
 * ```
 */
import { computed, type PropType } from 'vue'

const props = defineProps({
  /** Where the link leads */
  href: {
    type: String,
    required: true,
  },
  /** Visual emphasis, like `BaseButton`. Default `filled`. */
  variant: {
    type: String as PropType<'filled' | 'outlined' | 'text'>,
    default: 'filled',
  },
  /** Height: `medium` 40 px, `large` 52 px. Default `medium`. */
  size: {
    type: String as PropType<'medium' | 'large'>,
    default: 'medium',
  },
  /** Stretches the link to the full width of its container. */
  fullWidth: {
    type: Boolean,
    default: false,
  },
})

const classes = computed(() => [
  'button-link',
  `button-link--${props.variant}`,
  `button-link--${props.size}`,
  { 'button-link--full-width': props.fullWidth },
])
</script>

<style scoped lang="scss">
@use 'button' as *;

.button-link {
  // Shared with BaseButton: shape, sizes, variants, state layer, icons (styles/_button.scss)
  @include button;
}
</style>

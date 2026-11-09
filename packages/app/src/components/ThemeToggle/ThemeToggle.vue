<template>
  <button
    class="theme-toggle"
    type="button"
    :aria-label="label"
    :title="label"
    @click="dark = !dark"
  >
    <!-- Shows where the click leads: the sun in dark mode, the moon in light mode -->
    <FontAwesomeIcon v-if="dark" class="theme-toggle__icon theme-toggle__icon--sun" :icon="faSun" />
    <FontAwesomeIcon v-else class="theme-toggle__icon theme-toggle__icon--moon" :icon="faMoon" />
  </button>
</template>

<script setup lang="ts">
/**
 * Round icon button that switches between light and dark mode.
 *
 * @remarks
 * Only shows and changes the value it gets with `v-model`. Applying and remembering the theme is
 * done by whoever uses it (see `useTheme`), so this button stays reusable and easy to test.
 *
 * The label is passed in (already translated) and describes the action, e.g. "Switch to dark
 * mode". Screen readers read it, mouse users see it as a tooltip.
 *
 * @example
 * ```vue
 * <ThemeToggle v-model="isDark" :label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" />
 * ```
 */
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

defineProps({
  /** What a click does, e.g. "Switch to dark mode" */
  label: {
    type: String,
    required: true,
  },
})

/** `true` in dark mode. Updated on click. */
const dark = defineModel({
  type: Boolean,
  required: true,
})
</script>

<style scoped lang="scss">
.theme-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem; // 40px, MD3 icon button
  height: 2.5rem;
  overflow: hidden; // keeps the state layer inside the circle
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;

  // MD3 state layer, like BaseButton
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: currentColor;
    opacity: 0;
    transition: opacity 150ms ease;
    pointer-events: none;
  }

  &:hover::before {
    opacity: 0.08;
  }

  &:focus-visible::before,
  &:active::before {
    opacity: 0.1;
  }

  &__icon {
    position: relative;
    width: var(--icon-size-lg);
    height: var(--icon-size-lg);
  }
}
</style>

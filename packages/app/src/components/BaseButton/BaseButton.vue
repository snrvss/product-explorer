<template>
  <button
    :class="classes"
    :type="type"
    :disabled="disabled"
    :aria-disabled="loading || undefined"
    :aria-busy="loading || undefined"
    @click="onClick"
  >
    <!-- Icon before the label (18 px). Replaced by the spinner while loading. -->
    <span v-if="loading" class="base-button__icon base-button__spinner">
      <FontAwesomeIcon :icon="faCircleNotch" spin />
    </span>
    <span v-else-if="$slots.leading" class="base-button__icon">
      <slot name="leading" />
    </span>

    <!-- The label -->
    <span class="base-button__label">
      <slot />
    </span>

    <!-- Icon after the label (18 px), e.g. an arrow -->
    <span v-if="$slots.trailing" class="base-button__icon">
      <slot name="trailing" />
    </span>
  </button>
</template>

<script setup lang="ts">
/**
 * Button for actions on the page, following Material Design 3 and the design mockup.
 *
 * @remarks
 * For navigation to another page use a link (`<a href>`), not this button: links and buttons
 * behave differently for keyboards, screen readers and "open in new tab".
 *
 * Variants (MD3 names):
 * - `filled`: main action, e.g. "View on website"
 * - `outlined`: secondary action, e.g. "Copy product ID", "Load more accessories"
 * - `text`: low-emphasis action, e.g. "Retry" inside an error message
 *
 * Hover, focus and press use an MD3 "state layer": a layer in the text colour at 8 % / 10 % / 10 %
 * opacity, so the states look right in every variant and in dark mode.
 *
 * @example
 * ```vue
 * <BaseButton variant="outlined" @click="copyId">
 *   <template #leading><CopyIcon /></template>
 *   Copy product ID
 * </BaseButton>
 * ```
 */
import { computed, type PropType } from 'vue'
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const props = defineProps({
  /** Visual emphasis. Default `filled`. */
  variant: {
    type: String as PropType<'filled' | 'outlined' | 'text'>,
    default: 'filled',
  },
  /** Height: `medium` 40 px (MD3 default), `large` 52 px (mockup hero buttons). Default `medium`. */
  size: {
    type: String as PropType<'medium' | 'large'>,
    default: 'medium',
  },
  /** Native button type. Default `button`, so it never submits a form by accident. */
  type: {
    type: String as PropType<'button' | 'submit' | 'reset'>,
    default: 'button',
  },
  /** Disables the button. It can't be focused or clicked. */
  disabled: {
    type: Boolean,
    default: false,
  },
  /**
   * Shows a spinner and ignores clicks, e.g. while "Load more" is loading. Unlike `disabled`, the
   * button stays focusable, so keyboard users don't lose their place.
   */
  loading: {
    type: Boolean,
    default: false,
  },
  /** Stretches the button to the full width of its container, e.g. on mobile. */
  fullWidth: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  /** The button was activated (mouse, keyboard or touch). Not emitted while disabled or loading. */
  click: [event: MouseEvent]
}>()

const classes = computed(() => [
  'base-button',
  `base-button--${props.variant}`,
  `base-button--${props.size}`,
  {
    'base-button--loading': props.loading,
    'base-button--full-width': props.fullWidth,
  },
])

function onClick(event: MouseEvent): void {
  if (props.disabled || props.loading) {
    return
  }
  emit('click', event)
}
</script>

<style scoped lang="scss">
@use 'button' as *;

.base-button {
  // Shared with ButtonLink: shape, sizes, variants, state layer, icons (styles/_button.scss)
  @include button;

  // MD3 disabled: container 12 %, content 38 % of the text colour
  &:disabled {
    cursor: not-allowed;
    color: color-mix(in srgb, var(--color-text) 38%, transparent);
  }

  &--filled:disabled {
    background: color-mix(in srgb, var(--color-text) 12%, transparent);
  }

  &--outlined:disabled {
    border-color: color-mix(in srgb, var(--color-text) 12%, transparent);
  }

  &--loading {
    cursor: progress;
  }
}
</style>

<template>
  <div
    :class="['status-card', `status-card--${kind}`]"
    :role="kind === 'error' ? 'alert' : undefined"
  >
    <!-- Illustration; only decoration, the title and text say it all -->
    <img class="status-card__illustration" :src="illustration" alt="" />

    <p class="status-card__title">{{ title }}</p>
    <p class="status-card__text">{{ text }}</p>

    <!-- "Try again" only when trying again can help, plus further actions from the slot -->
    <div v-if="retryable || $slots.default" class="status-card__actions">
      <BaseButton v-if="retryable" variant="outlined" @click="emit('retry')">
        <template #leading>
          <FontAwesomeIcon :icon="faRotateRight" />
        </template>
        {{ t('common.retry') }}
      </BaseButton>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Card for a whole area that has nothing to show: an illustration, a title and a short text,
 * e.g. "No accessories" or "Something went wrong" with "Try again".
 *
 * @remarks
 * - `kind="error"`: error illustration; the card is a `role="alert"`, so screen readers announce
 *   it once. With `retryable` it offers "Try again" (emits `retry`).
 * - `kind="empty"`: illustration for "nothing here"; not announced.
 *
 * For a single failed product card use `CardError` instead. The illustrations are flat SVG files
 * in `assets/illustrations` (unDraw style), shown with `<img>`; they can be replaced by real unDraw
 * downloads with the same file names.
 *
 * @example
 * ```vue
 * <StatusCard
 *   kind="error"
 *   :title="t('common.errorTitle')"
 *   :text="t('accessories.loadFailed')"
 *   :retryable="error.retryable"
 *   @retry="retry"
 * />
 * ```
 */
import { computed, type PropType } from 'vue'
import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import emptyIllustration from '@/assets/illustrations/empty.svg'
import errorIllustration from '@/assets/illustrations/error.svg'
import { BaseButton } from '@/components/BaseButton'
import { t } from '@/i18n'

const props = defineProps({
  /** Short heading, already translated, e.g. "Something went wrong" */
  title: {
    type: String,
    required: true,
  },
  /** One or two sentences below, already translated */
  text: {
    type: String,
    required: true,
  },
  /** `error` (announced, error illustration) or `empty` (nothing to show). Default `empty`. */
  kind: {
    type: String as PropType<'error' | 'empty'>,
    default: 'empty',
  },
  /** Shows "Try again". Set it from `DomainError.retryable`. */
  retryable: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  /** "Try again" was clicked */
  retry: []
}>()

const illustration = computed(() =>
  props.kind === 'error' ? errorIllustration : emptyIllustration,
)
</script>

<style scoped lang="scss">
.status-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-6);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  text-align: center;

  // Errors get the red tint of the former SectionError, so they stand out from "nothing here"
  &--error {
    background: var(--color-danger-surface);
    box-shadow: none;
  }

  &__illustration {
    width: min(100%, 15rem);
    height: auto;
    margin-bottom: var(--space-4);
  }

  &__title {
    margin: 0;
    color: var(--color-text);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
  }

  &__text {
    max-width: 32rem;
    margin: 0;
    color: var(--color-text-secondary);
    line-height: var(--line-height-normal);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-3);
    margin-top: var(--space-4);
  }
}
</style>

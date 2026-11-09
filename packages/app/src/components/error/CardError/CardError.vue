<template>
  <div class="card-error">
    <p class="card-error__message">{{ message }}</p>

    <BaseButton v-if="retryable" variant="text" @click="emit('retry')">
      <template #leading>
        <FontAwesomeIcon :icon="faRotateRight" />
      </template>
      {{ t('common.retry') }}
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
/**
 * Small error inside a card: red text and an optional "Try again".
 *
 * @remarks
 * Not a `role="alert"` on purpose: with many failed cards a screen reader would announce every
 * one. The section's progress line announces failures once instead. For a whole section that
 * failed use `StatusCard`.
 *
 * "Try again" is only shown when `retryable` is set, i.e. when trying again can help (network,
 * timeout, server error).
 *
 * @example
 * ```vue
 * <CardError :message="t('productCard.detailsFailed')" retryable @retry="retryCard(id)" />
 * ```
 */
import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { BaseButton } from '@/components/BaseButton'
import { t } from '@/i18n'

defineProps({
  /** What went wrong, already translated */
  message: {
    type: String,
    required: true,
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
</script>

<style scoped lang="scss">
.card-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);

  &__message {
    margin: 0;
    color: var(--color-danger);
    font-size: var(--font-size-sm);
  }

  // Aligns the text button's label with the message above
  :deep(.base-button) {
    margin-inline-start: calc(-1 * var(--space-3));
  }
}
</style>

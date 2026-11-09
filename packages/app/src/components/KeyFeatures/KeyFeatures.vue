<template>
  <section v-if="features.length > 0" class="key-features" :aria-labelledby="headingId">
    <!-- Only rendered with features, so no empty heading is left behind.
         (Comments stay inside the root element: one before it would make the template a fragment,
         and a class passed from outside would be dropped.) -->
    <h2 :id="headingId" class="key-features__title">{{ t('mainProduct.keyFeatures') }}</h2>

    <!-- A list, so screen readers announce how many features there are -->
    <ul class="key-features__list">
      <li
        v-for="(feature, index) in features"
        :key="`${index}-${feature}`"
        class="key-features__item"
      >
        <!-- Orange check in front of every feature; only decoration -->
        <FontAwesomeIcon class="key-features__icon" :icon="faCircleCheck" />
        <span class="key-features__text">{{ feature }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
/**
 * "Key features" of a product: a heading and a list of features with orange check marks.
 *
 * @remarks
 * Gets the features as they come from the API (`Product.bulletPoints`, already in the language of
 * the URL). Renders nothing when the list is empty. The heading is an `<h2>`, below the product's
 * `<h1>`.
 *
 * @example
 * ```vue
 * <KeyFeatures :features="product.bulletPoints" />
 * ```
 */
import { useId, type PropType } from 'vue'
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { t } from '@/i18n'

defineProps({
  /** The features, in display order, e.g. "Reliable background suppression" */
  features: {
    type: Array as PropType<readonly string[]>,
    required: true,
  },
})

const headingId = useId()
</script>

<style scoped lang="scss">
.key-features {
  display: grid;
  gap: var(--space-4);

  &__title {
    margin: 0;
    color: var(--color-text);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    line-height: var(--line-height-tight);
  }

  &__list {
    display: grid;
    gap: var(--space-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__item {
    display: flex;
    align-items: flex-start; // long features wrap next to the icon, not below it
    gap: var(--space-4);
  }

  &__icon {
    flex-shrink: 0;
    width: var(--icon-size-xl);
    height: var(--icon-size-xl);
    color: var(--color-primary);
  }

  &__text {
    color: var(--color-text-secondary);
    font-size: var(--font-size-md);
    line-height: var(--line-height-normal);
  }
}
</style>

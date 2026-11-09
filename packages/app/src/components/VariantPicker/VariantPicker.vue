<template>
  <!-- Only when there is something to choose: the list always contains the product itself -->
  <div v-if="sortedVariants.length > 1" class="variant-picker">
    <!-- Heading and how many variants there are, e.g. "Cable length · 15 lengths available" -->
    <div class="variant-picker__header">
      <h2 :id="headingId" class="variant-picker__title">{{ title }}</h2>
      <span class="variant-picker__count">{{ countText }}</span>
    </div>

    <!-- One link per variant: choosing a variant opens that product. The current one is marked
         with a check and aria-current. -->
    <ul :id="listId" class="variant-picker__options" :aria-labelledby="headingId">
      <li v-for="variant in visibleVariants" :key="variant.id">
        <RouterLink
          :to="{ name: PRODUCT_ROUTE, params: { productId: variant.id } }"
          :class="[
            'variant-picker__option',
            { 'variant-picker__option--current': variant.id === currentId },
          ]"
          :aria-current="variant.id === currentId ? 'page' : undefined"
        >
          <FontAwesomeIcon
            v-if="variant.id === currentId"
            class="variant-picker__check"
            :icon="faCircleCheck"
          />
          {{ labelOf(variant) }}
        </RouterLink>
      </li>
    </ul>

    <!-- Only the first row at first; this shows the rest -->
    <BaseButton
      v-if="sortedVariants.length > COLLAPSED_COUNT"
      variant="outlined"
      full-width
      :aria-expanded="expanded"
      :aria-controls="listId"
      @click="expanded = !expanded"
    >
      <template #leading>
        <FontAwesomeIcon :icon="expanded ? faChevronUp : faChevronDown" />
      </template>
      {{ expanded ? t('variants.showLess') : t('variants.showMore', { count: hiddenCount }) }}
    </BaseButton>

    <!-- Which variant this page shows, e.g. "Selected: 2 m · PRD-1305" -->
    <p class="variant-picker__selected">
      {{ t('variants.selected') }}
      <span class="variant-picker__selected-value">{{ currentLabel }} · {{ currentId }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Picker for the variants of a product, e.g. the same cable in other lengths.
 *
 * @remarks
 * Every variant is its own product, so each option is a link to that product's page (not a
 * button that changes something on this page). The current product is marked as the current
 * page. Variants are sorted by cable length; without a length an option shows the variant's
 * description from the API.
 *
 * At first only {@link COLLAPSED_COUNT} options are shown, the button below shows the rest. If
 * the current variant would be hidden, the list starts expanded, so the selection is always
 * visible.
 *
 * Renders nothing when the product has no other variants.
 *
 * @example
 * ```vue
 * <VariantPicker :variants="variants" :current-id="product.id" />
 * ```
 */
import { computed, ref, useId, type PropType } from 'vue'
import { faChevronDown, faChevronUp, faCircleCheck } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import type { ProductVariant } from '@product-explorer/core'
import { BaseButton } from '@/components/BaseButton'
import { currentLanguage, t } from '@/i18n'
import { PRODUCT_ROUTE } from '@/router/route-names'

/** Options shown before "Show more": one row in the mockup. */
const COLLAPSED_COUNT = 5

const props = defineProps({
  /** All variants, including the current product, as the API returns them */
  variants: {
    type: Array as PropType<readonly ProductVariant[]>,
    required: true,
  },
  /** Product id of the product on this page */
  currentId: {
    type: String,
    required: true,
  },
})

const headingId = useId()
const listId = useId()

/** Shortest cable first; variants without a length at the end, in API order. */
const sortedVariants = computed(() =>
  [...props.variants].sort((a, b) => (a.cableLength ?? Infinity) - (b.cableLength ?? Infinity)),
)

/** All variants are cable lengths: then the picker talks about lengths. */
const isCableLength = computed(() =>
  sortedVariants.value.every((variant) => variant.cableLength !== null),
)

const title = computed(() =>
  isCableLength.value ? t('variants.cableLength') : t('variants.title'),
)

const countText = computed(() => {
  const count = sortedVariants.value.length
  return isCableLength.value
    ? t('variants.lengthsAvailable', { count })
    : t('variants.variantsAvailable', { count })
})

const currentIndex = computed(() =>
  sortedVariants.value.findIndex((variant) => variant.id === props.currentId),
)

const expanded = ref(currentIndex.value >= COLLAPSED_COUNT)

const visibleVariants = computed(() =>
  expanded.value ? sortedVariants.value : sortedVariants.value.slice(0, COLLAPSED_COUNT),
)

const hiddenCount = computed(() => sortedVariants.value.length - COLLAPSED_COUNT)

const currentLabel = computed(() => {
  const current = sortedVariants.value[currentIndex.value]
  return current ? labelOf(current) : props.currentId
})

/** "2 m" (with the decimal mark of the UI language, "0,7 m" in German), or the description. */
function labelOf(variant: ProductVariant): string {
  if (variant.cableLength === null) {
    return variant.description
  }
  return `${variant.cableLength.toLocaleString(currentLanguage())} m`
}
</script>

<style scoped lang="scss">
.variant-picker {
  display: grid;
  gap: var(--space-3);

  &__header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-1) var(--space-3);
  }

  &__title {
    margin: 0;
    color: var(--color-text);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
  }

  &__count {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  &__options {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr)); // five per row in the mockup
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__option {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    height: 100%;
    min-height: 2.75rem; // 44px, also a comfortable touch target
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    text-align: center;
    text-decoration: none;
    transition:
      border-color 150ms ease,
      background-color 150ms ease;

    &:hover {
      border-color: var(--color-text);
    }

    // The current variant: orange frame (2px look without moving the layout) and a light tint
    &--current,
    &--current:hover {
      border-color: var(--color-primary-text);
      background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
      box-shadow: inset 0 0 0 1px var(--color-primary-text);
      color: var(--color-primary-text);
    }
  }

  &__check {
    width: var(--icon-size-md);
    height: var(--icon-size-md);
    color: var(--color-primary);
  }

  &__selected {
    margin: 0;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  &__selected-value {
    color: var(--color-text-secondary);
  }
}
</style>

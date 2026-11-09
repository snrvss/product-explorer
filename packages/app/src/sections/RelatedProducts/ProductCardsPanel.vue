<template>
  <div class="product-cards-panel">
    <!-- Loading the list: placeholders in the shape of the cards -->
    <div v-if="loading" class="product-cards-panel__placeholders">
      <span class="visually-hidden" role="status">{{ texts.loading }}</span>
      <Skeleton v-for="index in 4" :key="index" height="18rem" />
    </div>

    <!-- The list failed: illustration, message, and "Try again" when that can help -->
    <StatusCard
      v-else-if="error"
      kind="error"
      :title="t('common.errorTitle')"
      :text="texts.loadFailed"
      :retryable="retryable"
      @retry="emit('retry')"
    />

    <!-- Nothing to show -->
    <StatusCard v-else-if="cards.length === 0" :title="texts.emptyTitle" :text="texts.empty" />

    <!-- The cards; each loads its details on its own -->
    <template v-else>
      <!-- Announced politely to screen readers as cards arrive or fail -->
      <p class="product-cards-panel__progress" aria-live="polite">{{ texts.progress }}</p>
      <CardGrid :cards="cards" @retry="emit('retryCard', $event)" />
      <!-- Next page of cards -->
      <div v-if="hasMore" class="product-cards-panel__more">
        <BaseButton variant="outlined" @click="emit('loadMore')">
          <template #leading>
            <FontAwesomeIcon :icon="faPlus" />
          </template>
          {{ texts.loadMore }}
        </BaseButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * One tab of "Complete your setup": a list of product cards with its loading, error and empty
 * states, the progress line and "Load more". Used for the accessories and the category products.
 *
 * @remarks
 * Only shows what it gets; `RelatedProducts` maps the matching store to these props and handles
 * the events. All texts come translated, so the same panel fits both lists.
 *
 * @example
 * ```vue
 * <ProductCardsPanel
 *   :loading="store.isLoading"
 *   :error="store.error !== null"
 *   :retryable="store.error?.retryable"
 *   :cards="cards"
 *   :has-more="store.hasMore"
 *   :texts="texts"
 *   @retry="store.retry()"
 *   @retry-card="store.retryCard"
 *   @load-more="store.loadMore()"
 * />
 * ```
 */
import type { PropType } from 'vue'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { BaseButton } from '@/components/BaseButton'
import { Skeleton } from '@/components/Skeleton'
import { StatusCard } from '@/components/StatusCard'
import { t } from '@/i18n'
import CardGrid, { type CardItem } from '@/sections/RelatedProducts/CardGrid.vue'

/** The panel's texts, already translated. */
export interface ProductCardsPanelTexts {
  /** Read by screen readers while the list loads */
  loading: string
  /** Text of the error card */
  loadFailed: string
  /** Title of the empty card */
  emptyTitle: string
  /** Text of the empty card */
  empty: string
  /** Progress line, e.g. "4 of 377 loaded · 0 failed" */
  progress: string
  /** Label of the "Load more" button */
  loadMore: string
}

defineProps({
  /** The list itself is loading */
  loading: {
    type: Boolean,
    default: false,
  },
  /** The list failed */
  error: {
    type: Boolean,
    default: false,
  },
  /** The failure can be retried, so the error card offers "Try again" */
  retryable: {
    type: Boolean,
    default: false,
  },
  /** The visible cards */
  cards: {
    type: Array as PropType<CardItem[]>,
    required: true,
  },
  /** More cards can be loaded */
  hasMore: {
    type: Boolean,
    default: false,
  },
  texts: {
    type: Object as PropType<ProductCardsPanelTexts>,
    required: true,
  },
})

const emit = defineEmits<{
  /** "Try again" on the error card: load the list again */
  retry: []
  /** "Try again" on one failed card */
  retryCard: [productId: string]
  /** "Load more" was clicked */
  loadMore: []
}>()
</script>

<style scoped lang="scss">
@use 'breakpoints' as *;

.product-cards-panel {
  // Same columns as the card grid: 1 / 2 / 4
  &__placeholders {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-4);

    @include from('tablet') {
      grid-template-columns: repeat(2, 1fr);
    }

    @include from('desktop') {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  &__progress {
    margin: 0 0 var(--space-4);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  &__more {
    display: flex;
    justify-content: center;
    margin-top: var(--space-6);
  }
}
</style>

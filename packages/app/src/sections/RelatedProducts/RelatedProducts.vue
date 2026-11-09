<template>
  <section class="related-products" :aria-labelledby="headingId">
    <!-- Full-width tinted band; the heading names the section for screen readers -->
    <!-- Limits the content to the page width, like the rest of the page -->
    <div class="related-products__inner">
      <!-- Heading "Complete your setup" and the line below it -->
      <header class="related-products__header">
        <h2 :id="headingId" class="related-products__title">{{ t('relatedProducts.title') }}</h2>
        <p class="related-products__subtitle">{{ t('relatedProducts.subtitle') }}</p>
      </header>

      <!-- Two tabs: accessories of the product, products of the same category -->
      <Tabs v-model="activeTab" :tabs="tabs" :label="t('relatedProducts.tabsLabel')">
        <!-- Icon before each tab label: wrench for accessories, grid for the category -->
        <template #icon="{ tab }">
          <FontAwesomeIcon :icon="TAB_ICONS[tab.id as TabId]" />
        </template>

        <!-- Accessories, from the accessories store -->
        <template #accessories>
          <ProductCardsPanel
            :loading="accessories.isLoading"
            :error="accessories.error !== null"
            :retryable="accessories.error?.retryable ?? false"
            :cards="accessoryCards"
            :has-more="accessories.hasMore"
            :texts="accessoryTexts"
            @retry="accessories.retry()"
            @retry-card="accessories.retryCard"
            @load-more="accessories.loadMore()"
          />
        </template>

        <!-- Same category, from the category store; it waits for the main product's category -->
        <template #category>
          <ProductCardsPanel
            :loading="!categoryOpened || productStore.isLoading || categoryProducts.isLoading"
            :error="categoryProducts.error !== null || productStore.error !== null"
            :retryable="categoryProducts.error?.retryable ?? false"
            :cards="categoryCards"
            :has-more="categoryProducts.hasMore"
            :texts="categoryTexts"
            @retry="categoryProducts.retry()"
            @retry-card="categoryProducts.retryCard"
            @load-more="categoryProducts.loadMore()"
          />
        </template>
      </Tabs>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * "Complete your setup": the accessories and the products of the same category below the main
 * product, in two tabs.
 *
 * @remarks
 * A section, not a component: it knows the app's texts and stores, and turns their data into props
 * for the reusable components (`Tabs`, `Card`, `StatusCard`, `BaseButton`). Both tabs use the
 * same `ProductCardsPanel` (loading, error, empty, progress, cards, "Load more").
 *
 * It is the only place that starts these two stores, and cancels them when it is removed:
 * - accessories: `accessoriesStore.load()` for the product id, country and language it gets,
 *   again whenever one of them changes
 * - same category: lazily, only after its tab was opened the first time; then
 *   `categoryProductsStore.load()` as soon as the product store has the main product (its
 *   `categoryId`), again when it or the locale changes. The main product is left out.
 *
 * Each card shows its own state: loading, the product (name = product type, image), an error with
 * "Try again", or "No longer available".
 */
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { faTableCellsLarge, faWrench, type IconDefinition } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Tabs, type TabItem } from '@/components/Tabs'
import { t } from '@/i18n'
import type { CardItem } from '@/sections/RelatedProducts/CardGrid.vue'
import ProductCardsPanel, {
  type ProductCardsPanelTexts,
} from '@/sections/RelatedProducts/ProductCardsPanel.vue'
import {
  type ProductCardState,
  useAccessoriesStore,
  useCategoryProductsStore,
  useProductStore,
} from '@/stores'

const props = defineProps({
  /** Product id of the main product, from the URL */
  productId: {
    type: String,
    required: true,
  },
  /** Country code from the URL, e.g. `de` */
  country: {
    type: String,
    required: true,
  },
  /** Language code from the URL, e.g. `en` */
  language: {
    type: String,
    required: true,
  },
})

type TabId = 'accessories' | 'category'

const TAB_ICONS: Record<TabId, IconDefinition> = {
  accessories: faWrench,
  category: faTableCellsLarge,
}

const headingId = useId()

const tabs = computed<TabItem[]>(() => [
  { id: 'accessories', label: t('accessories.title') },
  { id: 'category', label: t('categoryProducts.tab') },
])

const activeTab = ref<TabId>('accessories')

const accessories = useAccessoriesStore()

watch(
  () => [props.productId, props.country, props.language] as const,
  ([productId, country, language]) => {
    void accessories.load(productId, { country, language })
  },
  { immediate: true },
)

const productStore = useProductStore()
const categoryProducts = useCategoryProductsStore()

/**
 * The category tab was opened at least once. Only then are its products loaded, so the first view
 * of a page saves the category list and its card requests; most visitors look at the accessories.
 * Once opened, the tab stays active and follows product and language changes.
 */
const categoryOpened = ref(activeTab.value === 'category')

watch(activeTab, (tab) => {
  if (tab === 'category') {
    categoryOpened.value = true
  }
})

// One getter per value, so Vue compares the values themselves: the category is loaded again only
// when one of them really changes, not every time the product store updates.
watch(
  [
    () => categoryOpened.value,
    () => productStore.product?.id,
    () => productStore.product?.categoryId,
    () => props.country,
    () => props.language,
  ],
  ([opened, mainProductId, categoryId, country, language]) => {
    if (!opened) {
      return // not needed yet: nothing is requested until the tab is opened
    }
    if (mainProductId && categoryId) {
      void categoryProducts.load(categoryId, mainProductId, { country, language })
    } else {
      categoryProducts.cancel() // no main product (yet): nothing to compare with
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  accessories.cancel()
  categoryProducts.cancel()
})

/** The visible accessories as card props. */
const accessoryCards = computed<CardItem[]>(() =>
  accessories.visibleIds.map((productId) => toCardItem(productId, accessories.cards[productId])),
)

/** The visible products of the same category as card props. */
const categoryCards = computed<CardItem[]>(() =>
  categoryProducts.visibleIds.map((productId) =>
    toCardItem(productId, categoryProducts.cards[productId]),
  ),
)

/**
 * The progress line, e.g. "4 of 377 loaded". "· 2 failed" is only added when cards failed: it is
 * how screen readers hear about failed cards, but "0 failed" would only be noise.
 */
function progressText(
  section: 'accessories' | 'categoryProducts',
  stats: { loaded: number; total: number; failed: number },
): string {
  return stats.failed > 0
    ? t(`${section}.progressWithFailed`, stats)
    : t(`${section}.progress`, stats)
}

const accessoryTexts = computed<ProductCardsPanelTexts>(() => ({
  loading: t('accessories.loading'),
  loadFailed: t('accessories.loadFailed'),
  emptyTitle: t('accessories.emptyTitle'),
  empty: t('accessories.empty'),
  progress: progressText('accessories', accessories.stats),
  loadMore: t('accessories.loadMore'),
}))

const categoryTexts = computed<ProductCardsPanelTexts>(() => ({
  loading: t('categoryProducts.loading'),
  loadFailed: t('categoryProducts.loadFailed'),
  emptyTitle: t('categoryProducts.emptyTitle'),
  empty: t('categoryProducts.empty'),
  progress: progressText('categoryProducts', categoryProducts.stats),
  loadMore: t('categoryProducts.loadMore'),
}))

/** One card's props from its state in a store; the card calls a loaded product "ready". */
function toCardItem(productId: string, card: ProductCardState | undefined): CardItem {
  switch (card?.status) {
    case 'success':
      return {
        productId,
        name: card.product.headline,
        image: card.product.image,
        status: 'ready',
      }
    case 'error':
      return { productId, status: 'error' }
    case 'unavailable':
      return { productId, status: 'unavailable' }
    default:
      return { productId, status: 'loading' }
  }
}
</script>

<style scoped lang="scss">
.related-products {
  background: var(--color-background-alt);

  &__inner {
    display: grid;
    gap: var(--space-6);
    max-width: var(--container-max);
    margin-inline: auto;
    padding: var(--space-12) var(--container-padding);
  }

  &__header {
    display: grid;
    gap: var(--space-2);
  }

  &__title {
    margin: 0;
    color: var(--color-text);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-extrabold);
    letter-spacing: var(--letter-spacing-display);
    line-height: var(--line-height-tight);
  }

  &__subtitle {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-md);
  }
}
</style>

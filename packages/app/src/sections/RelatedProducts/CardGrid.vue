<template>
  <ul class="card-grid">
    <!-- A list, so screen readers announce how many products there are -->
    <!-- One item per product; the product id is the key, so cards keep their state -->
    <li v-for="card in cards" :key="card.productId" class="card-grid__item">
      <!-- v-bind passes only the fields that are set; the card's defaults cover the rest.
           The link keeps the current country and language. -->

      <Card
        v-bind="card"
        :to="{ name: PRODUCT_ROUTE, params: { productId: card.productId } }"
        @retry="emit('retry', card.productId)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
/**
 * Responsive grid of product cards: one column on mobile, two on tablets, four on desktop.
 *
 * @remarks
 * A list (`<ul>`), so screen readers announce how many products there are. The links use the
 * named product route without country and language: vue-router keeps the current ones, so the
 * user stays in their language.
 */
import type { PropType } from 'vue'
import type { ProductImage } from '@product-explorer/core'
import { Card } from '@/components/Card'
import { PRODUCT_ROUTE } from '@/router/route-names'

/** What one card shows. */
export interface CardItem {
  /** Product id */
  productId: string
  /** Product name; only shown when `ready` */
  name?: string
  /** Product image, or `null` if the product has none */
  image?: ProductImage | null
  /** Loading state of this card. Default `ready`. */
  status?: 'loading' | 'ready' | 'error' | 'unavailable'
}

defineProps({
  /** The cards, in display order */
  cards: {
    type: Array as PropType<CardItem[]>,
    required: true,
  },
})

const emit = defineEmits<{
  /** "Try again" was clicked on the card with this product id */
  retry: [productId: string]
}>()
</script>

<style scoped lang="scss">
@use 'breakpoints' as *;

.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;

  @include from('tablet') {
    grid-template-columns: repeat(2, 1fr);
  }

  @include from('desktop') {
    grid-template-columns: repeat(4, 1fr);
  }

  &__item {
    display: flex; // cards in a row get the same height

    > * {
      flex: 1;
    }
  }
}
</style>

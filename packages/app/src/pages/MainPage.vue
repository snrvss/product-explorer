<template>
  <main class="main-page">
    <!-- Trail above the product: Home › Products / product id from the URL -->
    <div class="main-page__breadcrumbs">
      <Breadcrumbs :items="breadcrumbs" />
    </div>

    <!-- Picture, information and key features of the product; loads it from the URL values -->
    <MainProduct :product-id="productId" :country="country" :language="language" />

    <!-- "Complete your setup": accessories and products of the same category; loads them itself -->
    <RelatedProducts :product-id="productId" :country="country" :language="language" />
  </main>
</template>

<script setup lang="ts">
/**
 * Product detail page: the main product on top, accessories and category products below.
 *
 * @remarks
 * The router passes the URL parameters in as props. The sections limit their own width, so they
 * can span the full page for their backgrounds.
 *
 * The page only reads the URL and passes product id, country and language to the sections.
 * Each section loads its own data from its store (and cancels it when it is removed), so every
 * store is started in exactly one place and nothing is requested twice.
 */
import { computed } from 'vue'
import { faHouse } from '@fortawesome/free-solid-svg-icons'
import { Breadcrumbs, type BreadcrumbItem } from '@/components/Breadcrumbs'
import { t } from '@/i18n'
import { MainProduct } from '@/sections/MainProduct'
import { RelatedProducts } from '@/sections/RelatedProducts'

const props = defineProps<{
  /** Country code from the URL, e.g. `de` */
  country: string
  /** Language code from the URL, e.g. `de` */
  language: string
  /** Product id from the URL, e.g. `PRD-1001` (not validated yet) */
  productId: string
}>()

/**
 * Home leads to the home route `/` (the default product in the user's language). "Products" is
 * plain text, because there is no product overview page; the API gives no category names, so
 * the mockup's category entry is left out.
 */
const breadcrumbs = computed<BreadcrumbItem[]>(() => [
  { label: t('breadcrumbs.home'), to: '/', icon: faHouse },
  { label: t('breadcrumbs.products') },
  { label: props.productId },
])
</script>

<style scoped lang="scss">
.main-page {
  // Same width as the sections below; the product section adds its own space underneath
  &__breadcrumbs {
    max-width: var(--container-max);
    margin-inline: auto;
    padding: var(--space-6) var(--container-padding) 0;
  }
}
</style>

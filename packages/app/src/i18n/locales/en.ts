import type { MessageSchema } from '@/i18n/locales/de'

/**
 * English UI texts. Typed as {@link MessageSchema}, so a missing or misspelled key fails the
 * typecheck.
 */
const en: MessageSchema = {
  mainProduct: {
    keyFeatures: 'Key features',
    viewOnWebsite: 'View on website',
    copyId: 'Copy product ID',
    copied: 'Copied',
    copiedAnnouncement: 'Product ID {productId} was copied.',
    copyFailed: 'Could not copy',
    enlargeImage: 'Enlarge image: {name}',
    closeImage: 'Close',
    noImage: 'No image available',
    imageFailed: 'The image could not be loaded.',
    loading: 'Loading product …',
    slow: 'Loading the product data is taking longer than usual …',
    invalidId: '“{productId}” is not a valid product ID (e.g. PRD-1001).',
    notFound: 'Product “{productId}” was not found.',
    loadFailed: 'The product data could not be loaded. Please check your connection.',
    timeout: 'Loading the product data is taking too long. Please try again.',
  },
  accessories: {
    title: 'Accessories',
    loading: 'Loading accessories …',
    loadFailed: 'The accessories could not be loaded.',
    emptyTitle: 'No accessories',
    empty: 'There are no accessories for this product.',
    progress: '{loaded} of {total} loaded',
    progressWithFailed: '{loaded} of {total} loaded · {failed} failed',
    loadMore: 'Load more accessories',
  },
  categoryProducts: {
    title: 'Products in the same category',
    tab: 'Same category',
    loading: 'Loading products in the same category …',
    loadFailed: 'The products in the same category could not be loaded.',
    emptyTitle: 'No other products',
    empty: 'There are no other products in this category.',
    progress: '{loaded} of {total} loaded',
    progressWithFailed: '{loaded} of {total} loaded · {failed} failed',
    loadMore: 'Load more products',
  },
  variants: {
    cableLength: 'Cable length',
    title: 'Variants',
    lengthsAvailable: '{count} lengths available',
    variantsAvailable: '{count} variants available',
    showMore: 'Show {count} more variants',
    showLess: 'Show fewer variants',
    selected: 'Selected:',
  },
  breadcrumbs: {
    label: 'Breadcrumb',
    home: 'Home',
    products: 'Products',
  },
  relatedProducts: {
    title: 'Complete your setup',
    subtitle: 'Find the right accessories and explore similar products.',
    tabsLabel: 'Related products',
  },
  productCard: {
    viewProduct: 'View product',
    detailsFailed: 'Details could not be loaded',
    unavailable: 'No longer available',
    priceOnRequest: 'Price on request',
  },
  theme: {
    switchToDark: 'Switch to dark mode',
    switchToLight: 'Switch to light mode',
  },
  language: {
    change: 'Change language',
  },
  common: {
    retry: 'Try again',
    errorTitle: 'Something went wrong',
    notFoundTitle: 'Nothing found',
    retryAll: 'Try all again',
  },
}

export default en

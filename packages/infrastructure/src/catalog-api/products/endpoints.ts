/*
 * Paths of the catalog API endpoints, relative to the RestClient's base URL.
 * Country and language are part of the base URL, e.g. `/api/de/en/`.
 */

/**
 * Builds the endpoint paths with encoded parameters.
 */
export const productEndpoints = {
  /** `GET products/{productId}` */
  product: (productId: string) => `products/${encodeURIComponent(productId)}`,

  /** `GET products/{productId}/accessories` */
  accessories: (productId: string) => `products/${encodeURIComponent(productId)}/accessories`,

  /** `GET categories/{categoryId}/products` */
  categoryProducts: (categoryId: string) => `categories/${encodeURIComponent(categoryId)}/products`,

  /** `GET products/{productId}/variants` */
  variants: (productId: string) => `products/${encodeURIComponent(productId)}/variants`,
} as const

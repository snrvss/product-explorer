/**
 * Product id format: three upper-case letters, a dash and four digits, e.g. `PRD-1001`.
 *
 * @remarks
 * The only place the format is defined. Changing it here (and in its tests) changes it for the
 * whole app: services, adapters and the error message in the UI all go through this pattern.
 */
export const PRODUCT_ID_PATTERN = /^[A-Z]{3}-\d{4}$/

/**
 * A product id (e.g. `PRD-1001`) that has passed validation.
 *
 * @remarks
 * At runtime it is a plain string; the brand only exists for TypeScript,
 * so a raw `string` can't be passed where a `ProductId` is expected.
 * Create one with {@link tryToProductId}.
 */
export type ProductId = string & { readonly __brand: 'ProductId' }

export * from '@/fields/product-id/convert'

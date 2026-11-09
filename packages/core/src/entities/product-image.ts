/**
 * Square edge lengths in px that the catalog delivers images in.
 */
export type ProductImageSize = 140 | 200 | 300 | 400

/**
 * Product image in several sizes.
 */
export interface ProductImage {
  /** Image URL per {@link ProductImageSize}, used for `srcset` */
  readonly sizes: Readonly<Record<ProductImageSize, string>>
}

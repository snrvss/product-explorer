import type { Price } from '@/entities/price'
import type { ProductId } from '@/fields'
import type { ProductImage } from '@/entities/product-image'

/**
 * A product with its full details.
 *
 * @remarks
 * Used for the main product and for each related product once its details have loaded.
 */
export interface Product {
  /** Product id, e.g. `PRD-1001` */
  readonly id: ProductId
  /** Display title, usually the product id */
  readonly title: string
  /** Product type, e.g. `"Inductive proximity sensor"` */
  readonly headline: string
  /** One-line technical summary */
  readonly shortDescription: string
  /** Key features */
  readonly bulletPoints: readonly string[]
  /** `null` if the API has no image for this product */
  readonly image: ProductImage | null
  /** `null` if the product has no public price */
  readonly price: Price | null
  /**
   * The price as the catalog displays it, e.g. `"84,90 €"`; `null` exactly when {@link Product.price} is.
   * The catalog formats it for the country in the URL, not for the language.
   */
  readonly formattedPrice: string | null
  /** Category id, used to load products of the same category */
  readonly categoryId: string
  /** Path of the product page on the catalog website, e.g. `/products/PRD-1001` */
  readonly detailUrl: string
}

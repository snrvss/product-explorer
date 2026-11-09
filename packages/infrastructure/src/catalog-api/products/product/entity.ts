import type { PriceDto } from '@/catalog-api/products/entity'

/**
 * Response of `GET products/{productId}`, reduced to the fields the adapter reads.
 *
 * @remarks
 * Unknown ids answer `404`. Optional fields are typed as nullable, because the core model allows
 * them to be missing.
 */
export interface ProductDto {
  /** Product id, e.g. `"PRD-1001"` */
  readonly id: string
  /** Display title, usually the product id again */
  readonly title: string
  /** Product type, e.g. `"Inductive proximity sensor"` */
  readonly type: string
  /** Technical summary, e.g. `"Inductive proximity sensor; M12 x 1 housing; …; M12 connector"` */
  readonly summary: string
  /** Key features */
  readonly features: readonly string[] | null
  /** Image URL per size, keys `"140"`, `"200"`, `"300"`, `"400"` */
  readonly images: Readonly<Record<string, unknown>> | null
  /** `null` if the product has no public price */
  readonly price: PriceDto | null
  /** Price as the catalog displays it, formatted for the URL's country, e.g. `"84,90 €"` */
  readonly formattedPrice: string | null
  /** Category id, e.g. `"inductive-sensors"` */
  readonly categoryId: string
  /** Path of the product page on the catalog website, e.g. `"/products/PRD-1001"` */
  readonly url: string
}

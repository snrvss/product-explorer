import type { AccessoryGroup, Product } from '@/entities'
import type { ProductSummary, ProductVariant } from '@/models'
import type { ProductPort, RequestOptions } from '@/ports'
import { AccessoryGroupsService } from '@/services/accessory-groups'
import { CategoryProductsService } from '@/services/category-products'
import { ProductService } from '@/services/product'
import { VariantsService } from '@/services/variants'

/**
 * Single entry point for the app to all core services.
 *
 * @remarks
 * Only forwards each call to the matching service. Validation, error handling and fetching stay
 * in the services; the façade adds no logic of its own, so it throws exactly what they throw.
 *
 * @example
 * ```ts
 * const productPort = new MockProductAdapter()
 * const services = createServices(productPort)
 * const product = await services.getProduct('PRD-1001', { signal })
 * ```
 */
export class Services {
  /**
   * @param productService - Loads single products
   * @param accessoryGroupsService - Loads the accessory groups of a product
   * @param categoryProductsService - Loads the products of a category
   * @param variantsService - Loads the variants of a product
   */
  constructor(
    private readonly productService: ProductService,
    private readonly accessoryGroupsService: AccessoryGroupsService,
    private readonly categoryProductsService: CategoryProductsService,
    private readonly variantsService: VariantsService,
  ) {}

  /**
   * Loads the full details of one product. Forwards to {@link ProductService.getProduct}.
   *
   * @param rawId - The product id, e.g. from the URL
   * @param opts - Optional {@link RequestOptions}
   * @returns The product
   * @throws {@link DomainError} - Thrown with the same errors as {@link ProductService.getProduct}.
   */
  getProduct(rawId: string, opts?: RequestOptions): Promise<Product> {
    return this.productService.getProduct(rawId, opts)
  }

  /**
   * Loads the accessory groups of a product. Forwards to {@link AccessoryGroupsService.getAccessoryGroups}.
   *
   * @param rawId - The product whose accessories to load
   * @param opts - Optional {@link RequestOptions}
   * @returns The groups, or an empty array if the product has no accessories
   * @throws {@link DomainError} - Thrown with the same errors as {@link AccessoryGroupsService.getAccessoryGroups}.
   */
  getAccessoryGroups(rawId: string, opts?: RequestOptions): Promise<AccessoryGroup[]> {
    return this.accessoryGroupsService.getAccessoryGroups(rawId, opts)
  }

  /**
   * Loads the products of a category. Forwards to {@link CategoryProductsService.getCategoryProducts}.
   *
   * @param categoryId - The category id, usually {@link Product.categoryId}
   * @param opts - Optional {@link RequestOptions}
   * @returns The products in API order, never empty
   * @throws {@link DomainError} - Thrown with the same errors as {@link CategoryProductsService.getCategoryProducts}.
   */
  getCategoryProducts(categoryId: string, opts?: RequestOptions): Promise<ProductSummary[]> {
    return this.categoryProductsService.getCategoryProducts(categoryId, opts)
  }

  /**
   * Loads the variants of a product. Forwards to {@link VariantsService.getVariants}.
   *
   * @param rawId - The product whose variants to load
   * @param opts - Optional {@link RequestOptions}
   * @returns The variants including the product itself, or an empty array if there are none
   * @throws {@link DomainError} - Thrown with the same errors as {@link VariantsService.getVariants}.
   */
  getVariants(rawId: string, opts?: RequestOptions): Promise<ProductVariant[]> {
    return this.variantsService.getVariants(rawId, opts)
  }
}

/**
 * Creates the service facade and its services using the same product adapter.
 *
 * @param productPort - The adapter used to retrieve product data
 * @returns The single entry point for the app's product services
 */
export function createServices(productPort: ProductPort): Services {
  return new Services(
    new ProductService(productPort),
    new AccessoryGroupsService(productPort),
    new CategoryProductsService(productPort),
    new VariantsService(productPort),
  )
}

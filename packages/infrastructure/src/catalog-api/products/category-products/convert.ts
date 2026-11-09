import type { ProductSummary } from '@product-explorer/core'
import type { CategoryProductsDto } from './entity'
import {
  convertPrice,
  expectArray,
  expectObject,
  expectProductId,
  optionalPrice,
  requireString,
} from '@/catalog-api/products/convert'

/**
 * Root label used to build validation error paths: `"categoryProducts"` for the response itself,
 * e.g. `"categoryProducts.products[0].price"` for a nested field.
 */
export const RESPONSE_PATH = 'categoryProducts'

/**
 * Step 1: checks the response of `GET categories/{categoryId}/products` at runtime and returns it
 * as {@link CategoryProductsDto}, keeping the API's field names.
 *
 * @param dto - Parsed JSON body of a `2xx` response
 * @returns The checked response
 * @throws {@link InvalidResponseError} - Thrown if the body or a field has the wrong shape.
 */
export function readCategoryProducts(dto: unknown): CategoryProductsDto {
  const object = expectObject(dto, RESPONSE_PATH)

  // This checks the array; it hasn't checked its entries yet.
  const products = expectArray(object['products'], `${RESPONSE_PATH}.products`)

  const checkedProducts = products.map((item, index) => {
    const errorPath = `${RESPONSE_PATH}.products[${index}]`
    const product = expectObject(item, errorPath)

    const id = requireString(product, 'id', errorPath)
    const type = requireString(product, 'type', errorPath)
    const price = optionalPrice(product, 'price', errorPath)

    // One checked product.
    return { id, type, price }
  })

  // The complete checked response.
  return { products: checkedProducts }
}

/**
 * Step 2: maps a checked {@link CategoryProductsDto} to core {@link ProductSummary}s, in API order.
 *
 * @remarks
 * The list can contain the product the category was requested for; removing it is up to the app.
 *
 * @param dto - The checked response from {@link readCategoryProducts}
 * @returns The summaries
 * @throws {@link InvalidResponseError} - Thrown if a product id is not a valid product id.
 */
export function convertCategoryProducts(dto: CategoryProductsDto): ProductSummary[] {
  const convertedProducts = dto.products.map((product, index) => {
    const errorPath = `${RESPONSE_PATH}.products[${index}]`

    const id = expectProductId(product.id, `${errorPath}.id`)
    const name = product.type
    const price = convertPrice(product.price)

    // One converted summary.
    return { id, name, price }
  })

  // The complete array of converted summaries.
  return convertedProducts
}

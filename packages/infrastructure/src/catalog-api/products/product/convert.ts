import type { Product, ProductImage } from '@product-explorer/core'
import type { ProductDto } from './entity'
import {
  convertPrice,
  expectObject,
  expectProductId,
  expectStringArray,
  optionalPrice,
  optionalString,
  requireString,
} from '@/catalog-api/products/convert'

/**
 * Root label used to build validation error paths: `"product"` for the response itself,
 * e.g. `"product.features[0]"` for a nested field.
 */
export const RESPONSE_PATH = 'product'

/**
 * Step 1: checks the response of `GET products/{productId}` at runtime and returns it as
 * {@link ProductDto}, keeping the API's field names.
 *
 * @param dto - Parsed JSON body of a `2xx` response
 * @returns The checked response
 * @throws {@link InvalidResponseError} - Thrown if the body or a field has the wrong shape.
 */
export function readProduct(dto: unknown): ProductDto {
  const object = expectObject(dto, RESPONSE_PATH)

  const id = requireString(object, 'id', RESPONSE_PATH)
  const title = requireString(object, 'title', RESPONSE_PATH)
  const type = requireString(object, 'type', RESPONSE_PATH)
  const summary = requireString(object, 'summary', RESPONSE_PATH)

  // Missing features become null.
  const rawFeatures = object['features']
  const features =
    rawFeatures === undefined || rawFeatures === null
      ? null
      : expectStringArray(rawFeatures, `${RESPONSE_PATH}.features`)

  // Missing image URLs become null.
  const rawImages = object['images']
  const images =
    rawImages === undefined || rawImages === null
      ? null
      : expectObject(rawImages, `${RESPONSE_PATH}.images`)

  const price = optionalPrice(object, 'price', RESPONSE_PATH)
  const formattedPrice = optionalString(object, 'formattedPrice', RESPONSE_PATH)
  const categoryId = requireString(object, 'categoryId', RESPONSE_PATH)
  const url = requireString(object, 'url', RESPONSE_PATH)

  // The checked response.
  return {
    id,
    title,
    type,
    summary,
    features,
    images,
    price,
    formattedPrice,
    categoryId,
    url,
  }
}

/**
 * Step 2: maps a checked {@link ProductDto} to the core {@link Product}.
 *
 * @param dto - The checked response from {@link readProduct}
 * @returns The product
 * @throws {@link InvalidResponseError} - Thrown if the product id is not a valid product id.
 */
export function convertProduct(dto: ProductDto): Product {
  const id = expectProductId(dto.id, `${RESPONSE_PATH}.id`)
  const title = dto.title
  const headline = dto.type
  const shortDescription = dto.summary

  // Missing features mean "no key features".
  const bulletPoints = dto.features ?? []
  const image = toImage(dto.images)
  const price = convertPrice(dto.price)
  // Only shown together with a price; an empty text counts as missing.
  const formattedPrice = price && dto.formattedPrice?.trim() ? dto.formattedPrice : null

  const categoryId = dto.categoryId
  const detailUrl = dto.url

  // The converted product.
  return {
    id,
    title,
    headline,
    shortDescription,
    bulletPoints,
    image,
    price,
    formattedPrice,
    categoryId,
    detailUrl,
  }
}

/** All four sizes must be present, otherwise the product is shown without image. */
function toImage(urls: ProductDto['images']): ProductImage | null {
  if (!urls) {
    return null
  }
  const [s140, s200, s300, s400] = ['140', '200', '300', '400'].map((size) => urls[size])
  if (
    typeof s140 !== 'string' ||
    typeof s200 !== 'string' ||
    typeof s300 !== 'string' ||
    typeof s400 !== 'string'
  ) {
    return null
  }
  return { sizes: { 140: s140, 200: s200, 300: s300, 400: s400 } }
}

import type { ProductVariant } from '@product-explorer/core'
import type { VariantsDto } from './entity'
import {
  expectArray,
  expectObject,
  expectProductId,
  optionalNumber,
  requireString,
} from '@/catalog-api/products/convert'

/**
 * Root label used to build validation error paths: `"variants"` for the response itself,
 * e.g. `"variants.variants[0].cableLength"` for a nested field.
 */
export const RESPONSE_PATH = 'variants'

/**
 * Step 1: checks the response of `GET products/{productId}/variants` at runtime and returns it as
 * {@link VariantsDto}, keeping the API's field names.
 *
 * @param dto - Parsed JSON body of a `2xx` response
 * @returns The checked response
 * @throws {@link InvalidResponseError} - Thrown if the body or an entry has the wrong shape.
 */
export function readVariants(dto: unknown): VariantsDto {
  const object = expectObject(dto, RESPONSE_PATH)

  // This checks the array; it hasn't checked its entries yet.
  const variants = expectArray(object['variants'], `${RESPONSE_PATH}.variants`)

  const checkedVariants = variants.map((item, index) => {
    const errorPath = `${RESPONSE_PATH}.variants[${index}]`
    const variant = expectObject(item, errorPath)

    const id = requireString(variant, 'id', errorPath)
    const label = requireString(variant, 'label', errorPath)
    const cableLength = optionalNumber(variant, 'cableLength', errorPath)

    // One checked variant.
    return { id, label, cableLength }
  })

  // The complete checked response.
  return { variants: checkedVariants }
}

/**
 * Step 2: maps a checked {@link VariantsDto} to core {@link ProductVariant}s, in API order.
 *
 * @remarks
 * The list contains the requested product itself.
 *
 * @param dto - The checked response from {@link readVariants}
 * @returns The variants
 * @throws {@link InvalidResponseError} - Thrown if a product id is not a valid product id.
 */
export function convertVariants(dto: VariantsDto): ProductVariant[] {
  const convertedVariants = dto.variants.map((variant, index) => {
    const errorPath = `${RESPONSE_PATH}.variants[${index}]`

    const id = expectProductId(variant.id, `${errorPath}.id`)
    const description = variant.label
    const cableLength = variant.cableLength

    // One converted variant.
    return { id, description, cableLength }
  })

  // The complete array of converted variants.
  return convertedVariants
}

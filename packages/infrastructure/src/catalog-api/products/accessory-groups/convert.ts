import type { AccessoryGroup } from '@product-explorer/core'
import type { AccessoriesDto } from './entity'
import {
  expectArray,
  expectObject,
  expectProductId,
  expectStringArray,
  requireString,
} from '@/catalog-api/products/convert'

/**
 * Root label used to build validation error paths: `"accessories"` for the response itself,
 * e.g. `"accessories.groups[0].title"` for a nested field.
 */
export const RESPONSE_PATH = 'accessories'

/**
 * Step 1: checks the response of `GET products/{productId}/accessories` at runtime and returns it
 * as {@link AccessoriesDto}, keeping the API's field names.
 *
 * @param dto - Parsed JSON body of a `2xx` response
 * @returns The checked response
 * @throws {@link InvalidResponseError} - Thrown if the body or a field has the wrong shape.
 */
export function readAccessories(dto: unknown): AccessoriesDto {
  const object = expectObject(dto, RESPONSE_PATH)

  // This checks the array; it hasn't checked its entries yet.
  const groups = expectArray(object['groups'], `${RESPONSE_PATH}.groups`)

  const checkedGroups = groups.map((item, index) => {
    const errorPath = `${RESPONSE_PATH}.groups[${index}]`
    const group = expectObject(item, errorPath)

    const categoryId = requireString(group, 'categoryId', errorPath)
    const title = requireString(group, 'title', errorPath)
    const productIds = expectStringArray(group['productIds'], `${errorPath}.productIds`)

    // One checked group.
    return { categoryId, title, productIds }
  })

  // The complete checked response.
  return { groups: checkedGroups }
}

/**
 * Step 2: maps a checked {@link AccessoriesDto} to core {@link AccessoryGroup}s, in API order.
 *
 * @remarks
 * `groups: []` (product without accessories) becomes `[]`.
 *
 * @param dto - The checked response from {@link readAccessories}
 * @returns The groups
 * @throws {@link InvalidResponseError} - Thrown if a product id is not a valid product id.
 */
export function convertAccessories(dto: AccessoriesDto): AccessoryGroup[] {
  const convertedGroups = dto.groups.map((group, index) => {
    const errorPath = `${RESPONSE_PATH}.groups[${index}]`

    const categoryId = group.categoryId
    const headline = group.title
    const productIds = group.productIds.map((id) => expectProductId(id, `${errorPath}.productIds`))

    // One converted group.
    return { categoryId, headline, productIds }
  })

  // The complete array of converted groups.
  return convertedGroups
}

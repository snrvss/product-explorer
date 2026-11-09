import {
  InvalidResponseError,
  type Price,
  type ProductId,
  tryToProductId,
} from '@product-explorer/core'
import type { PriceDto } from './entity'
import type { RestResponse } from '@/rest-client'

/*
 * Runtime checks shared by the product operations. Parsed JSON is `unknown`; a TypeScript type
 * assertion would not check anything at runtime, so every field that is read goes through these.
 */

/** A parsed JSON object whose fields still have to be checked */
export type JsonObject = Readonly<Record<string, unknown>>

/**
 * @param value - Parsed JSON
 * @param errorPath - Field path included in validation error messages, e.g. `"product"`
 * @returns `value` as object
 * @throws {@link InvalidResponseError} - Thrown if `value` is not a plain object.
 */
export function expectObject(value: unknown, errorPath: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InvalidResponseError(`${errorPath}: expected an object`)
  }
  return value as JsonObject
}

/**
 * @param value - Parsed JSON
 * @param errorPath - Field path included in validation error messages, e.g. `"accessories.groups[0]"`
 * @returns `value` as array
 * @throws {@link InvalidResponseError} - Thrown if `value` is not an array.
 */
export function expectArray(value: unknown, errorPath: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new InvalidResponseError(`${errorPath}: expected an array`)
  }
  return value
}

/**
 * @param object - The object to read from
 * @param key - Field name
 * @param errorPath - Field path included in validation error messages, e.g. `"accessories.groups[0]"`
 * @returns The field value
 * @throws {@link InvalidResponseError} - Thrown if the field is missing or not a string.
 */
export function requireString(object: JsonObject, key: string, errorPath: string): string {
  const value = object[key]
  if (typeof value !== 'string') {
    throw new InvalidResponseError(`${errorPath}.${key}: expected a string`)
  }
  return value
}

/**
 * @param object - The object to read from
 * @param key - Field name
 * @param errorPath - Field path included in validation error messages, e.g. `"accessories.groups[0]"`
 * @returns The field value, or `null` if it is missing or `null`
 * @throws {@link InvalidResponseError} - Thrown if the field has another type than string.
 */
export function optionalString(object: JsonObject, key: string, errorPath: string): string | null {
  const value = object[key]
  if (value === undefined || value === null) {
    return null
  }
  if (typeof value !== 'string') {
    throw new InvalidResponseError(`${errorPath}.${key}: expected a string or null`)
  }
  return value
}

/**
 * @param object - The object to read from
 * @param key - Field name
 * @param errorPath - Field path included in validation error messages, e.g. `"accessories.groups[0]"`
 * @returns The field value, or `null` if it is missing or `null`
 * @throws {@link InvalidResponseError} - Thrown if the field has another type than finite number.
 */
export function optionalNumber(object: JsonObject, key: string, errorPath: string): number | null {
  const value = object[key]
  if (value === undefined || value === null) {
    return null
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new InvalidResponseError(`${errorPath}.${key}: expected a number or null`)
  }
  return value
}

/**
 * @param value - Parsed JSON
 * @param errorPath - Field path included in validation error messages, e.g. `"accessories.groups[0]"`
 * @returns `value` as array of strings
 * @throws {@link InvalidResponseError} - Thrown if `value` is not an array of strings.
 */
export function expectStringArray(value: unknown, errorPath: string): string[] {
  return expectArray(value, errorPath).map((item, index) => {
    if (typeof item !== 'string') {
      throw new InvalidResponseError(`${errorPath}[${index}]: expected a string`)
    }
    return item
  })
}

/**
 * @param object - The object to read from
 * @param key - Field name of the price object, e.g. `"price"`
 * @param errorPath - Field path included in validation error messages, e.g. `"product"`
 * @returns The checked price object, or `null` if it is missing or `null`
 * @throws {@link InvalidResponseError} - Thrown if the field is not an object with a numeric `amount` and a string `currency`.
 */
export function optionalPrice(object: JsonObject, key: string, errorPath: string): PriceDto | null {
  const value = object[key]
  if (value === undefined || value === null) {
    return null
  }
  const price = expectObject(value, `${errorPath}.${key}`)
  const amount = optionalNumber(price, 'amount', `${errorPath}.${key}`)
  if (amount === null) {
    throw new InvalidResponseError(`${errorPath}.${key}.amount: expected a number`)
  }
  const currency = requireString(price, 'currency', `${errorPath}.${key}`)
  return { amount, currency }
}

/**
 * Maps a checked {@link PriceDto} to the core {@link Price}.
 *
 * @param dto - The checked price, or `null`
 * @returns The price, or `null` ("no public price") if there is none or its currency is empty
 */
export function convertPrice(dto: PriceDto | null): Price | null {
  if (!dto || !dto.currency.trim()) {
    return null
  }
  return { amount: dto.amount, currency: dto.currency }
}

/**
 * @param value - An id from the payload
 * @param errorPath - Field path included in validation error messages, e.g. `"accessories.groups[0]"`
 * @returns The id as {@link ProductId}
 * @throws {@link InvalidResponseError} - Thrown if `value` is not a valid product id.
 */
export function expectProductId(value: unknown, errorPath: string): ProductId {
  if (typeof value !== 'string') {
    throw new InvalidResponseError(`${errorPath}: expected a product id`)
  }
  try {
    return tryToProductId(value)
  } catch (error) {
    throw new InvalidResponseError(`${errorPath}: "${value}" is not a valid product id`, {
      cause: error,
    })
  }
}

/**
 * Tells "nothing found" responses apart from real data.
 *
 * @remarks
 * "Not found" is `404`, or `400` for an id the API rejects. An empty `2xx` body is treated the
 * same, so a backend that answers unknown ids with `200` and no content also works. 5xx never get
 * here, the RestClient throws them.
 *
 * @param response - The response of the RestClient
 * @param errorPath - Field path included in validation error messages; here the endpoint label, e.g. `"accessories"`
 * @returns `true` for a "nothing found" response, `false` for a `2xx` response with a body
 * @throws {@link InvalidResponseError} - Thrown for any other status, e.g. `401` or `403`.
 */
export function isNotFound(response: RestResponse, errorPath: string): boolean {
  const { status, body } = response
  if (status === 400 || status === 404) {
    return true
  }
  if (status < 200 || status >= 300) {
    throw new InvalidResponseError(`${errorPath}: unexpected status ${status}`)
  }
  return body === undefined
}

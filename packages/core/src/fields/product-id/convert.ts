import { InvalidProductIdError } from '@/errors'
import { PRODUCT_ID_PATTERN, type ProductId } from '.'

/**
 * Validates a raw id and returns it as a clean {@link ProductId}.
 *
 * @remarks
 * Trims whitespace and normalizes to upper case, so `"prd-1001"` and `"PRD-1001"` are the same id.
 *
 * @param raw - The id as typed by the user or read from the URL
 * @returns The normalized id
 * @throws {@link InvalidProductIdError} - Thrown if `raw` does not match {@link PRODUCT_ID_PATTERN}.
 *
 * @example
 * ```ts
 * tryToProductId(' prd-1001 ') // 'PRD-1001'
 * tryToProductId('PRD1001')    // throws InvalidProductIdError
 * ```
 */
export function tryToProductId(raw: string): ProductId {
  const normalized = raw.trim().toUpperCase()
  if (!PRODUCT_ID_PATTERN.test(normalized)) {
    throw new InvalidProductIdError(raw)
  }
  return normalized as ProductId
}

/**
 * Type guard for values that are already a valid, normalized {@link ProductId}.
 *
 * @param value - Any value
 * @returns `true` if `value` matches {@link PRODUCT_ID_PATTERN} (which only allows upper case)
 */
export function isProductId(value: unknown): value is ProductId {
  return typeof value === 'string' && PRODUCT_ID_PATTERN.test(value)
}

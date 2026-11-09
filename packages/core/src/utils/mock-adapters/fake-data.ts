import type { AccessoryGroup, Product, ProductImage, ProductImageSize } from '@/entities'
import { tryToProductId } from '@/fields'
import type { ProductSummary, ProductVariant } from '@/models'

/*
 * Small, made-up test data. The ids are valid product ids, everything else is obviously fake.
 *
 * MAN-0001 ── accessories: ACC-0001, ACC-0002 (group "Cables"), ACC-0003 (group "Mounting")
 *        └─ category FAKE_CATEGORY: CAT-0001, MAN-0001, CAT-0002, CAT-0003 (contains MAN-0001 itself, like the real API)
 * NOA-0001 ── known product without accessories
 * ACC-0001, ACC-0002 ── cable length variants of each other (each list contains the product itself, like the real API)
 * CBL-0001 … CBL-0008 ── one fake cable in eight lengths (0.7 m … 15 m), all variants of each other
 */

/**
 * Creates a fake {@link Product} with defaults for every field except the id.
 *
 * @remarks
 * Unless given, `formattedPrice` is derived from the price in an obviously fake format
 * (`"10.00 EUR"`), and is `null` without a price, like the real API.
 *
 * @param overrides - The id and any fields that should differ from the defaults
 * @returns The fake product
 */
export function fakeProduct(overrides: Partial<Omit<Product, 'id'>> & { id: string }): Product {
  const { id, ...fields } = overrides
  const price = fields.price === undefined ? { amount: 10, currency: 'EUR' } : fields.price
  return {
    id: tryToProductId(id),
    title: id,
    headline: `Fake product ${id}`,
    shortDescription: `Short description of ${id}`,
    bulletPoints: [],
    image: null,
    price,
    formattedPrice: price === null ? null : `${price.amount.toFixed(2)} ${price.currency}`,
    categoryId: 'fake_other_category',
    detailUrl: `/product/${id}`,
    ...fields,
  }
}

/**
 * Creates an obviously fake {@link ProductImage}: a simple drawn "device" on white, with the id
 * and the pixel size written on it.
 *
 * @remarks
 * Each size is an SVG inside a `data:` URL, so it needs no network and no files. Like most real
 * product photos it has a white background, and every size shows the same picture; the size printed
 * on it shows which one the browser picked (e.g. the enlarged view should say "400 px").
 *
 * @param id - Shown on the picture, e.g. `MAN-0001`
 * @returns The fake image in all four sizes
 */
export function fakeImage(id: string): ProductImage {
  const url = (size: ProductImageSize): string => {
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 400 400">`,
      '<rect width="400" height="400" fill="#ffffff"/>',
      '<rect x="110" y="90" width="180" height="200" rx="14" fill="#475569"/>',
      '<rect x="110" y="90" width="120" height="200" rx="14" fill="#0f9488"/>',
      '<rect x="185" y="290" width="30" height="40" fill="#7b8798"/>',
      `<text x="200" y="365" font-family="sans-serif" font-size="26" text-anchor="middle" fill="#334155">${id} · fake photo · ${size} px</text>`,
      '</svg>',
    ].join('')
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  }
  return { sizes: { 140: url(140), 200: url(200), 300: url(300), 400: url(400) } }
}

/**
 * Creates a fake {@link ProductSummary} from a fake product.
 *
 * @param product - The product to summarize
 * @returns The summary
 */
export function fakeSummary(product: Product): ProductSummary {
  return { id: product.id, name: product.headline, price: product.price }
}

/** Category of {@link MAIN_PRODUCT} */
export const FAKE_CATEGORY_ID = 'fake_category'

/** Main product with accessories, a category and a (fake) image */
export const MAIN_PRODUCT = fakeProduct({
  id: 'MAN-0001',
  image: fakeImage('MAN-0001'),
  categoryId: FAKE_CATEGORY_ID,
  bulletPoints: ['Fake feature A', 'Fake feature B'],
  price: { amount: 100, currency: 'EUR' },
})

/** Known product without accessories */
export const NO_ACCESSORY_PRODUCT = fakeProduct({ id: 'NOA-0001' })

/** Accessories of {@link MAIN_PRODUCT} */
export const ACCESSORY_PRODUCTS = [
  fakeProduct({ id: 'ACC-0001', categoryId: 'fake_cables' }),
  fakeProduct({ id: 'ACC-0002', categoryId: 'fake_cables' }),
  fakeProduct({ id: 'ACC-0003', categoryId: 'fake_mounting', price: null }),
] as const

/** Other products in {@link FAKE_CATEGORY_ID} */
export const CATEGORY_PRODUCTS = [
  fakeProduct({ id: 'CAT-0001', categoryId: FAKE_CATEGORY_ID }),
  fakeProduct({ id: 'CAT-0002', categoryId: FAKE_CATEGORY_ID }),
  fakeProduct({ id: 'CAT-0003', categoryId: FAKE_CATEGORY_ID }),
] as const

/** Accessory groups of {@link MAIN_PRODUCT} */
export const FAKE_ACCESSORY_GROUPS: readonly AccessoryGroup[] = [
  {
    categoryId: 'fake_cables',
    headline: 'Cables',
    productIds: [ACCESSORY_PRODUCTS[0].id, ACCESSORY_PRODUCTS[1].id],
  },
  {
    categoryId: 'fake_mounting',
    headline: 'Mounting',
    productIds: [ACCESSORY_PRODUCTS[2].id],
  },
]

/** Products of {@link FAKE_CATEGORY_ID}, including {@link MAIN_PRODUCT} itself */
export const FAKE_CATEGORY_PRODUCTS: readonly ProductSummary[] = [
  fakeSummary(CATEGORY_PRODUCTS[0]),
  fakeSummary(MAIN_PRODUCT),
  fakeSummary(CATEGORY_PRODUCTS[1]),
  fakeSummary(CATEGORY_PRODUCTS[2]),
]

/** Cable length variants of the fake cables ACC-0001 and ACC-0002, sorted by length */
export const FAKE_CABLE_VARIANTS: readonly ProductVariant[] = [
  { id: ACCESSORY_PRODUCTS[0].id, description: 'Fake cable 2 m', cableLength: 2 },
  { id: ACCESSORY_PRODUCTS[1].id, description: 'Fake cable 5 m', cableLength: 5 },
]

/** Cable lengths in metres of the fake cable family {@link FAKE_CABLE_FAMILY} */
const FAKE_CABLE_LENGTHS = [0.7, 1, 2, 3, 4, 5, 10, 15] as const

/**
 * A fake cable in eight lengths (CBL-0001 = 0.7 m … CBL-0008 = 15 m), each a variant of the others.
 * Enough variants to try a variant picker with more than one row.
 */
export const FAKE_CABLE_FAMILY: readonly Product[] = FAKE_CABLE_LENGTHS.map((length, index) => {
  const id = `CBL-000${index + 1}`
  return fakeProduct({
    id,
    headline: 'Fake connection cable',
    shortDescription: `Fake connection cable; ${length} m; Fake socket`,
    bulletPoints: ['Fake cable feature A', 'Fake cable feature B'],
    image: fakeImage(id),
    price: { amount: 10 + length, currency: 'EUR' },
    categoryId: 'fake_cables',
  })
})

/** Variants of every cable in {@link FAKE_CABLE_FAMILY}, sorted by length */
export const FAKE_CABLE_FAMILY_VARIANTS: readonly ProductVariant[] = FAKE_CABLE_FAMILY.map(
  (product, index) => ({
    id: product.id,
    description: `Fake connection cable ${FAKE_CABLE_LENGTHS[index]} m`,
    cableLength: FAKE_CABLE_LENGTHS[index] ?? null,
  }),
)

/** All fake products, keyed by id */
export const fakeProducts: Readonly<Record<string, Product>> = Object.fromEntries(
  [
    MAIN_PRODUCT,
    NO_ACCESSORY_PRODUCT,
    ...ACCESSORY_PRODUCTS,
    ...CATEGORY_PRODUCTS,
    ...FAKE_CABLE_FAMILY,
  ].map((product) => [product.id, product]),
)

/** All fake accessory groups, keyed by product id. Products not listed have no accessories. */
export const fakeAccessoryGroups: Readonly<Record<string, readonly AccessoryGroup[]>> = {
  [MAIN_PRODUCT.id]: FAKE_ACCESSORY_GROUPS,
}

/** All fake category lists, keyed by category id */
export const fakeCategoryProducts: Readonly<Record<string, readonly ProductSummary[]>> = {
  [FAKE_CATEGORY_ID]: FAKE_CATEGORY_PRODUCTS,
}

/** All fake variant lists, keyed by product id. Products not listed have no variants. */
export const fakeVariants: Readonly<Record<string, readonly ProductVariant[]>> = {
  [ACCESSORY_PRODUCTS[0].id]: FAKE_CABLE_VARIANTS,
  [ACCESSORY_PRODUCTS[1].id]: FAKE_CABLE_VARIANTS,
  ...Object.fromEntries(
    FAKE_CABLE_FAMILY.map((product) => [product.id, FAKE_CABLE_FAMILY_VARIANTS]),
  ),
}

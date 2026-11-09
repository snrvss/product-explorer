# Technical Concept – Product Explorer

## Project name

**`product-explorer`**

## Description

A Vue 3 + TypeScript product detail page for an industrial sensor catalog. It shows one main
product (image, title, description, price, category) and below it two independent sections: its
**accessories** (grouped by headline) and the **other products of its category**. The focus is on
staying fast when the API is slow: only a few requests run at the same time, cards load page by
page and fill in one by one, outdated requests are cancelled, and each card has its own loading and
error state. If one card or one section fails, the rest of the page keeps working.

By default the app runs on a **fictional mock catalog** in local JSON files (30 products in 5
categories), so it needs no backend. A real catalog API can be plugged in through configuration
(`VITE_CATALOG_ADAPTER=http`) without touching core or the UI.

Architecture: hexagonal (ports & adapters) as an npm-workspaces monorepo:

```
packages/
  core/            # entities, errors, ports, services – plain TS, no Vue, no fetch
  infrastructure/  # adapters implementing the core port: mock catalog (JSON) and HTTP catalog API
  app/             # Vue 3 app: views, components, Pinia stores, composition root
```

Dependency rule: `app → core`, `app → infrastructure` (only in `app/src/api`, plus the demo-mode
test), `infrastructure → core`. **Core depends on nothing.**

**Imports:** inside a package, `@/…` means that package's own `src` (e.g. `@/fields` in core is
`packages/core/src/fields`). Other packages are imported by name (`@product-explorer/core`), never
with `@/`. Because the app compiles core's source directly, a plain Vite alias isn't enough:
`vite-plugin-src-alias.ts` resolves `@/` by the package of the importing file, and the app's and
infrastructure's `tsconfig.json` fall back to core's `src`. Consequence for TypeScript: **top-level
folders in `app/src` and `infrastructure/src` must not reuse a core folder name** (`fields`,
`entities`, `models`, `errors`, `ports`, `services`, `utils`), otherwise the type checker would pick
the wrong folder.

---

## Core (`packages/core`)

> Plain TypeScript with no Vue, no `fetch` and no API-specific field names.
> It defines **what** a product is, **what** the app needs from the outside world (ports), and
> **how** products, accessories, category products and variants get loaded (services).
> Everything here can be unit-tested with fake ports.

### Fields (`core/src/fields`)

Fields are primitive values that need validation. Each one is a **branded type**: a plain string at
runtime, but TypeScript only accepts it after it went through its `tryTo…` function.

| Field       | Type                                         | Validation                                                                                                                                                                                                                             |
| ----------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProductId` | `string & { readonly __brand: 'ProductId' }` | `tryToProductId(raw)` trims, converts to upper case, checks `PRODUCT_ID_PATTERN` (`^[A-Z]{3}-\d{4}$`, e.g. `PRD-1001`) and returns it as `ProductId`. Throws `InvalidProductIdError`. `isProductId(value)` is the matching type guard. |

The id format is defined in exactly one place (`fields/product-id`). Services, adapters and the
UI's error message all go through it, so changing the format is one regex and its tests.

### Entities and value types (`core/src/entities`)

| Entity           | Fields                                                                                                                                                                                                                                         | Notes                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Locale`         | `country: string`, `language: string`                                                                                                                                                                                                          | e.g. `de/de`, `de/en`; part of every catalog API path                                            |
| `Price`          | `amount: number`, `currency: string`                                                                                                                                                                                                           | Raw data. The display text is `Product.formattedPrice`, formatted by the catalog for the country |
| `ProductImage`   | `sizes: Record<140 \| 200 \| 300 \| 400, string>`                                                                                                                                                                                              | Image URLs per size, used for `srcset`                                                           |
| `Product`        | `id: ProductId`, `title: string`, `headline: string`, `shortDescription: string`, `bulletPoints: string[]`, `image: ProductImage \| null`, `price: Price \| null`, `formattedPrice: string \| null`, `categoryId: string`, `detailUrl: string` | Main product, and also each accessory / category product once its details have loaded            |
| `AccessoryGroup` | `categoryId: string`, `headline: string`, `productIds: ProductId[]`                                                                                                                                                                            | Accessories come back grouped and as IDs only                                                    |

### Models (`core/src/models`)

Shared plain TypeScript models (one folder each: `product-summary/`, `product-variant/`) for data
exchanged by the ports and services, rather than domain entities or UI state. `ProductSummary`
means a reduced product record, not description text. The infrastructure maps API responses to
these models.

| Model            | Fields / definition                                                   | Notes                                                                                                                 |
| ---------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ProductSummary` | `id: ProductId`, `name: string`, `price: Price \| null`               | Lightweight entry from the category list, which has **no image**                                                      |
| `ProductVariant` | `id: ProductId`, `description: string`, `cableLength: number \| null` | One variant of a product, e.g. the same cable in another length. A variant list contains the requested product itself |

`price: Price | null` is always present but can explicitly have no price. Loading, ready and error
states belong to the app's stores, not to these core models.

**No merged "related products" model.** Accessories and category products are shown as two
separate sections, so each section works directly with what its endpoint returns
(`AccessoryGroup[]` and `ProductSummary[]`). The only cleanup needed is removing the main product
from its own category list, which the category store does with one `filter`.

### Errors (`core/src/errors`)

Each error extends `DomainError`, which extends `Error` and exposes `code: string`,
`message: string` and `retryable: boolean`. `ServerError` also exposes `status: number`. The UI
uses `retryable` to decide whether to show a "Try again" button.

| Error                   | When                                                                                                                               | retryable |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `InvalidProductIdError` | ID fails `tryToProductId` (thrown by the field / service before any request)                                                       | ❌        |
| `ProductNotFoundError`  | Thrown by the **service** when the port returns `null` (unknown id, e.g. `PRD-1999`)                                               | ❌        |
| `CategoryNotFoundError` | Thrown by the **service** when the port returns an empty list (category empty, unknown or 404)                                     | ❌        |
| `NetworkError`          | `fetch` rejects (offline, DNS, CORS)                                                                                               | ✅        |
| `TimeoutError`          | No response within N ms (AbortController)                                                                                          | ✅        |
| `ServerError`           | 5xx or 429 (`status` is kept on the error)                                                                                         | ✅        |
| `InvalidResponseError`  | JSON parse fails or required fields are missing                                                                                    | ❌        |
| `RequestAbortedError`   | Caller cancelled, e.g. the user navigated to another product. **Never shown in the UI.**                                           | ❌        |
| `UnexpectedError`       | The port failed with something that is not a domain error (e.g. a bug). Created by `toDomainError`, original error kept as `cause` | ❌        |

`toDomainError(error)` (`errors/to-domain-error`) is used in every service's `catch`, so only the
error types above ever leave a service.

### Ports (`core/src/ports`)

"Nothing found" is a normal result of the port (`null` or an empty list), not an error. The
**services** decide which domain error that becomes. The port only throws what the services can't
detect themselves: transport errors, `InvalidResponseError` and `RequestAbortedError`.

```ts
export interface ProductPort {
  /**
   * @returns The product, or `null` if no product with this id exists
   * @throws {@link NetworkError} - Thrown if the server could not be reached.
   * @throws {@link TimeoutError} - Thrown if no response arrived in time.
   * @throws {@link ServerError} - Thrown for 5xx and 429 responses.
   * @throws {@link InvalidResponseError} - Thrown if the payload could not be mapped.
   * @throws {@link RequestAbortedError} - Thrown if `opts.signal` was aborted.
   */
  getProduct(id: ProductId, opts?: RequestOptions): Promise<Product | null>

  /**
   * @returns The groups, `[]` if the product has no accessories, or `null` if the product is unknown
   * @throws same as getProduct
   */
  getAccessoryGroups(id: ProductId, opts?: RequestOptions): Promise<AccessoryGroup[] | null>

  /**
   * @returns The products, or `[]` if the category is empty or unknown
   * @throws same as getProduct
   */
  getCategoryProducts(categoryId: string, opts?: RequestOptions): Promise<ProductSummary[]>

  /**
   * @returns The variants including the product itself, or `[]` (no variants or unknown product)
   * @throws same as getProduct
   */
  getVariants(id: ProductId, opts?: RequestOptions): Promise<ProductVariant[]>
}
```

### Services (`core/src/services`)

| Service                                                  | Responsibility                                                                                                                                                                                                                                                               | Throws / returns                                                                                                                                                                                                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProductService` (`services/product`)                    | Gets the `ProductPort` injected. `getProduct(rawId, opts?)` validates the id with `tryToProductId`, calls the port and throws `ProductNotFoundError` if the port returns `null`. Sharing one in-flight request between simultaneous calls for the same id was **not built**. | `async`. An invalid id rejects with `InvalidProductIdError` without calling the port. Every port error goes through `toDomainError`: domain errors unchanged, native `AbortError` → `RequestAbortedError`, anything else → `UnexpectedError`. |
| `AccessoryGroupsService` (`services/accessory-groups`)   | `getAccessoryGroups(rawId, opts?)` validates the id, calls the port and throws `ProductNotFoundError` if the port returns `null`. `[]` (no accessories) is a valid result.                                                                                                   | Same as above                                                                                                                                                                                                                                 |
| `CategoryProductsService` (`services/category-products`) | `getCategoryProducts(categoryId, opts?)` calls the port and throws `CategoryNotFoundError` if the list is empty.                                                                                                                                                             | `async`. Port errors go through `toDomainError` (see above)                                                                                                                                                                                   |
| `VariantsService` (`services/variants`)                  | `getVariants(rawId, opts?)` validates the id and calls the port. `[]` is a valid result, not an error: the port does not tell "no variants" from "unknown product".                                                                                                          | `async`. Port errors go through `toDomainError` (see above)                                                                                                                                                                                   |

**Planned but not built (deliberately, kept as next steps):**

- **`ProductBatchService`** (load a page of cards with a concurrency limit). The same job is done by
  `loadProductCards()` in `app/src/stores/product-cards` (worker pool, at most 4 requests at a time,
  one callback per card). Moving it into core would make it reusable outside Vue; for one app it
  was not worth the extra layer yet.
- **Automatic retries** (`withRetry` with backoff for retryable errors). Instead the user decides:
  every retryable error offers "Try again", per section and per card. Timeouts live in the
  `RestClient` (8 s).

---

## Infrastructure (`packages/infrastructure`)

> Adapters that implement the core port. Both speak the same **catalog API format** (defined in
> the `entity.ts` files) and share the same converters, so swapping one for the other changes
> nothing above this layer.

### Catalog API format

Base URL: `/api/{country}/{language}/` (in development forwarded to `VITE_CATALOG_API_URL`).

| #   | Endpoint                               | Used by                 | Response body                                                                                                                                                  |
| --- | -------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `GET products/{productId}`             | `fetchProduct`          | `{ id, title, type, summary, features[], images{140,200,300,400}, price{amount, currency}, formattedPrice, categoryId, url }`. Unknown id → 404.               |
| 2   | `GET products/{productId}/accessories` | `fetchAccessoryGroups`  | `{ groups: [{ categoryId, title, productIds[] }] }`. **IDs only**, so each accessory card needs a call to #1. No accessories → `groups: []`. Unknown id → 404. |
| 3   | `GET categories/{categoryId}/products` | `fetchCategoryProducts` | `{ products: [{ id, type, price }] }`, **no images**; contains the product the category was requested for. Unknown category → 404.                             |
| 4   | `GET products/{productId}/variants`    | `fetchVariants`         | `{ variants: [{ id, label, cableLength }] }`, contains the requested product itself. No variants → `variants: []`.                                             |

For every endpoint, `404`, `400` and an empty `2xx` body mean "not found" (`null` or `[]` as the
port defines). Any other unexpected status (e.g. 403) is an `InvalidResponseError`.

### Adapters

- **`RestClient`** (`src/rest-client`): wrapper around the native `fetch` for GET requests against
  one base URL that includes country and language (`/api/de/en/`). It has a configurable timeout
  (default 8 s) and keeps the caller's `AbortSignal` apart from its own timeout. Mapping: caller
  abort → `RequestAbortedError`, timeout → `TimeoutError`, `fetch` rejects → `NetworkError`,
  5xx/429 → `ServerError` (`fetch` itself never rejects for a status), 2xx with invalid JSON →
  `InvalidResponseError`. 2xx and 4xx are returned as `{ status, body }`, because only the endpoint
  knows what e.g. a 400 means.
- **`HttpCatalogAdapter implements ProductPort`** (`src/catalog-api/products`): gets the
  `RestClient` injected and delegates each method to one operation folder (`product`,
  `accessory-groups`, `category-products`, `variants`). Each operation folder has `index.ts`
  (request and status handling, path from `endpoints.ts` with encoded parameters, then
  `return convertX(readX(response.body))`), `entity.ts` (the response DTO types) and `convert.ts`
  with two steps: `readX(dto: unknown): XDto` checks the body at runtime with the shared helpers
  from `products/convert.ts` and returns the DTO with the API's field names; `convertX(dto: XDto)`
  renames the fields and converts the ids with `expectProductId` into the core type. The adapter
  never throws not-found errors; that is the services' job.
- **`MockCatalogAdapter implements ProductPort`** (`src/catalog-api/mock`): the app's default. It
  reads the response bodies from `mock-data/*.json` (keyed like the requests they answer) and runs
  each one through the **same `readX` / `convertX`** as the HTTP adapter, so the validation code is
  exercised on every request and a broken JSON entry fails exactly like a broken API response.
  Options: `delayMs` (simulated latency, aborting while waiting rejects with
  `RequestAbortedError`) and `data` (replace the catalog, e.g. with broken data in tests).
- **`MockProductAdapter implements ProductPort`** (in `core/src/utils/mock-adapters`, exported from
  `@product-explorer/core`): small in-memory adapter with obviously fake data (`MAN-0001`,
  accessories `ACC-0001`–`ACC-0003`, category products `CAT-0001`–`CAT-0003`, `NOA-0001` without
  accessories) and per-id errors. Used by the core and app unit tests. It lives in core because core
  tests must not depend on infrastructure.

```ts
// Real API
const services = createServices(new HttpCatalogAdapter(new RestClient('/api/de/en/')))
// Mock catalog (default)
const services = createServices(new MockCatalogAdapter({ delayMs: 250 }))
```

### Mock catalog (`catalog-api/mock/mock-data`)

Fictional data, English texts, made-up ids:

| Category                | Ids             | Notes                                                                 |
| ----------------------- | --------------- | --------------------------------------------------------------------- |
| `inductive-sensors`     | PRD-1001 … 1007 | PRD-1001 is the default product; PRD-1007 has no accessories          |
| `photoelectric-sensors` | PRD-1101 … 1106 | PRD-1105 has no image                                                 |
| `pressure-sensors`      | PRD-1201 … 1205 | one variant family by measuring range (`cableLength: null`)           |
| `connection-cables`     | PRD-1301 … 1308 | two variant families by cable length (straight 2–15 m, angled 2–10 m) |
| `mounting-accessories`  | PRD-1401 … 1404 | PRD-1402 has no public price ("Price on request")                     |

Accessories link the sensors to cables and mounting parts. PRD-1001 also lists `PRD-1999`, which is
not in the catalog, to show the "No longer available" card. `mock-data.test.ts` checks that the
files agree with each other (ids, categories, links, variant families).

Product images are flat SVG illustrations in `app/public/mock-images`, one per product type.

### CORS approach (HTTP adapter only)

The browser calls a same-origin path, `/api/...`. In development, the **Vite dev-server proxy**
forwards it to `VITE_CATALOG_API_URL`, so the browser never makes a cross-origin request. In
production the same idea would be a reverse proxy or a BFF.

### Caching (decision: no own cache)

The app has **no cache of its own**. With a real API, the browser's HTTP cache serves repeated
requests as far as the API's `Cache-Control` headers allow (the Vite proxy passes them through).
An own in-memory cache (`Map` with TTL) would mostly repeat this, so it was left out on purpose
(less code, nothing extra to keep in sync). Libraries such as TanStack Query or Pinia Colada would
add one, but they would replace a large part of this architecture and are not needed here.

What the HTTP cache does **not** solve, and what the app handles instead:

- **Too many requests at once:** a product can have many accessories. Cards are loaded page by
  page (4 per page), and `loadProductCards()` runs at most 4 requests at the same time.
- **The same id requested twice at the same moment:** sharing in-flight requests was **not
  built**: each store is started in exactly one place, ids are deduplicated within a list, and the
  "Same category" list loads only when its tab is opened, so this barely happens (tests in
  `MainPage.test.ts` count the requests).
- **Requests nobody needs anymore:** switching products aborts the old requests (`AbortSignal`).

---

## App (`packages/app`)

> The Vue 3 layer: routing, views, presentational components and Pinia stores.
> Stores call **core services only**. They never call `fetch` or know about DTOs.
> One module (`src/api`) is the composition root: `createCatalogServices(locale)` picks the adapter
> from the configuration (`src/config`), wraps it for demo mode if asked, and returns core's
> `createServices(adapter)`. Stores import it directly and call it in their load actions with the
> locale from the URL; tests replace the module with `vi.mock('@/api', …)`.

### Configuration (`app/src/config`, `.env.example`)

| Variable                | Default | Effect                                                                                        |
| ----------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `VITE_CATALOG_ADAPTER`  | `mock`  | `mock`: `MockCatalogAdapter`; `http`: `RestClient` → `HttpCatalogAdapter`                     |
| `VITE_CATALOG_API_URL`  | –       | Target of the `/api` dev proxy (only with `http`)                                             |
| `VITE_CATALOG_SITE_URL` | –       | Website with a page per product. When set, the product shows "View on website"; otherwise not |
| `VITE_MOCK_DELAY_MS`    | `250`   | Simulated latency of the mock catalog, so loading states are visible                          |

### Pages / routes (`app/src/router`, `app/src/pages`)

| Route                                                      | Page                 | Purpose                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                        | redirect             | → `/de/{language}/product/PRD-1001` (default product, in the preferred language, see "UI language")                                                                                                                                                                                                                             |
| `/:country([a-z]{2})/:language(de\|en)/product/:productId` | `pages/MainPage.vue` | The product page: main product on top, accessories and category products below. The router passes `country`, `language` and `productId` in as props (`props: true`). The route is case-sensitive, so `/de/DE/…` does not match. Changing `:productId` (e.g. by clicking a card) aborts all running requests of the old product. |
| `/:pathMatch(.*)*`                                         | redirect             | Unknown or malformed URLs lead to the default product (no separate not-found page)                                                                                                                                                                                                                                              |

`createAppRouter(history)` builds the router: `createWebHistory()` in `main.ts`,
`createMemoryHistory()` in the tests. The product id is passed on unchanged; the core services
validate it.

`Locale` is taken from the route params, so it needs no store.

**Layout** (`app/src/layouts/AppLayout`): `App.vue` renders `<AppLayout><RouterView /></AppLayout>`.
The layout fills the generic `SiteHeader` (slots `logo` and `actions`, prop `title`) with this
app's logo, name, the language switcher and the theme toggle, and `SiteFooter` with the small
logo. Pages only render their own content.

**Theme (light/dark):** the logic lives in `helpers/theme` (`loadUserTheme`, `saveUserTheme`,
`detectSystemTheme`, `resolvePreferredTheme`) and the composable `composables/use-theme`, which sets
`<html data-theme>` and saves the choice. `ThemeToggle` is a plain `v-model` button; `AppLayout`
wires the two together. Without a saved choice the page follows the system; an inline script in
`index.html` applies a saved choice before the first paint, so dark mode does not flash light on
reload.

| Folder        | Content                                                                                                                      | App-specific? |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `components/` | Reusable building blocks (`BaseButton`, `BaseAvatar`, `SiteHeader`, `SiteFooter`, `ThemeToggle`), only props and slots       | no            |
| `sections/`   | Parts of a page (e.g. `RelatedProducts` = "Complete your setup"); read texts and stores and pass data to components as props | yes           |
| `layouts/`    | Frame around every page, decides what goes into header and footer                                                            | yes           |
| `pages/`      | One file per route, reads the URL and loads data                                                                             | yes           |

**UI language** (`app/src/i18n`, vue-i18n with `de` and `en`): the `language` in the URL always
decides. Only URLs without one (`/`, unknown URLs) use `resolvePreferredLanguage()` from
`app/src/helpers/language`: the language saved last time (`localStorage`, every access in
`try/catch`) → the first supported browser language (`navigator.languages`, `en-US` → `en`) →
German. After every navigation the router saves the URL language. The country is never taken from
the browser, because it decides price and currency. The UI is translated; the product texts come
from the catalog (the mock catalog is English only).

**Language switcher** (`components/LanguageSwitcher`, in the header): replaces the language in the
URL (`router.replace`, so "back" leaves the page instead of flipping the language). Everything else
follows from the URL: UI texts, the saved choice, and the API data, which every store requests with
the URL's country and language.

### Design tokens and breakpoints (`app/src/styles`)

SCSS organises the tokens, CSS custom properties carry them to the components (only those can
switch to dark mode at runtime). Components never use raw colours, only `var(--…)`.

| File                      | Content                                                                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens/_palette.scss`    | primitive colours (slate neutrals, cool tints, teal accent, red, amber); the one place to re-theme the app                                                                        |
| `tokens/_colors.scss`     | 21 semantic `--color-*` tokens for light and dark (background, surface, surface-image, border, text, primary, primary-text, on-primary, focus-ring, danger, warning, skeleton, …) |
| `tokens/_spacing.scss`    | `--space-1…16` (4 px scale), `--radius-sm/md/lg/pill`, `--shadow-card`, `--container-max` (1140 px), `--container-padding`                                                        |
| `tokens/_typography.scss` | system font stack (no web font), sizes from eyebrow (12 px) to display (36–48 px, `clamp`), weights, line heights, letter spacing                                                 |
| `_breakpoints.scss`       | `tablet` 640 px, `desktop` 1024 px, `wide` 1280 px; mixins `from()` / `until()`; outputs no CSS, so components can `@use 'breakpoints' as *;`                                     |
| `main.scss`               | imports all tokens, base styles, visible `:focus-visible`, `prefers-reduced-motion`                                                                                               |

Decisions:

- **Dark mode** follows the operating system (`prefers-color-scheme`) until the user picks a theme
  with the toggle in the header; the choice is set as `<html data-theme="dark|light">` and saved.
- **Accessibility:** the bright teal accent is used for areas and icons; accent text uses
  `--color-primary-text` and accent buttons get dark text (`--color-on-primary`).
  `tokens/contrast.test.ts` reads the palette and both theme maps and checks 19 text/background and
  UI pairs per theme against WCAG AA, so a too-light colour fails the tests.
- **Product photos** usually have a white background, so `--color-surface-image` stays light in
  dark mode as well.

### Sections and components

| Folder / component                                            | Responsibility                                                                                                                                             |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sections/MainProduct`                                        | Starts the product and variants stores; shows skeletons, a `StatusCard` error, or `ProductPhoto` + `ProductInfo` (with `VariantPicker`) + `KeyFeatures`    |
| `sections/RelatedProducts`                                    | "Complete your setup": `Tabs` for accessories and same category. Starts the accessories store; starts the category store only when its tab is first opened |
| `RelatedProducts/ProductCardsPanel`                           | One tab's content: placeholders, section error, empty state, progress line (`aria-live`), `CardGrid`, "Load more"                                          |
| `components/Card`                                             | One product card in four states (`loading` / `ready` / `error` / `unavailable`), set by props; emits `retry`                                               |
| `components/ProductInfo`                                      | Type, name, id, summary, price; "View on website" only when `VITE_CATALOG_SITE_URL` is set; "Copy product ID"                                              |
| `components/StatusCard`                                       | Whole-area message with illustration: `kind="error"` (red tint, `role="alert"`, "Try again" if retryable) or `kind="empty"`                                |
| `components/error/CardError`                                  | Small error inside a card with "Try again"; not announced by itself (the progress line reports failures once)                                              |
| `components/ImagePlaceholder`                                 | Default picture for products without photo, or whose photo file fails to load (cards and main photo)                                                       |
| `components/ProductPhoto`                                     | Main photo with `srcset`; click opens the largest size in a native `<dialog>`                                                                              |
| `components/LanguageSwitcher`, `ThemeToggle`                  | Header controls, plain `v-model` components; `AppLayout` decides what a change does                                                                        |
| `components/Skeleton`, `Tabs`, `Breadcrumbs`, `BaseButton`, … | Generic building blocks, only props and slots                                                                                                              |

Icons come from Font Awesome Free; ESLint forbids inline `<svg>` in templates. Illustrations and
the logo are local SVG files in `assets/`, shown with `<img alt="">`.

### Stores (Pinia, setup style)

Every store follows the same pattern: `status` (`idle` → `loading` → `success` | `error`),
`error: DomainError | null`, `load(…, locale)`, `cancel()`, and an `AbortController` per load, so a
slow answer for an old product never replaces the current one (`RequestAbortedError` is ignored).
Each store calls `createCatalogServices(locale)` from `@/api` with the URL's country and language.

| Store                      | Started by                           | Holds                                                                                                                                               |
| -------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useProductStore`          | `MainProduct`                        | `product`, `isTimeout`, `retry()`                                                                                                                   |
| `useVariantsStore`         | `MainProduct` (in parallel)          | `variants`. Optional data: on error the picker is just left out. Switching to another variant of the loaded family keeps the list without a request |
| `useAccessoriesStore`      | `RelatedProducts`                    | `groups`, deduplicated `productIds`, per-card state, paging                                                                                         |
| `useCategoryProductsStore` | `RelatedProducts`, on first tab open | category list without the main product, per-card state, paging                                                                                      |

**Card stores** (accessories, category) share `stores/product-cards`:

```ts
type ProductCardState =
  | { status: 'loading' }
  | { status: 'success'; product: Product }
  | { status: 'error'; error: DomainError }
  | { status: 'unavailable' } // listed, but the product no longer exists (not found)

const PAGE_SIZE = 4 // cards per "Load more"
const MAX_PARALLEL_REQUESTS = 4 // worker pool in loadProductCards()
```

| Action / getter         | What it does                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `load(…)`               | Loads the id list, then the first page of cards                                                |
| `loadMore()`            | Shows the next page and loads its cards                                                        |
| `retry()`               | Loads the list again (only offered when `error.retryable`)                                     |
| `retryCard(id)`         | Reloads one failed card                                                                        |
| `visibleIds`, `hasMore` | Paging over all ids                                                                            |
| `stats`                 | `{ total, loaded, failed }` for the progress line ("4 of 10 loaded", "· 1 failed" only if any) |

The stores are independent: an error in one section never affects the other section or the main
product.

**Requests on the first view of a product:** product, variants, accessory list and 4 accessory
cards (7 requests). The category list and its cards follow only when the tab is opened. A language
switch loads each section once more in the new language.

### Loading and error states in the UI

| Situation                             | What the user sees                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Main product loading                  | Skeletons in the layout of the content (`role="status"`)                                              |
| Main product: invalid id / not found  | `StatusCard` "Nothing found" with the product id, no retry                                            |
| Main product: network / timeout / 5xx | `StatusCard` with its own text for timeouts + **Try again**                                           |
| Variants loading or failed            | No picker; the rest of the product is shown                                                           |
| List loading (accessories / category) | 4 skeleton cards, announced to screen readers                                                         |
| List failed                           | Red `StatusCard` + **Try again**; the main product and the other tab stay usable                      |
| No accessories / no other products    | `StatusCard` with the empty illustration                                                              |
| Single card loading                   | Card skeleton; the product id is already shown (known from the id list)                               |
| Single card failed                    | "Details could not be loaded" + **Try again**; the link still works                                   |
| Single card not found                 | "No longer available", no link, no retry                                                              |
| No photo, or the photo file fails     | `ImagePlaceholder` (default picture); on the main photo with "No image available", nothing to enlarge |
| Progress line                         | "4 of 10 loaded", plus "· 1 failed" when cards failed (`aria-live="polite"`)                          |
| Request aborted (navigation)          | Nothing; the new product's loading state replaces it                                                  |

### Demo mode (`app/src/demo`, development only)

With `?demo` in the URL, `createCatalogServices` wraps the configured adapter (mock or http) so
requests can be slowed down or made to fail on purpose. It is read once at page load and only in
`npm run dev`, so a production build ignores it.

| Query                                  | Effect                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `?demo`                                | no change, just switches demo mode on                                       |
| `&delay=2000` / `&delay=forever`       | every request takes 2 s longer / never answers (loading states)             |
| `&fail=PRD-1302=timeout`               | every request for that id fails (`timeout`, `server`, `network`, `invalid`) |
| `&fail=accessories:PRD-1001=server`    | only that request fails (`product`, `accessories`, `category`, `variants`)  |
| `&image=PRD-1001=broken,PRD-1301=none` | photo file fails to load / product has no photo                             |

### Folder structure

```
packages/
  core/src/
    fields/          entities/      models/       errors/       ports/        services/
    utils/mock-adapters/  # MockProductAdapter + fake test data (exported from @product-explorer/core)
  infrastructure/src/
    rest-client/     # RestClient (fetch, timeout, abort, error mapping)
    catalog-api/
      products/      # HttpCatalogAdapter, endpoints.ts, shared convert.ts, one folder per operation
                     #   (index.ts request · entity.ts DTOs · convert.ts readX check + convertX mapping)
      mock/          # MockCatalogAdapter + mock-data/*.json (the fictional catalog)
  app/src/
    router/   layouts/   pages/   sections/   components/   stores/   i18n/   styles/
    api/             # createCatalogServices(locale): the composition root
    config/          # VITE_* settings
    demo/            # demo mode (?demo), development only
    helpers/  composables/  assets/
  app/public/mock-images/   # product illustrations of the mock catalog
```

App folders must not reuse core folder names (`fields`, `entities`, `models`, `errors`, `ports`,
`services`, `utils`), because the `@/` alias resolves per package and would pick the wrong one.

### Tests (Vitest)

Tests sit next to the code (`*.test.ts`).

1. **Core:** id validation, error conversion (`toDomainError`), every service with the mock adapter.
2. **Infrastructure:** `RestClient` status → error mapping (400, empty 200, 503, fetch reject,
   abort, timeout); `readX` / `convertX` per endpoint, with fixtures taken from the mock catalog;
   the `MockCatalogAdapter`; and the consistency of the mock data files.
3. **App:** components in all their states, stores (stale answers ignored, cancel, paging, worker
   pool limit), sections, the router, i18n, configuration, demo mode, the colour contrast of both
   themes, and request-count guards in `MainPage.test.ts` (nothing is requested twice, also after a
   language switch).

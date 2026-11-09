/**
 * Country and language of a request, e.g. `de/de` or `de/en`. Part of every catalog API path.
 */
export interface Locale {
  /** Country code, e.g. `de` */
  readonly country: string
  /** Language code, e.g. `en` */
  readonly language: string
}

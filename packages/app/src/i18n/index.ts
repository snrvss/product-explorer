import { createI18n } from 'vue-i18n'
import de, { type MessageSchema } from '@/i18n/locales/de'
import en from '@/i18n/locales/en'

/** Languages the UI is translated into. Also the only languages the router accepts. */
export const SUPPORTED_LANGUAGES = ['de', 'en'] as const

/** One of {@link SUPPORTED_LANGUAGES}. */
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

/**
 * Name of each language in the language itself, for the language switcher.
 *
 * @remarks
 * Not translated on purpose: someone looking for German finds "Deutsch", whatever the current
 * language is.
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  de: 'Deutsch',
  en: 'English',
}

/** Language used when nothing else is set, and for texts missing in another language. */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'de'

/** All keys of a nested message object as dot paths, e.g. `'accessories.title'`. */
type MessagePaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : MessagePaths<T[K], `${Prefix}${K}.`>
}[keyof T & string]

/** Every valid translation key, e.g. `'accessories.title'` or `'mainProduct.notFound'`. */
export type MessageKey = MessagePaths<MessageSchema>

/** Values for the `{placeholders}` of a text, e.g. `{ productId: 'ZZZ-9999' }`. */
export type MessageParams = Record<string, string | number>

/**
 * The single vue-i18n instance of the app.
 *
 * @remarks
 * Composition API mode (`legacy: false`). Registered with `app.use(i18n)` in `main.ts`, so
 * components can use `useI18n()` or `$t(...)` in templates (with autocomplete for the keys).
 * Code outside components (stores, router, …) uses the exported {@link t} instead.
 */
export const i18n = createI18n<[MessageSchema], SupportedLanguage, false>({
  legacy: false,
  locale: DEFAULT_LANGUAGE,
  fallbackLocale: DEFAULT_LANGUAGE,
  messages: { de, en },
})

/**
 * Translates a UI text with the current language; usable anywhere, also outside components.
 *
 * @remarks
 * vue-i18n's own `t` accepts any string. This wrapper only accepts a {@link MessageKey}, so a
 * misspelled key like `t('accesories.title')` fails the typecheck.
 *
 * @param key - The translation key
 * @param params - Values for the `{placeholders}` in the text
 * @returns The text in the current language
 *
 * @example
 * ```ts
 * t('accessories.title') // 'Zubehör'
 * t('mainProduct.notFound', { productId: 'ZZZ-9999' }) // 'Produkt „ZZZ-9999“ wurde nicht gefunden.'
 * ```
 */
export function t(key: MessageKey, params: MessageParams = {}): string {
  return i18n.global.t(key, params)
}

/**
 * Type guard for {@link SupportedLanguage}.
 *
 * @param value - Any value, e.g. a route parameter
 * @returns `true` if `value` is one of {@link SUPPORTED_LANGUAGES}
 */
export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((language) => language === value)
}

/**
 * Switches the UI language and updates `<html lang>` for screen readers.
 *
 * @param language - The language to switch to
 */
export function setLanguage(language: SupportedLanguage): void {
  i18n.global.locale.value = language
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language
  }
}

/**
 * The current UI language.
 *
 * @returns One of {@link SUPPORTED_LANGUAGES}
 */
export function currentLanguage(): SupportedLanguage {
  return i18n.global.locale.value
}

declare module 'vue-i18n' {
  /** Gives `useI18n()` and `$t` in components autocomplete for the app's keys. */
  // Empty on purpose: vue-i18n's documented way to plug the app's schema into its types
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefineLocaleMessage extends MessageSchema {}
}

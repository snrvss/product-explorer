import { DEFAULT_LANGUAGE, isSupportedLanguage, type SupportedLanguage } from '@/i18n'

/** Key under which the chosen language is stored in `localStorage`. */
export const LANGUAGE_STORAGE_KEY = 'product-explorer:language'

/**
 * Reads the language the user chose last time.
 *
 * @remarks
 * Uses `localStorage`, so the choice survives closing the browser. Storage can be blocked
 * (private mode, privacy settings) or contain anything, so every failure counts as "nothing saved".
 *
 * @returns The saved language, or `null` if none is saved, it is not supported, or storage is blocked
 */
export function loadUserLanguage(): SupportedLanguage | null {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isSupportedLanguage(saved) ? saved : null
  } catch {
    return null
  }
}

/**
 * Remembers the language for the next visit.
 *
 * @remarks
 * Never throws: if storage is blocked or full, the language is simply not remembered.
 *
 * @param language - The language to remember
 */
export function saveUserLanguage(language: SupportedLanguage): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Storage blocked or full: not remembering the language is acceptable.
  }
}

/**
 * Finds the first browser language the UI is translated into.
 *
 * @remarks
 * Only the language part counts (`en-US` → `en`, `de-AT` → `de`). The country is deliberately
 * not taken from the browser, because in the catalog API paths it decides price and currency.
 *
 * @returns The first supported browser language, or `null` if there is none
 */
export function detectBrowserLanguage(): SupportedLanguage | null {
  if (typeof navigator === 'undefined') {
    return null
  }
  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const browserLanguage of browserLanguages) {
    const language = browserLanguage?.slice(0, 2).toLowerCase()
    if (isSupportedLanguage(language)) {
      return language
    }
  }
  return null
}

/**
 * Decides the language for URLs that don't contain one (e.g. `/`).
 *
 * @remarks
 * Order: the language saved last time, then the browser language, then {@link DEFAULT_LANGUAGE}.
 * A language in the URL always wins over this; it is only used where the URL has none.
 *
 * @returns The language to use
 */
export function resolvePreferredLanguage(): SupportedLanguage {
  return loadUserLanguage() ?? detectBrowserLanguage() ?? DEFAULT_LANGUAGE
}

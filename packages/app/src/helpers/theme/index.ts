/** Colour theme of the page. */
export type Theme = 'light' | 'dark'

/** Key under which the chosen theme is stored in `localStorage`. `index.html` reads the same key. */
export const THEME_STORAGE_KEY = 'product-explorer:theme'

/**
 * Checks whether a value is a known theme.
 *
 * @param value - Any value, e.g. read from storage
 * @returns `true` if the value is `light` or `dark`
 */
export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

/**
 * Reads the theme the user chose last time.
 *
 * @remarks
 * Like the language, every storage failure counts as "nothing saved".
 *
 * @returns The saved theme, or `null` if none is saved, it is unknown, or storage is blocked
 */
export function loadUserTheme(): Theme | null {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(saved) ? saved : null
  } catch {
    return null
  }
}

/**
 * Remembers the theme for the next visit.
 *
 * @remarks
 * Never throws: if storage is blocked or full, the theme is simply not remembered.
 *
 * @param theme - The theme to remember
 */
export function saveUserTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage blocked or full: not remembering the theme is acceptable.
  }
}

/**
 * Reads the theme of the operating system (`prefers-color-scheme`).
 *
 * @returns `dark` if the system is in dark mode, otherwise `light`
 */
export function detectSystemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Decides the theme when the page starts.
 *
 * @remarks
 * Order: the theme saved last time, then the system theme.
 *
 * @returns The theme to use
 */
export function resolvePreferredTheme(): Theme {
  return loadUserTheme() ?? detectSystemTheme()
}

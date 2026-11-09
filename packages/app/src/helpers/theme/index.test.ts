import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// index.html is outside src, so the @/ alias can't reach it
import indexHtml from '../../../index.html?raw'
import {
  detectSystemTheme,
  loadUserTheme,
  resolvePreferredTheme,
  saveUserTheme,
  THEME_STORAGE_KEY,
} from '@/helpers/theme'

/** Makes the operating system report dark mode or not, like `prefers-color-scheme`. */
function useSystemDarkMode(dark: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: dark })),
  )
}

describe('theme preferences', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('loadUserTheme / saveUserTheme', () => {
    it('returns null when nothing is saved', () => {
      const saved = loadUserTheme()

      expect(saved).toBeNull()
    })

    it('returns the theme saved before', () => {
      saveUserTheme('dark')

      const saved = loadUserTheme()

      expect(saved).toBe('dark')
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    })

    it('ignores a saved value that is not a theme', () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia')

      const saved = loadUserTheme()

      expect(saved).toBeNull()
    })

    it('returns null instead of throwing when storage is blocked', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      })

      const saved = loadUserTheme()

      expect(saved).toBeNull()
    })

    it('does not throw when storage is blocked or full while saving', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      })

      expect(() => saveUserTheme('dark')).not.toThrow()
    })

    it('uses the same storage key as the inline script in index.html', () => {
      expect(indexHtml).toContain(`'${THEME_STORAGE_KEY}'`)
    })
  })

  describe('detectSystemTheme', () => {
    it('returns dark when the system is in dark mode', () => {
      useSystemDarkMode(true)

      const theme = detectSystemTheme()

      expect(theme).toBe('dark')
    })

    it('returns light when the system is in light mode', () => {
      useSystemDarkMode(false)

      const theme = detectSystemTheme()

      expect(theme).toBe('light')
    })

    it('returns light when the browser cannot tell', () => {
      vi.stubGlobal('matchMedia', undefined)

      const theme = detectSystemTheme()

      expect(theme).toBe('light')
    })
  })

  describe('resolvePreferredTheme', () => {
    it('prefers the saved theme over the system theme', () => {
      useSystemDarkMode(true)
      saveUserTheme('light')

      const theme = resolvePreferredTheme()

      expect(theme).toBe('light')
    })

    it('falls back to the system theme when nothing is saved', () => {
      useSystemDarkMode(true)

      const theme = resolvePreferredTheme()

      expect(theme).toBe('dark')
    })
  })
})

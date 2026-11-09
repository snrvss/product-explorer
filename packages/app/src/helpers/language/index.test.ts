import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  detectBrowserLanguage,
  LANGUAGE_STORAGE_KEY,
  loadUserLanguage,
  resolvePreferredLanguage,
  saveUserLanguage,
} from '@/helpers/language'

/** Makes the browser report these languages, like `navigator.languages`. */
function useBrowserLanguages(languages: string[]): void {
  vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(languages)
  vi.spyOn(window.navigator, 'language', 'get').mockReturnValue(languages[0] ?? '')
}

describe('language preferences', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadUserLanguage / saveUserLanguage', () => {
    it('returns null when nothing is saved', () => {
      const saved = loadUserLanguage()

      expect(saved).toBeNull()
    })

    it('returns the language saved before', () => {
      saveUserLanguage('en')

      const saved = loadUserLanguage()

      expect(saved).toBe('en')
      expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
    })

    it('ignores a saved value that is not a supported language', () => {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr')

      const saved = loadUserLanguage()

      expect(saved).toBeNull()
    })

    it('returns null instead of throwing when storage is blocked', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      })

      const saved = loadUserLanguage()

      expect(saved).toBeNull()
    })

    it('does not throw when storage is blocked or full while saving', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      })

      const save = () => saveUserLanguage('en')

      expect(save).not.toThrow()
    })
  })

  describe('detectBrowserLanguage', () => {
    it.each([
      [['en-US', 'en'], 'en'],
      [['de-AT', 'de'], 'de'],
      [['DE-de'], 'de'],
      [['fr-FR', 'en-GB'], 'en'],
    ])('returns the first supported language of %j: %s', (browserLanguages, expected) => {
      useBrowserLanguages(browserLanguages)

      const language = detectBrowserLanguage()

      expect(language).toBe(expected)
    })

    it('returns null when no browser language is supported', () => {
      useBrowserLanguages(['fr-FR', 'it-IT'])

      const language = detectBrowserLanguage()

      expect(language).toBeNull()
    })
  })

  describe('resolvePreferredLanguage', () => {
    it('prefers the saved language over the browser language', () => {
      useBrowserLanguages(['de-DE'])
      saveUserLanguage('en')

      const language = resolvePreferredLanguage()

      expect(language).toBe('en')
    })

    it('uses the browser language when nothing is saved', () => {
      useBrowserLanguages(['en-US'])

      const language = resolvePreferredLanguage()

      expect(language).toBe('en')
    })

    it('falls back to German when neither is available', () => {
      useBrowserLanguages(['fr-FR'])

      const language = resolvePreferredLanguage()

      expect(language).toBe('de')
    })
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import {
  currentLanguage,
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  setLanguage,
  SUPPORTED_LANGUAGES,
  t,
  type MessageKey,
} from '@/i18n'
import de from '@/i18n/locales/de'
import en from '@/i18n/locales/en'

/** All keys of a nested message object, e.g. `accessories.title`. */
function keysOf(messages: object, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keysOf(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

describe('i18n', () => {
  afterEach(() => {
    setLanguage(DEFAULT_LANGUAGE)
  })

  it('starts in German', () => {
    const language = currentLanguage()

    const title = t('accessories.title')

    expect(language).toBe('de')
    expect(title).toBe('Zubehör')
  })

  it('switches all texts to English', () => {
    setLanguage('en')

    const title = t('accessories.title')

    expect(currentLanguage()).toBe('en')
    expect(title).toBe('Accessories')
  })

  it('sets the lang attribute of the page for screen readers', () => {
    setLanguage('en')

    const lang = document.documentElement.lang

    expect(lang).toBe('en')
  })

  it.each([
    ['de', 'Produkt „ZZZ-9999“ wurde nicht gefunden.'],
    ['en', 'Product “ZZZ-9999” was not found.'],
  ] as const)('fills in placeholders in %s', (language, expected) => {
    setLanguage(language)

    const text = t('mainProduct.notFound', { productId: 'ZZZ-9999' })

    expect(text).toBe(expected)
  })

  it('fills in several placeholders', () => {
    const params = { loaded: 24, total: 377, failed: 2 }

    const text = t('accessories.progressWithFailed', params)

    expect(text).toBe('24 von 377 geladen · 2 fehlgeschlagen')
  })

  it('has the same keys in English and German', () => {
    const germanKeys = keysOf(de)

    const englishKeys = keysOf(en)

    expect(englishKeys).toEqual(germanKeys)
  })

  it('has no empty texts', () => {
    const texts = [...keysOf(de), ...keysOf(en)].map((key) => t(key as MessageKey))

    const empty = texts.filter((text) => text.trim() === '')

    expect(empty).toEqual([])
  })

  it.each([
    [true, 'de'],
    [true, 'en'],
    [false, 'fr'],
    [false, 'DE'],
    [false, undefined],
  ])('isSupportedLanguage returns %s for %s', (expected, value) => {
    const supported = isSupportedLanguage(value)

    expect(supported).toBe(expected)
  })

  it('supports exactly German and English', () => {
    const languages = [...SUPPORTED_LANGUAGES]

    expect(languages).toEqual(['de', 'en'])
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTheme } from '@/composables'
import { THEME_STORAGE_KEY } from '@/helpers'

/** Makes the operating system report dark mode or not, like `prefers-color-scheme`. */
function useSystemDarkMode(dark: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: dark })),
  )
}

describe('useTheme', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts with the theme already set on <html> by index.html', () => {
    document.documentElement.dataset.theme = 'dark'

    const { theme } = useTheme()

    expect(theme.value).toBe('dark')
  })

  it('starts with the system theme when nothing is set or saved', () => {
    useSystemDarkMode(true)

    const { theme, isDark } = useTheme()

    expect(theme.value).toBe('dark')
    expect(isDark.value).toBe(true)
  })

  it('does not touch <html> before the user switches, so the CSS keeps following the system', () => {
    useTheme()

    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('applies and remembers the theme when isDark is set', () => {
    const { theme, isDark } = useTheme()

    isDark.value = true

    expect(theme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('switches back to light with setTheme', () => {
    const { isDark, setTheme } = useTheme()
    isDark.value = true

    setTheme('light')

    expect(isDark.value).toBe(false)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })
})

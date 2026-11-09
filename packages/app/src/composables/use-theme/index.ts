import { computed, readonly, ref, type Ref, type WritableComputedRef } from 'vue'
import { isTheme, resolvePreferredTheme, saveUserTheme, type Theme } from '@/helpers'

/** What {@link useTheme} returns. */
export interface UseTheme {
  /** The current theme */
  theme: Readonly<Ref<Theme>>
  /** `true` in dark mode. Setting it switches the theme, e.g. with `v-model`. */
  isDark: WritableComputedRef<boolean>
  /** Switches to the given theme, applies it to the page and remembers it. */
  setTheme: (theme: Theme) => void
}

/**
 * Reads and switches the colour theme of the page.
 *
 * @remarks
 * The theme is applied as `<html data-theme="light|dark">`; the colour tokens react to that.
 * At start the theme already set on `<html>` wins (the inline script in `index.html` sets the
 * saved one before the page is drawn), otherwise {@link resolvePreferredTheme} decides.
 *
 * @returns The current theme and functions to switch it
 */
export function useTheme(): UseTheme {
  const theme = ref<Theme>(currentTheme())

  function setTheme(next: Theme): void {
    theme.value = next
    document.documentElement.dataset.theme = next
    saveUserTheme(next)
  }

  const isDark = computed({
    get: () => theme.value === 'dark',
    set: (dark: boolean) => setTheme(dark ? 'dark' : 'light'),
  })

  return { theme: readonly(theme), isDark, setTheme }
}

/** The theme on `<html>`, or the preferred one if none is set yet. */
function currentTheme(): Theme {
  const applied = document.documentElement.dataset.theme
  return isTheme(applied) ? applied : resolvePreferredTheme()
}

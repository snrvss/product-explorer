<template>
  <div class="app-layout">
    <SiteHeader title="Product Explorer">
      <template #logo>
        <BaseAvatar :src="logoUrl" alt="" />
      </template>
      <template #actions>
        <LanguageSwitcher
          v-model="language"
          :label="t('language.change')"
          :options="languageOptions"
        />
        <ThemeToggle v-model="isDark" :label="themeLabel" />
      </template>
    </SiteHeader>

    <!-- The current page -->
    <div class="app-layout__page">
      <slot />
    </div>

    <SiteFooter title="Product Explorer">
      <template #logo>
        <BaseAvatar :src="logoUrl" alt="" size="small" />
      </template>
    </SiteFooter>
  </div>
</template>

<script setup lang="ts">
/**
 * Frame around every page: the header with this app's logo, name and actions, then the page,
 * then the footer.
 *
 * @remarks
 * `SiteHeader` and `SiteFooter` only arrange their slots; this layout decides what goes into them.
 * Pages don't know about header and footer, so they only render their own content. The page area
 * grows to fill the screen, so the footer stays at the bottom even on short pages.
 *
 * Switching the language replaces it in the URL (`/de/de/…` → `/de/en/…`), keeping country and
 * product. The router then switches the UI texts and saves the choice, and the sections reload
 * the product data in the new language. `replace` instead of `push`, so the back button leaves
 * the page instead of flipping the language back.
 *
 * @example
 * ```vue
 * <AppLayout><RouterView /></AppLayout>
 * ```
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logoUrl from '@/assets/logo.svg'
import { BaseAvatar } from '@/components/BaseAvatar'
import { LanguageSwitcher, type LanguageOption } from '@/components/LanguageSwitcher'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useTheme } from '@/composables'
import { saveUserLanguage } from '@/helpers'
import {
  currentLanguage,
  isSupportedLanguage,
  LANGUAGE_NAMES,
  setLanguage,
  SUPPORTED_LANGUAGES,
  t,
} from '@/i18n'

const { isDark } = useTheme()

const themeLabel = computed(() => t(isDark.value ? 'theme.switchToLight' : 'theme.switchToDark'))

const route = useRoute()
const router = useRouter()

const languageOptions: LanguageOption[] = SUPPORTED_LANGUAGES.map((value) => ({
  value,
  code: value.toUpperCase(),
  name: LANGUAGE_NAMES[value],
}))

const language = computed({
  get: () => currentLanguage(),
  set: (value: string) => {
    if (!isSupportedLanguage(value)) {
      return
    }
    // Only product URLs carry a language; anywhere else just switch the texts
    if (route.params['language'] === undefined) {
      setLanguage(value)
      saveUserLanguage(value)
      return
    }
    void router.replace({ params: { ...route.params, language: value } })
  },
})
</script>

<style scoped lang="scss">
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;

  &__page {
    flex: 1; // pushes the footer to the bottom on short pages
  }
}
</style>

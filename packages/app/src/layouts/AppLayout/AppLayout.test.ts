import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, type Router } from 'vue-router'
import { LANGUAGE_STORAGE_KEY, THEME_STORAGE_KEY } from '@/helpers'
import { currentLanguage, setLanguage } from '@/i18n'
import { AppLayout } from '@/layouts/AppLayout'
import { createAppRouter } from '@/router'

let router: Router

/** Mounts the layout on a product URL, like the app does (without the page itself). */
async function mountLayout(options: Parameters<typeof mount>[1] = {}) {
  await router.push('/at/en/product/PRD-1301')
  return mount(AppLayout, { ...options, global: { plugins: [router] } })
}

describe('AppLayout', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.theme
    setLanguage('en')
    router = createAppRouter(createMemoryHistory())
  })

  it('renders the header with the app name and the logo', async () => {
    const wrapper = await mountLayout()

    const header = wrapper.get('header')

    expect(header.text()).toContain('Product Explorer')
    expect(header.find('img').exists()).toBe(true)
  })

  it('hides the logo from screen readers, because the app name is right next to it', async () => {
    const wrapper = await mountLayout()

    const alt = wrapper.get('header img').attributes('alt')

    expect(alt).toBe('')
  })

  it('renders the page between the header and the footer', async () => {
    const wrapper = await mountLayout({
      slots: { default: '<main data-test="page">Page</main>' },
    })

    const parts = [...wrapper.get('.app-layout').element.children].map((part) => part.tagName)

    expect(parts).toEqual(['HEADER', 'DIV', 'FOOTER'])
    expect(wrapper.find('.app-layout__page [data-test="page"]').exists()).toBe(true)
  })

  it('renders the footer with the app name and the small logo', async () => {
    const wrapper = await mountLayout()

    const footer = wrapper.get('footer')

    expect(footer.text()).toContain('Product Explorer')
    expect(footer.find('.base-avatar--small img').attributes('alt')).toBe('')
  })

  it('switches to dark mode and remembers it when the theme toggle is clicked', async () => {
    const wrapper = await mountLayout()
    const toggle = wrapper.get('header .theme-toggle')

    await toggle.trigger('click')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(toggle.attributes('aria-label')).toBe('Switch to light mode')
  })

  it('shows the current language in the header', async () => {
    const wrapper = await mountLayout()

    const trigger = wrapper.get('header .language-switcher__trigger')

    expect(trigger.text()).toBe('EN')
  })

  it('switches the language in the URL, keeping country and product, and remembers it', async () => {
    const wrapper = await mountLayout()
    await wrapper.get('header .language-switcher__trigger').trigger('click')

    await wrapper.get('header .language-switcher__option[lang="de"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/at/de/product/PRD-1301')
    expect(currentLanguage()).toBe('de')
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('de')
    expect(wrapper.get('header .language-switcher__trigger').text()).toBe('DE')
  })

  it('replaces the history entry, so "back" leaves the page instead of flipping the language', async () => {
    await router.push('/de/en/product/PRD-1001')
    const wrapper = await mountLayout()
    await wrapper.get('header .language-switcher__trigger').trigger('click')
    await wrapper.get('header .language-switcher__option[lang="de"]').trigger('click')
    await flushPromises()

    router.back()
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/de/en/product/PRD-1001')
  })
})

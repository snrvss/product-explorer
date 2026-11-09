import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { LanguageSwitcher, type LanguageOption } from '@/components/LanguageSwitcher'

const OPTIONS: LanguageOption[] = [
  { value: 'de', code: 'DE', name: 'Deutsch' },
  { value: 'en', code: 'EN', name: 'English' },
]

let wrapper: VueWrapper | undefined

function mountSwitcher(language = 'en') {
  wrapper = mount(LanguageSwitcher, {
    props: { modelValue: language, label: 'Change language', options: OPTIONS },
    attachTo: document.body,
  })
  return wrapper
}

describe('LanguageSwitcher', () => {
  afterEach(() => {
    wrapper?.unmount()
  })

  it('shows the current language code on a closed button', () => {
    const switcher = mountSwitcher('en')

    const trigger = switcher.get('.language-switcher__trigger')

    expect(trigger.text()).toBe('EN')
    expect(trigger.attributes('aria-label')).toBe('Change language: English')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(switcher.get('ul').isVisible()).toBe(false)
  })

  it('opens the list on click, with every language in its own language', async () => {
    const switcher = mountSwitcher()

    await switcher.get('.language-switcher__trigger').trigger('click')

    const options = switcher.findAll('.language-switcher__option')
    expect(switcher.get('.language-switcher__trigger').attributes('aria-expanded')).toBe('true')
    expect(switcher.get('ul').isVisible()).toBe(true)
    expect(options.map((option) => option.attributes('lang'))).toEqual(['de', 'en'])
    expect(options.map((option) => option.text())).toEqual(['DE Deutsch', 'EN English'])
  })

  it('marks the current language', async () => {
    const switcher = mountSwitcher('en')

    await switcher.get('.language-switcher__trigger').trigger('click')

    const [german, english] = switcher.findAll('.language-switcher__option')
    expect(english?.attributes('aria-current')).toBe('true')
    expect(german?.attributes('aria-current')).toBeUndefined()
  })

  it('emits the chosen language, closes and gives focus back to the button', async () => {
    const switcher = mountSwitcher('en')
    await switcher.get('.language-switcher__trigger').trigger('click')

    await switcher.get('.language-switcher__option[lang="de"]').trigger('click')

    expect(switcher.emitted('update:modelValue')).toEqual([['de']])
    expect(switcher.get('ul').isVisible()).toBe(false)
    expect(document.activeElement).toBe(switcher.get('.language-switcher__trigger').element)
  })

  it('emits nothing when the current language is chosen again', async () => {
    const switcher = mountSwitcher('en')
    await switcher.get('.language-switcher__trigger').trigger('click')

    await switcher.get('.language-switcher__option[lang="en"]').trigger('click')

    expect(switcher.emitted('update:modelValue')).toBeUndefined()
    expect(switcher.get('ul').isVisible()).toBe(false)
  })

  it('closes on Escape and gives focus back to the button', async () => {
    const switcher = mountSwitcher()
    await switcher.get('.language-switcher__trigger').trigger('click')

    await switcher
      .get('.language-switcher__option[lang="de"]')
      .trigger('keydown', { key: 'Escape' })

    expect(switcher.get('ul').isVisible()).toBe(false)
    expect(document.activeElement).toBe(switcher.get('.language-switcher__trigger').element)
  })

  it('closes on a click outside', async () => {
    const switcher = mountSwitcher()
    await switcher.get('.language-switcher__trigger').trigger('click')

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await switcher.vm.$nextTick()

    expect(switcher.get('ul').isVisible()).toBe(false)
  })
})

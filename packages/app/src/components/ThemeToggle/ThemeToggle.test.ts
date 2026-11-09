import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { ThemeToggle } from '@/components/ThemeToggle'

describe('ThemeToggle', () => {
  it('renders a native button with the label for screen readers and as tooltip', () => {
    const wrapper = mount(ThemeToggle, {
      props: { modelValue: false, label: 'Switch to dark mode' },
    })

    const button = wrapper.get('button')

    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-label')).toBe('Switch to dark mode')
    expect(button.attributes('title')).toBe('Switch to dark mode')
  })

  it('shows the moon in light mode', () => {
    const wrapper = mount(ThemeToggle, { props: { modelValue: false, label: 'Label' } })

    const moon = wrapper.find('.theme-toggle__icon--moon')

    expect(moon.exists()).toBe(true)
    expect(wrapper.find('.theme-toggle__icon--sun').exists()).toBe(false)
  })

  it('shows the sun in dark mode', () => {
    const wrapper = mount(ThemeToggle, { props: { modelValue: true, label: 'Label' } })

    const sun = wrapper.find('.theme-toggle__icon--sun')

    expect(sun.exists()).toBe(true)
    expect(wrapper.find('.theme-toggle__icon--moon').exists()).toBe(false)
  })

  it.each([
    [false, true],
    [true, false],
  ])('emits %s → %s on click', async (current, next) => {
    const wrapper = mount(ThemeToggle, { props: { modelValue: current, label: 'Label' } })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[next]])
  })

  it('hides the icon from screen readers, because the label says it all', () => {
    const wrapper = mount(ThemeToggle, { props: { modelValue: false, label: 'Label' } })

    const hidden = wrapper.get('svg').attributes('aria-hidden')

    expect(hidden).toBe('true')
  })
})

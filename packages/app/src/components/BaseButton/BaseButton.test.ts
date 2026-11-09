import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { BaseButton } from '@/components/BaseButton'

describe('BaseButton', () => {
  it('renders a native button with type="button" by default', () => {
    const wrapper = mount(BaseButton, { slots: { default: 'Copy product ID' } })

    const button = wrapper.get('button')

    expect(button.attributes('type')).toBe('button')
    expect(button.text()).toBe('Copy product ID')
  })

  it('uses the filled variant and medium size by default', () => {
    const wrapper = mount(BaseButton, { slots: { default: 'Label' } })

    const classes = wrapper.classes()

    expect(classes).toContain('base-button--filled')
    expect(classes).toContain('base-button--medium')
  })

  it.each([
    ['outlined', 'large'],
    ['text', 'medium'],
  ] as const)('applies the %s variant and %s size classes', (variant, size) => {
    const wrapper = mount(BaseButton, { props: { variant, size }, slots: { default: 'Label' } })

    const classes = wrapper.classes()

    expect(classes).toContain(`base-button--${variant}`)
    expect(classes).toContain(`base-button--${size}`)
  })

  it('passes the native type through, e.g. for forms', () => {
    const wrapper = mount(BaseButton, { props: { type: 'submit' }, slots: { default: 'Send' } })

    const type = wrapper.get('button').attributes('type')

    expect(type).toBe('submit')
  })

  it('emits click with the mouse event', async () => {
    const wrapper = mount(BaseButton, { slots: { default: 'Label' } })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
    expect(wrapper.emitted('click')?.[0]?.[0]).toBeInstanceOf(MouseEvent)
  })

  it('is disabled and emits no click when disabled', async () => {
    const wrapper = mount(BaseButton, { props: { disabled: true }, slots: { default: 'Label' } })

    await wrapper.get('button').trigger('click')

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('stays focusable but emits no click while loading, and tells screen readers it is busy', async () => {
    const wrapper = mount(BaseButton, { props: { loading: true }, slots: { default: 'Load more' } })

    await wrapper.get('button').trigger('click')

    const button = wrapper.get('button')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.attributes('aria-busy')).toBe('true')
    expect(button.attributes('aria-disabled')).toBe('true')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('shows a spinner instead of the leading icon while loading', () => {
    const wrapper = mount(BaseButton, {
      props: { loading: true },
      slots: { default: 'Load more', leading: '<svg data-test="plus-icon" />' },
    })

    const spinner = wrapper.find('.base-button__spinner')

    expect(spinner.exists()).toBe(true)
    expect(wrapper.find('[data-test="plus-icon"]').exists()).toBe(false)
  })

  it('renders the leading and trailing slots around the label', () => {
    const wrapper = mount(BaseButton, {
      slots: {
        default: 'View product',
        leading: '<svg data-test="leading" />',
        trailing: '<svg data-test="trailing" />',
      },
    })

    const parts = wrapper.findAll('button > span').map((part) => part.classes())

    expect(parts).toEqual([['base-button__icon'], ['base-button__label'], ['base-button__icon']])
    expect(wrapper.find('[data-test="leading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="trailing"]').exists()).toBe(true)
  })

  it('renders no icon wrappers when no icons are given', () => {
    const wrapper = mount(BaseButton, { slots: { default: 'Label' } })

    const icons = wrapper.findAll('.base-button__icon')

    expect(icons).toHaveLength(0)
  })

  it('stretches to the full width when fullWidth is set', () => {
    const wrapper = mount(BaseButton, { props: { fullWidth: true }, slots: { default: 'Label' } })

    const classes = wrapper.classes()

    expect(classes).toContain('base-button--full-width')
  })
})

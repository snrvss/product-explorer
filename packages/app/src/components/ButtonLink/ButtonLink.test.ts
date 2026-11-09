import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { ButtonLink } from '@/components/ButtonLink'

const HREF = 'https://shop.example.com/products/MAN-0001'

describe('ButtonLink', () => {
  it('renders a real link with the address and label', () => {
    const wrapper = mount(ButtonLink, { props: { href: HREF }, slots: { default: 'View' } })

    const link = wrapper.get('a')

    expect(link.attributes('href')).toBe(HREF)
    expect(link.text()).toBe('View')
  })

  it('uses the filled variant and medium size by default', () => {
    const wrapper = mount(ButtonLink, { props: { href: HREF }, slots: { default: 'View' } })

    const classes = wrapper.classes()

    expect(classes).toContain('button-link--filled')
    expect(classes).toContain('button-link--medium')
  })

  it('applies variant, size and full width', () => {
    const wrapper = mount(ButtonLink, {
      props: { href: HREF, variant: 'outlined', size: 'large', fullWidth: true },
      slots: { default: 'View' },
    })

    const classes = wrapper.classes()

    expect(classes).toContain('button-link--outlined')
    expect(classes).toContain('button-link--large')
    expect(classes).toContain('button-link--full-width')
  })

  it('renders the leading and trailing slots around the label', () => {
    const wrapper = mount(ButtonLink, {
      props: { href: HREF },
      slots: {
        default: 'View',
        leading: '<i data-test="leading" />',
        trailing: '<i data-test="trailing" />',
      },
    })

    const parts = wrapper.findAll('a > span').map((part) => part.classes())

    expect(parts).toEqual([['button-link__icon'], ['button-link__label'], ['button-link__icon']])
  })
})

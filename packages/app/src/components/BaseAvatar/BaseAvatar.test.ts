import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { BaseAvatar } from '@/components/BaseAvatar'

describe('BaseAvatar', () => {
  it('renders the image with its src and alt text', () => {
    const wrapper = mount(BaseAvatar, { props: { src: '/logo.svg', alt: 'Product Explorer' } })

    const image = wrapper.get('img')

    expect(image.attributes('src')).toBe('/logo.svg')
    expect(image.attributes('alt')).toBe('Product Explorer')
  })

  it('keeps an empty alt text, so screen readers skip a decorative image', () => {
    const wrapper = mount(BaseAvatar, { props: { src: '/logo.svg', alt: '' } })

    const alt = wrapper.get('img').attributes('alt')

    expect(alt).toBe('')
  })

  it('uses the large size by default', () => {
    const wrapper = mount(BaseAvatar, { props: { src: '/logo.svg', alt: '' } })

    const classes = wrapper.classes()

    expect(classes).toContain('base-avatar--large')
  })

  it('applies the small size class', () => {
    const wrapper = mount(BaseAvatar, { props: { src: '/logo.svg', alt: '', size: 'small' } })

    const classes = wrapper.classes()

    expect(classes).toContain('base-avatar--small')
    expect(classes).not.toContain('base-avatar--large')
  })
})

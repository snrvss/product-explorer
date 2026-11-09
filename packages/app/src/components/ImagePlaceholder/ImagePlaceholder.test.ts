import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { ImagePlaceholder } from '@/components/ImagePlaceholder'

describe('ImagePlaceholder', () => {
  it('shows the default illustration, hidden from screen readers', () => {
    const placeholder = mount(ImagePlaceholder)

    const image = placeholder.get('img')

    expect(image.attributes('src')).toBeTruthy()
    expect(image.attributes('alt')).toBe('')
  })

  it('shows no text by default, e.g. in small cards', () => {
    const placeholder = mount(ImagePlaceholder)

    expect(placeholder.find('.image-placeholder__label').exists()).toBe(false)
  })

  it('shows the text below when one is given', () => {
    const placeholder = mount(ImagePlaceholder, { props: { label: 'No image available' } })

    expect(placeholder.get('.image-placeholder__label').text()).toBe('No image available')
  })
})

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Skeleton } from '@/components/Skeleton'

describe('Skeleton', () => {
  it('is hidden from screen readers', () => {
    const wrapper = mount(Skeleton)

    const hidden = wrapper.attributes('aria-hidden')

    expect(hidden).toBe('true')
  })

  it('fills the width and is one text line high by default', () => {
    const wrapper = mount(Skeleton)

    const style = wrapper.attributes('style')

    expect(style).toContain('width: 100%')
    expect(style).toContain('height: 1em')
    expect(wrapper.classes()).toContain('skeleton--text')
  })

  it('uses the given size', () => {
    const wrapper = mount(Skeleton, { props: { width: '80%', height: '1.25rem' } })

    const style = wrapper.attributes('style')

    expect(style).toContain('width: 80%')
    expect(style).toContain('height: 1.25rem')
  })

  it.each(['block', 'circle'] as const)('applies the %s shape', (shape) => {
    const wrapper = mount(Skeleton, { props: { shape } })

    const classes = wrapper.classes()

    expect(classes).toContain(`skeleton--${shape}`)
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { KeyFeatures } from '@/components/KeyFeatures'
import { setLanguage } from '@/i18n'

const FEATURES = ['Fake feature one', 'Fake feature two', 'Fake feature three']

describe('KeyFeatures', () => {
  beforeEach(() => {
    setLanguage('en')
  })

  it('is a section named by its heading', () => {
    const wrapper = mount(KeyFeatures, { props: { features: FEATURES } })

    const heading = wrapper.get('h2')

    expect(heading.text()).toBe('Key features')
    expect(wrapper.get('section').attributes('aria-labelledby')).toBe(heading.attributes('id'))
  })

  it('lists every feature in order', () => {
    const wrapper = mount(KeyFeatures, { props: { features: FEATURES } })

    const items = wrapper.findAll('ul > li').map((item) => item.text())

    expect(items).toEqual(FEATURES)
  })

  it('shows a check mark per feature, hidden from screen readers', () => {
    const wrapper = mount(KeyFeatures, { props: { features: FEATURES } })

    const icons = wrapper.findAll('.key-features__icon')

    expect(icons).toHaveLength(3)
    expect(icons.every((icon) => icon.attributes('aria-hidden') === 'true')).toBe(true)
  })

  it('renders nothing when there are no features', () => {
    const wrapper = mount(KeyFeatures, { props: { features: [] } })

    const section = wrapper.find('section')

    expect(section.exists()).toBe(false)
  })

  it('translates the heading', () => {
    setLanguage('de')

    const wrapper = mount(KeyFeatures, { props: { features: FEATURES } })

    expect(wrapper.get('h2').text()).toBe('Hauptmerkmale')
  })
})

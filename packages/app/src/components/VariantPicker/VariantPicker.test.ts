import { beforeEach, describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import {
  FAKE_CABLE_FAMILY_VARIANTS,
  tryToProductId,
  type ProductVariant,
} from '@product-explorer/core'
import { VariantPicker } from '@/components/VariantPicker'
import { setLanguage } from '@/i18n'
import { PRODUCT_ROUTE } from '@/router/route-names'

/** The fake cable family has eight lengths: CBL-0001 = 0.7 m … CBL-0008 = 15 m. */
function mountPicker(
  currentId = 'CBL-0003',
  variants: readonly ProductVariant[] = FAKE_CABLE_FAMILY_VARIANTS,
) {
  return mount(VariantPicker, {
    props: { variants, currentId },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

function optionLabels(picker: ReturnType<typeof mountPicker>): string[] {
  return picker.findAll('.variant-picker__option').map((option) => option.text())
}

describe('VariantPicker', () => {
  beforeEach(() => {
    setLanguage('en')
  })

  it('renders nothing when the product has no other variants', () => {
    const only = FAKE_CABLE_FAMILY_VARIANTS.slice(0, 1)

    const picker = mountPicker('CBL-0001', only)

    expect(picker.find('.variant-picker').exists()).toBe(false)
  })

  it('names the choice and says how many there are', () => {
    const picker = mountPicker()

    expect(picker.get('h2').text()).toBe('Cable length')
    expect(picker.get('.variant-picker__count').text()).toBe('8 lengths available')
    expect(picker.get('ul').attributes('aria-labelledby')).toBe(picker.get('h2').attributes('id'))
  })

  it('shows the first five lengths, shortest first', () => {
    const shuffled = [...FAKE_CABLE_FAMILY_VARIANTS].reverse()

    const picker = mountPicker('CBL-0003', shuffled)

    expect(optionLabels(picker)).toEqual(['0.7 m', '1 m', '2 m', '3 m', '4 m'])
  })

  it('links every option to the product page of that variant', () => {
    const picker = mountPicker()

    const to = picker.findAllComponents(RouterLinkStub).map((link) => link.props('to'))

    expect(to[0]).toEqual({ name: PRODUCT_ROUTE, params: { productId: 'CBL-0001' } })
    expect(to).toHaveLength(5)
  })

  it('marks only the current variant, with aria-current and a check', () => {
    const picker = mountPicker('CBL-0003')

    const current = picker.findAll('[aria-current="page"]')

    expect(current).toHaveLength(1)
    expect(current[0]?.text()).toBe('2 m')
    expect(current[0]?.classes()).toContain('variant-picker__option--current')
    expect(current[0]?.find('svg.variant-picker__check').attributes('aria-hidden')).toBe('true')
  })

  it('shows the rest with the "show more" button and hides it again', async () => {
    const picker = mountPicker()
    const button = picker.get('button')
    expect(button.text()).toBe('Show 3 more variants')
    expect(button.attributes('aria-expanded')).toBe('false')
    expect(button.attributes('aria-controls')).toBe(picker.get('ul').attributes('id'))

    await button.trigger('click')

    expect(optionLabels(picker)).toHaveLength(8)
    expect(button.text()).toBe('Show fewer variants')
    expect(button.attributes('aria-expanded')).toBe('true')

    await button.trigger('click')

    expect(optionLabels(picker)).toHaveLength(5)
  })

  it('starts expanded when the current variant would be hidden', () => {
    const picker = mountPicker('CBL-0008')

    expect(optionLabels(picker)).toHaveLength(8)
    expect(picker.get('[aria-current="page"]').text()).toBe('15 m')
  })

  it('has no "show more" button for five variants or fewer', () => {
    const picker = mountPicker('CBL-0001', FAKE_CABLE_FAMILY_VARIANTS.slice(0, 5))

    expect(picker.find('button').exists()).toBe(false)
  })

  it('says which variant is selected', () => {
    const picker = mountPicker('CBL-0003')

    expect(picker.get('.variant-picker__selected').text()).toBe('Selected: 2 m · CBL-0003')
  })

  it('writes lengths with the decimal mark of the UI language', () => {
    setLanguage('de')

    const picker = mountPicker()

    expect(optionLabels(picker)[0]).toBe('0,7 m')
    expect(picker.get('h2').text()).toBe('Kabellänge')
  })

  it('uses the descriptions when the variants are not cable lengths', () => {
    const variants: ProductVariant[] = [
      { id: tryToProductId('VAR-0001'), description: 'Fake variant A', cableLength: null },
      { id: tryToProductId('VAR-0002'), description: 'Fake variant B', cableLength: null },
    ]

    const picker = mountPicker('VAR-0001', variants)

    expect(picker.get('h2').text()).toBe('Variants')
    expect(picker.get('.variant-picker__count').text()).toBe('2 variants available')
    expect(optionLabels(picker)).toEqual(['Fake variant A', 'Fake variant B'])
  })
})

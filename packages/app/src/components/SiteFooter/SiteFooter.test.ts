import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { SiteFooter } from '@/components/SiteFooter'

describe('SiteFooter', () => {
  it('renders a footer landmark with the title', () => {
    const wrapper = mount(SiteFooter, { props: { title: 'Product Explorer' } })

    const title = wrapper.get('footer .site-footer__title').text()

    expect(title).toBe('Product Explorer')
  })

  it('renders the logo slot before the title', () => {
    const wrapper = mount(SiteFooter, {
      props: { title: 'Product Explorer' },
      slots: { logo: '<img data-test="logo" alt="" />' },
    })

    const brand = wrapper.get('.site-footer__brand').element.children

    expect(brand[0]?.getAttribute('data-test')).toBe('logo')
    expect(brand[1]?.classList.contains('site-footer__title')).toBe(true)
  })

  it('renders the actions slot', () => {
    const wrapper = mount(SiteFooter, {
      props: { title: 'Product Explorer' },
      slots: { actions: '<a data-test="imprint" href="#">Imprint</a>' },
    })

    const action = wrapper.find('.site-footer__actions [data-test="imprint"]')

    expect(action.exists()).toBe(true)
  })

  it('renders no actions wrapper when no actions are given', () => {
    const wrapper = mount(SiteFooter, { props: { title: 'Product Explorer' } })

    const actions = wrapper.find('.site-footer__actions')

    expect(actions.exists()).toBe(false)
  })
})

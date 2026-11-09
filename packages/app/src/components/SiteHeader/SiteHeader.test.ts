import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { SiteHeader } from '@/components/SiteHeader'

describe('SiteHeader', () => {
  it('renders a header landmark with the title', () => {
    const wrapper = mount(SiteHeader, { props: { title: 'Product Explorer' } })

    const title = wrapper.get('header .site-header__title').text()

    expect(title).toBe('Product Explorer')
  })

  it('does not render the title as a heading, so the page keeps its own h1', () => {
    const wrapper = mount(SiteHeader, { props: { title: 'Product Explorer' } })

    const headings = wrapper.findAll('h1, h2, h3, h4, h5, h6')

    expect(headings).toHaveLength(0)
  })

  it('renders the logo slot before the title', () => {
    const wrapper = mount(SiteHeader, {
      props: { title: 'Product Explorer' },
      slots: { logo: '<img data-test="logo" alt="" />' },
    })

    const brand = wrapper.get('.site-header__brand').element.children

    expect(brand[0]?.getAttribute('data-test')).toBe('logo')
    expect(brand[1]?.classList.contains('site-header__title')).toBe(true)
  })

  it('renders the actions slot', () => {
    const wrapper = mount(SiteHeader, {
      props: { title: 'Product Explorer' },
      slots: { actions: '<button data-test="language">EN</button>' },
    })

    const action = wrapper.find('.site-header__actions [data-test="language"]')

    expect(action.exists()).toBe(true)
  })

  it('renders no actions wrapper when no actions are given', () => {
    const wrapper = mount(SiteHeader, { props: { title: 'Product Explorer' } })

    const actions = wrapper.find('.site-header__actions')

    expect(actions.exists()).toBe(false)
  })
})

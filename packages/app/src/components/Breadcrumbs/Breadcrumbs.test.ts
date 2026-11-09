import { beforeEach, describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { faHouse } from '@fortawesome/free-solid-svg-icons'
import { Breadcrumbs, type BreadcrumbItem } from '@/components/Breadcrumbs'
import { setLanguage } from '@/i18n'

const ITEMS: BreadcrumbItem[] = [
  { label: 'Home', to: '/', icon: faHouse },
  { label: 'Products' },
  { label: 'MAN-0001' },
]

function mountBreadcrumbs(items: BreadcrumbItem[] = ITEMS) {
  return mount(Breadcrumbs, {
    props: { items },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('Breadcrumbs', () => {
  beforeEach(() => {
    setLanguage('en')
  })

  it('is a labelled navigation with an ordered list of the entries', () => {
    const breadcrumbs = mountBreadcrumbs()

    const items = breadcrumbs.findAll('nav > ol > li')

    expect(breadcrumbs.get('nav').attributes('aria-label')).toBe('Breadcrumb')
    expect(items).toHaveLength(3)
  })

  it('translates the navigation label', () => {
    setLanguage('de')

    const breadcrumbs = mountBreadcrumbs()

    expect(breadcrumbs.get('nav').attributes('aria-label')).toBe('Brotkrümelnavigation')
  })

  it('renders entries with a destination as links', () => {
    const breadcrumbs = mountBreadcrumbs()

    const links = breadcrumbs.findAllComponents(RouterLinkStub)

    expect(links).toHaveLength(1)
    expect(links[0]?.props('to')).toBe('/')
  })

  it('renders entries without a destination as plain text', () => {
    const breadcrumbs = mountBreadcrumbs()

    const texts = breadcrumbs.findAll('.breadcrumbs__text')

    expect(texts.map((text) => text.text())).toEqual(['Products', 'MAN-0001'])
    expect(texts.every((text) => text.element.tagName === 'SPAN')).toBe(true)
    expect(texts.every((text) => text.element.closest('a') === null)).toBe(true)
  })

  it('marks only the last entry as the current page', () => {
    const breadcrumbs = mountBreadcrumbs()

    const current = breadcrumbs.findAll('[aria-current]')

    expect(current).toHaveLength(1)
    expect(current[0]?.attributes('aria-current')).toBe('page')
    expect(current[0]?.text()).toBe('MAN-0001')
  })

  it('marks the last entry as the current page also when it is a link', () => {
    const breadcrumbs = mountBreadcrumbs([
      { label: 'Products' },
      { label: 'MAN-0001', to: '/de/en/product/MAN-0001' },
    ])

    const link = breadcrumbs.getComponent(RouterLinkStub)

    expect(link.attributes('aria-current')).toBe('page')
  })

  it('shows only the icon for icon entries, but keeps the label for screen readers', () => {
    const breadcrumbs = mountBreadcrumbs()

    const home = breadcrumbs.getComponent(RouterLinkStub)
    const icon = home.get('svg.breadcrumbs__icon')

    expect(icon.attributes('aria-hidden')).toBe('true')
    expect(home.get('.visually-hidden').text()).toBe('Home')
  })

  it('hides the separators from screen readers: a chevron after an icon, otherwise a slash', () => {
    const breadcrumbs = mountBreadcrumbs()

    const separators = breadcrumbs.findAll('.breadcrumbs__separator')

    expect(separators).toHaveLength(2)
    expect(separators.every((separator) => separator.attributes('aria-hidden') === 'true')).toBe(
      true,
    )
    expect(separators[0]?.find('svg').exists()).toBe(true)
    expect(separators[1]?.text()).toBe('/')
  })
})

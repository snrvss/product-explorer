import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { Card } from '@/components/Card'
import { PRODUCT_ROUTE } from '@/router/route-names'
import CardGrid, { type CardItem } from '@/sections/RelatedProducts/CardGrid.vue'

const CARDS: CardItem[] = [
  { productId: 'ACC-0001', name: 'Fake cable' },
  { productId: 'ACC-0002', status: 'loading' },
  { productId: 'ACC-0003', status: 'error' },
]

function mountGrid() {
  return mount(CardGrid, {
    props: { cards: CARDS },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('CardGrid', () => {
  it('renders one list item with a card per product, in order', () => {
    const grid = mountGrid()

    const ids = grid.findAllComponents(Card).map((card) => card.props('productId'))

    expect(grid.findAll('ul > li')).toHaveLength(3)
    expect(ids).toEqual(['ACC-0001', 'ACC-0002', 'ACC-0003'])
  })

  it('passes name and status on to the cards', () => {
    const grid = mountGrid()

    const cards = grid.findAllComponents(Card)

    expect(cards[0]?.props('name')).toBe('Fake cable')
    expect(cards[0]?.props('status')).toBe('ready')
    expect(cards[1]?.props('status')).toBe('loading')
  })

  it('links every card to the product route, keeping the current country and language', () => {
    const grid = mountGrid()

    const to = grid.findAllComponents(Card)[0]?.props('to')

    expect(to).toEqual({ name: PRODUCT_ROUTE, params: { productId: 'ACC-0001' } })
  })

  it('emits retry with the product id of the failed card', async () => {
    const grid = mountGrid()

    await grid.get('.card-error button').trigger('click')

    expect(grid.emitted('retry')).toEqual([['ACC-0003']])
  })
})

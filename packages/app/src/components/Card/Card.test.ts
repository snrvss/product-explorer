import { beforeEach, describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import type { ProductImage } from '@product-explorer/core'
import { Card } from '@/components/Card'
import { ImagePlaceholder } from '@/components/ImagePlaceholder'
import { Skeleton } from '@/components/Skeleton'
import { setLanguage } from '@/i18n'

const IMAGE: ProductImage = {
  sizes: {
    140: 'https://images.test/ACC-0001-140.avif',
    200: 'https://images.test/ACC-0001-200.avif',
    300: 'https://images.test/ACC-0001-300.avif',
    400: 'https://images.test/ACC-0001-400.avif',
  },
}

const TO = '/de/en/product/ACC-0001'

type Status = 'loading' | 'ready' | 'error' | 'unavailable'

function mountCard(status: Status = 'ready', image: ProductImage | null = IMAGE) {
  return mount(Card, {
    props: { productId: 'ACC-0001', name: 'Fake cable', image, to: TO, status },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('Card', () => {
  beforeEach(() => {
    setLanguage('en')
  })

  describe('ready', () => {
    it('shows the product id, the name and the image', () => {
      const card = mountCard()

      expect(card.get('.card__id').text()).toBe('ACC-0001')
      expect(card.get('h3').text()).toBe('Fake cable')
      expect(card.get('img').attributes('src')).toBe(IMAGE.sizes[300])
    })

    it('offers every image size in srcset, so the browser picks a sharp one', () => {
      const card = mountCard()

      const srcset = card.get('img').attributes('srcset')

      expect(srcset).toBe(
        `${IMAGE.sizes[140]} 140w, ${IMAGE.sizes[200]} 200w, ${IMAGE.sizes[300]} 300w, ${IMAGE.sizes[400]} 400w`,
      )
    })

    it('hides the image from screen readers and loads it lazily', () => {
      const card = mountCard()

      const image = card.get('img')

      expect(image.attributes('alt')).toBe('')
      expect(image.attributes('loading')).toBe('lazy')
    })

    it('links to the product with a link text that is unique per card', () => {
      const card = mountCard()

      const link = card.getComponent(RouterLinkStub)

      expect(link.props('to')).toBe(TO)
      expect(link.text()).toBe('View product ACC-0001')
    })

    it('shows the arrow icon hidden from screen readers', () => {
      const card = mountCard()

      const arrow = card.get('.card__arrow')

      expect(arrow.element.tagName.toLowerCase()).toBe('svg')
      expect(arrow.attributes('aria-hidden')).toBe('true')
    })

    it('shows the default picture when the product has no image', () => {
      const card = mountCard('ready', null)

      expect(card.find('img.card__image').exists()).toBe(false)
      expect(card.findComponent(ImagePlaceholder).exists()).toBe(true)
      expect(card.get('.card__media').classes()).toContain('card__media--empty')
    })

    it('shows the default picture when the browser cannot load the image', async () => {
      const card = mountCard()

      await card.get('img.card__image').trigger('error')

      expect(card.find('img.card__image').exists()).toBe(false)
      expect(card.findComponent(ImagePlaceholder).exists()).toBe(true)
    })
  })

  describe('loading', () => {
    it('shows skeletons and the known product id, and is marked busy', () => {
      const card = mountCard('loading')

      expect(card.findAllComponents(Skeleton)).toHaveLength(2)
      expect(card.get('.card__id').text()).toBe('ACC-0001')
      expect(card.find('h3').exists()).toBe(false)
      expect(card.attributes('aria-busy')).toBe('true')
    })
  })

  describe('error', () => {
    it('shows the error message and keeps the link', () => {
      const card = mountCard('error')

      expect(card.text()).toContain('Details could not be loaded')
      expect(card.findComponent(RouterLinkStub).exists()).toBe(true)
    })

    it('emits retry when "Try again" is clicked', async () => {
      const card = mountCard('error')

      await card.get('.card-error button').trigger('click')

      expect(card.emitted('retry')).toHaveLength(1)
    })
  })

  describe('unavailable', () => {
    it('shows "No longer available" with the default picture, without retry or link', () => {
      const card = mountCard('unavailable')

      expect(card.text()).toContain('No longer available')
      expect(card.find('button').exists()).toBe(false)
      expect(card.findComponent(RouterLinkStub).exists()).toBe(false)
      expect(card.find('img.card__image').exists()).toBe(false)
      expect(card.findComponent(ImagePlaceholder).exists()).toBe(true)
    })
  })
})

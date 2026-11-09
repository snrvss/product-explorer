import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { ProductImage } from '@product-explorer/core'
import { ImagePlaceholder } from '@/components/ImagePlaceholder'
import { ProductPhoto } from '@/components/ProductPhoto'
import { setLanguage } from '@/i18n'

const IMAGE: ProductImage = {
  sizes: {
    140: 'https://images.test/MAN-0001-140.avif',
    200: 'https://images.test/MAN-0001-200.avif',
    300: 'https://images.test/MAN-0001-300.avif',
    400: 'https://images.test/MAN-0001-400.avif',
  },
}

const ALT = 'Fake sensor MAN-0001'

/*
 * jsdom has no modal dialogs, so showModal() and close() are replaced in this file only. They
 * behave like the browser for what the component relies on: `open` is set and removed, and
 * closing fires the `close` event (which the browser also fires after Escape).
 */
const originalShowModal = HTMLDialogElement.prototype.showModal
const originalClose = HTMLDialogElement.prototype.close
const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
})
const close = vi.fn(function (this: HTMLDialogElement) {
  if (!this.hasAttribute('open')) {
    return
  }
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
})

let wrapper: VueWrapper | undefined

function mountPhoto(image: ProductImage | null = IMAGE): VueWrapper {
  wrapper = mount(ProductPhoto, { props: { image, alt: ALT }, attachTo: document.body })
  return wrapper
}

async function openDialog(photo: VueWrapper): Promise<HTMLDialogElement> {
  await photo.get('button.product-photo__trigger').trigger('click')
  return photo.get('dialog').element as HTMLDialogElement
}

describe('ProductPhoto', () => {
  beforeEach(() => {
    setLanguage('en')
    HTMLDialogElement.prototype.showModal = showModal
    HTMLDialogElement.prototype.close = close
    document.documentElement.style.overflow = ''
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    HTMLDialogElement.prototype.showModal = originalShowModal
    HTMLDialogElement.prototype.close = originalClose
    vi.clearAllMocks()
  })

  describe('on the page', () => {
    it('shows the photo as a labelled button with a zoom hint', () => {
      const photo = mountPhoto()

      const trigger = photo.get('button.product-photo__trigger')

      expect(trigger.attributes('aria-label')).toBe(`Enlarge image: ${ALT}`)
      expect(trigger.attributes('aria-haspopup')).toBe('dialog')
      expect(trigger.find('.product-photo__zoom').exists()).toBe(true)
    })

    it('offers every size of the photo, so the browser picks a sharp one', () => {
      const photo = mountPhoto()

      const image = photo.get('img.product-photo__image')

      expect(image.attributes('src')).toBe(IMAGE.sizes[300])
      expect(image.attributes('srcset')).toBe(
        `${IMAGE.sizes[140]} 140w, ${IMAGE.sizes[200]} 200w, ${IMAGE.sizes[300]} 300w, ${IMAGE.sizes[400]} 400w`,
      )
    })

    it('shows a placeholder and offers no zoom when the product has no image', () => {
      const photo = mountPhoto(null)

      expect(photo.getComponent(ImagePlaceholder).text()).toBe('No image available')
      expect(photo.find('button').exists()).toBe(false)
      expect(photo.find('dialog').exists()).toBe(false)
    })

    it('falls back to the placeholder when the photo cannot be loaded', async () => {
      const photo = mountPhoto()

      await photo.get('img.product-photo__image').trigger('error')

      expect(photo.findComponent(ImagePlaceholder).exists()).toBe(true)
      expect(photo.find('button.product-photo__trigger').exists()).toBe(false)
      expect(photo.find('dialog').exists()).toBe(false)
    })
  })

  describe('opening', () => {
    it('opens the enlarged view as a modal with the largest size', async () => {
      const photo = mountPhoto()

      const dialog = await openDialog(photo)

      expect(showModal).toHaveBeenCalledTimes(1)
      expect(dialog.open).toBe(true)
      expect(dialog.getAttribute('aria-label')).toBe(ALT)
      const enlarged = photo.get('img.product-photo__enlarged')
      expect(enlarged.attributes('src')).toBe(IMAGE.sizes[400])
      expect(enlarged.attributes('alt')).toBe(ALT)
    })

    it('stops the page behind from scrolling', async () => {
      const photo = mountPhoto()

      await openDialog(photo)

      expect(document.documentElement.style.overflow).toBe('hidden')
    })

    it('offers a labelled close button', async () => {
      const photo = mountPhoto()

      await openDialog(photo)

      expect(photo.get('.product-photo__close').text()).toBe('Close')
    })

    it('shows a message when the enlarged photo cannot be loaded', async () => {
      const photo = mountPhoto()
      await openDialog(photo)

      await photo.get('img.product-photo__enlarged').trigger('error')

      expect(photo.find('img.product-photo__enlarged').exists()).toBe(false)
      expect(photo.get('.product-photo__message').text()).toBe('The image could not be loaded.')
    })
  })

  describe('closing', () => {
    it('closes with the close button and gives focus back to the photo', async () => {
      const photo = mountPhoto()
      const dialog = await openDialog(photo)

      await photo.get('.product-photo__close').trigger('click')

      expect(dialog.open).toBe(false)
      expect(document.activeElement).toBe(photo.get('button.product-photo__trigger').element)
      expect(photo.find('img.product-photo__enlarged').exists()).toBe(false)
    })

    it('lets the page scroll again, with its previous setting', async () => {
      document.documentElement.style.overflow = 'auto'
      const photo = mountPhoto()
      await openDialog(photo)

      await photo.get('.product-photo__close').trigger('click')

      expect(document.documentElement.style.overflow).toBe('auto')
    })

    it('cleans up when the browser closes it, e.g. on Escape', async () => {
      const photo = mountPhoto()
      const dialog = await openDialog(photo)

      dialog.close()
      await photo.vm.$nextTick()

      expect(document.documentElement.style.overflow).toBe('')
      expect(document.activeElement).toBe(photo.get('button.product-photo__trigger').element)
    })

    it('closes on a click on the dimmed area around the photo', async () => {
      const photo = mountPhoto()
      const dialog = await openDialog(photo)

      await photo.get('dialog').trigger('click')

      expect(dialog.open).toBe(false)
    })

    it('stays open on a click on the enlarged photo', async () => {
      const photo = mountPhoto()
      const dialog = await openDialog(photo)

      await photo.get('img.product-photo__enlarged').trigger('click')

      expect(dialog.open).toBe(true)
    })

    it('closes and lets the page scroll again when it is removed while open', async () => {
      const photo = mountPhoto()
      const dialog = await openDialog(photo)

      photo.unmount()
      wrapper = undefined

      expect(close).toHaveBeenCalled()
      expect(dialog.open).toBe(false)
      expect(document.documentElement.style.overflow).toBe('')
    })
  })
})

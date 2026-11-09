import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, type Pinia } from 'pinia'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import {
  createServices,
  FAKE_CABLE_FAMILY,
  FAKE_CABLE_FAMILY_VARIANTS,
  type Locale,
  MAIN_PRODUCT,
  MockProductAdapter,
  ServerError,
  TimeoutError,
} from '@product-explorer/core'
import { StatusCard } from '@/components/StatusCard'
import { KeyFeatures } from '@/components/KeyFeatures'
import { ProductInfo } from '@/components/ProductInfo'
import { ProductPhoto } from '@/components/ProductPhoto'
import { Skeleton } from '@/components/Skeleton'
import { VariantPicker } from '@/components/VariantPicker'
import { createCatalogServices } from '@/api'
import { setLanguage } from '@/i18n'
import { MainProduct } from '@/sections/MainProduct'
import { useProductStore } from '@/stores'

// The real factory picks the configured catalog adapter; each test makes it return services on the mock adapter.
vi.mock('@/api', () => ({ createCatalogServices: vi.fn() }))

const LOCALE: Locale = { country: 'de', language: 'en' }

interface Setup {
  /** Replaces `createCatalogServices`; default: services on the core mock adapter with its fake data */
  factory?: typeof createCatalogServices
}

/** Mounts the section with a real product store; the section starts loading `productId` itself. */
function mountSection(productId: string, setup: Setup = {}) {
  const pinia: Pinia = createPinia()
  vi.mocked(createCatalogServices).mockReset()
  vi.mocked(createCatalogServices).mockImplementation(
    setup.factory ?? (() => createServices(new MockProductAdapter())),
  )
  const section = mount(MainProduct, {
    props: { productId, ...LOCALE },
    global: {
      plugins: [pinia],
      stubs: { RouterLink: RouterLinkStub },
    },
  })
  const store = useProductStore(pinia)
  return { section, store }
}

/** Waits until the store has its result: the product or its error. */
async function untilLoaded(store: ReturnType<typeof useProductStore>): Promise<void> {
  await vi.waitFor(() => expect(store.isLoading).toBe(false))
  await flushPromises()
}

/** Mounts the section and waits for the result. */
async function mountWithResult(productId: string, setup: Setup = {}) {
  const mounted = mountSection(productId, setup)
  await untilLoaded(mounted.store)
  return mounted
}

describe('MainProduct', () => {
  beforeEach(() => {
    setLanguage('en')
  })

  describe('loading', () => {
    it('shows skeletons, is marked busy and tells screen readers', async () => {
      const slow = () => createServices(new MockProductAdapter({ delayMs: 50 }))
      const { section, store } = mountSection('MAN-0001', { factory: slow })
      await section.vm.$nextTick()

      expect(section.findAllComponents(Skeleton).length).toBeGreaterThan(0)
      expect(section.get('section').attributes('aria-busy')).toBe('true')
      expect(section.get('[role="status"]').text()).toBe('Loading product …')
      expect(section.findComponent(ProductInfo).exists()).toBe(false)
      await untilLoaded(store)
    })
  })

  describe('starting the store', () => {
    it('loads the product and its variants from its props, once, with the country and language', async () => {
      const adapter = new MockProductAdapter()
      const getProduct = vi.spyOn(adapter, 'getProduct')
      const getVariants = vi.spyOn(adapter, 'getVariants')

      await mountWithResult('MAN-0001', { factory: () => createServices(adapter) })

      // one services object per store: product and variants
      expect(createCatalogServices).toHaveBeenCalledTimes(2)
      expect(createCatalogServices).toHaveBeenCalledWith(LOCALE)
      expect(getProduct).toHaveBeenCalledTimes(1)
      expect(getVariants).toHaveBeenCalledTimes(1)
    })

    it('loads again when the language changes', async () => {
      const { section, store } = await mountWithResult('MAN-0001')

      await section.setProps({ language: 'de' })
      await untilLoaded(store)

      expect(createCatalogServices).toHaveBeenLastCalledWith({ country: 'de', language: 'de' })
    })

    it('cancels the request when it is removed', async () => {
      const slow = () => createServices(new MockProductAdapter({ delayMs: 50 }))
      const { section, store } = mountSection('MAN-0001', { factory: slow })

      section.unmount()

      expect(store.status).toBe('idle')
    })
  })

  describe('result', () => {
    it('is a section named after the product, no longer busy', async () => {
      const { section } = await mountWithResult('MAN-0001')

      expect(section.get('section').attributes('aria-label')).toBe('MAN-0001')
      expect(section.get('section').attributes('aria-busy')).toBeUndefined()
      expect(section.findComponent(Skeleton).exists()).toBe(false)
    })

    it('shows the photo first, described by product type and name', async () => {
      const { section } = await mountWithResult('MAN-0001')

      const photo = section.getComponent(ProductPhoto)

      expect(section.get('section').element.firstElementChild).toBe(photo.element)
      expect(photo.classes()).toContain('main-product__media')
      expect(photo.props('image')).toEqual(MAIN_PRODUCT.image)
      expect(photo.props('alt')).toBe('Fake product MAN-0001 MAN-0001')
    })

    it('shows the product information, then the key features below it', async () => {
      const { section } = await mountWithResult('MAN-0001')

      const details = section.get('.main-product__details')
      const features = section.getComponent(KeyFeatures)

      expect(section.getComponent(ProductInfo).props('product')).toEqual(MAIN_PRODUCT)
      expect(features.props('features')).toEqual(MAIN_PRODUCT.bulletPoints)
      expect(features.classes()).toContain('main-product__features')
      expect(details.element.lastElementChild).toBe(features.element)
    })

    it('starts the photo fresh for another product, which closes an open enlarged view', async () => {
      const { section, store } = await mountWithResult('MAN-0001')
      const before = section.getComponent(ProductPhoto).element

      await section.setProps({ productId: 'CBL-0001' })
      await untilLoaded(store)

      const after = section.getComponent(ProductPhoto).element
      expect(after === before).toBe(false)
    })

    it('loads the variants and shows the picker inside the product information', async () => {
      const cable = FAKE_CABLE_FAMILY[2]!

      const { section } = await mountWithResult(cable.id)

      const picker = section.getComponent(ProductInfo).getComponent(VariantPicker)
      expect(picker.props('currentId')).toBe('CBL-0003')
      expect(picker.props('variants')).toEqual(FAKE_CABLE_FAMILY_VARIANTS)
    })

    it('still shows the product, just without picker, when the variants fail', async () => {
      const adapter = new MockProductAdapter()
      vi.spyOn(adapter, 'getVariants').mockRejectedValue(new ServerError(503))

      const { section } = await mountWithResult('CBL-0003', {
        factory: () => createServices(adapter),
      })

      expect(section.findComponent(ProductInfo).exists()).toBe(true)
      expect(section.findComponent(VariantPicker).exists()).toBe(false)
      expect(section.findComponent(StatusCard).exists()).toBe(false)
    })

    it('shows no variant picker without variants', async () => {
      const { section } = await mountWithResult('MAN-0001')

      expect(section.findComponent(VariantPicker).exists()).toBe(false)
      expect(section.find('.product-info__variants').exists()).toBe(false)
    })

    it('leaves out the key features when the product has none', async () => {
      const { section } = await mountWithResult('NOA-0001')

      expect(section.findComponent(KeyFeatures).exists()).toBe(false)
    })
  })

  describe('failed', () => {
    it('says the product was not found, without "Try again"', async () => {
      const { section } = await mountWithResult('ZZZ-9999')

      const error = section.getComponent(StatusCard)

      expect(error.props('title')).toBe('Nothing found')
      expect(error.props('text')).toBe('Product “ZZZ-9999” was not found.')
      expect(error.props('retryable')).toBe(false)
      expect(section.findComponent(ProductInfo).exists()).toBe(false)
    })

    it('says the product id is invalid, without "Try again"', async () => {
      const { section } = await mountWithResult('not-an-id')

      const error = section.getComponent(StatusCard)

      expect(error.props('text')).toContain('“not-an-id” is not a valid product ID')
      expect(error.props('retryable')).toBe(false)
    })

    it('says the request took too long, and "Try again" loads the product', async () => {
      let calls = 0
      const factory: typeof createCatalogServices = () => {
        calls += 1
        const errors = calls === 1 ? { 'MAN-0001': new TimeoutError(8000) } : {}
        return createServices(new MockProductAdapter({ errors }))
      }
      const { section } = await mountWithResult('MAN-0001', { factory })
      const error = section.getComponent(StatusCard)
      expect(error.props('title')).toBe('Something went wrong')
      expect(error.props('text')).toBe(
        'Loading the product data is taking too long. Please try again.',
      )

      await error.get('button').trigger('click')
      await flushPromises()

      expect(section.findComponent(StatusCard).exists()).toBe(false)
      expect(section.getComponent(ProductInfo).props('product')).toEqual(MAIN_PRODUCT)
    })

    it('shows the general message with "Try again" for other retryable errors', async () => {
      const failing = new MockProductAdapter({ errors: { 'MAN-0001': new ServerError(503) } })

      const { section } = await mountWithResult('MAN-0001', {
        factory: () => createServices(failing),
      })

      const error = section.getComponent(StatusCard)
      expect(error.props('text')).toBe(
        'The product data could not be loaded. Please check your connection.',
      )
      expect(error.props('retryable')).toBe(true)
    })
  })
})

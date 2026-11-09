import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { StatusCard } from '@/components/StatusCard'
import { setLanguage } from '@/i18n'

const TITLE = 'Something went wrong'
const TEXT = 'The accessories could not be loaded.'

describe('StatusCard', () => {
  beforeEach(() => {
    setLanguage('en')
  })

  it('shows the illustration, the title and the text', () => {
    const card = mount(StatusCard, { props: { title: TITLE, text: TEXT } })

    expect(card.get('.status-card__title').text()).toBe(TITLE)
    expect(card.get('.status-card__text').text()).toBe(TEXT)
    expect(card.get('img').attributes('alt')).toBe('')
  })

  it('is not announced and offers no "Try again" when empty', () => {
    const card = mount(StatusCard, { props: { title: TITLE, text: TEXT } })

    expect(card.attributes('role')).toBeUndefined()
    expect(card.classes()).toContain('status-card--empty')
    expect(card.find('button').exists()).toBe(false)
  })

  it('is announced as an alert with its own illustration for errors', () => {
    const empty = mount(StatusCard, { props: { title: TITLE, text: TEXT } })
    const error = mount(StatusCard, { props: { title: TITLE, text: TEXT, kind: 'error' } })

    expect(error.attributes('role')).toBe('alert')
    expect(error.get('img').attributes('src')).not.toBe(empty.get('img').attributes('src'))
  })

  it('offers "Try again" when retryable and emits retry', async () => {
    const card = mount(StatusCard, {
      props: { title: TITLE, text: TEXT, kind: 'error', retryable: true },
    })

    await card.get('button').trigger('click')

    expect(card.get('button').text()).toBe('Try again')
    expect(card.emitted('retry')).toHaveLength(1)
  })

  it('renders further actions from the default slot', () => {
    const card = mount(StatusCard, {
      props: { title: TITLE, text: TEXT },
      slots: { default: '<a data-test="other" href="#">Other</a>' },
    })

    expect(card.find('.status-card__actions [data-test="other"]').exists()).toBe(true)
  })
})

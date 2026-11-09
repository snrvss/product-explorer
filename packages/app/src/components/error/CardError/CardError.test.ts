import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { CardError } from '@/components/error'
import { setLanguage } from '@/i18n'

const MESSAGE = 'Details could not be loaded'

describe('CardError', () => {
  beforeEach(() => {
    setLanguage('en')
  })

  it('shows the message without announcing it', () => {
    const wrapper = mount(CardError, { props: { message: MESSAGE } })

    expect(wrapper.text()).toContain(MESSAGE)
    expect(wrapper.attributes('role')).toBeUndefined()
  })

  it('hides "Try again" when trying again cannot help', () => {
    const wrapper = mount(CardError, { props: { message: MESSAGE } })

    const button = wrapper.find('button')

    expect(button.exists()).toBe(false)
  })

  it('emits retry when "Try again" is clicked', async () => {
    const wrapper = mount(CardError, { props: { message: MESSAGE, retryable: true } })

    await wrapper.get('button').trigger('click')

    expect(wrapper.get('button').text()).toBe('Try again')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})

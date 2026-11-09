import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { Tabs, type TabItem } from '@/components/Tabs'

const TABS: TabItem[] = [
  { id: 'first', label: 'First' },
  { id: 'second', label: 'Second' },
  { id: 'third', label: 'Third' },
]

let wrapper: VueWrapper | undefined

/** Mounts the tabs with a working v-model, like a parent component would. */
function mountTabs(active = 'first', slots: Record<string, string> = {}): VueWrapper {
  wrapper = mount(Tabs, {
    attachTo: document.body, // focus only works on attached elements
    props: {
      tabs: TABS,
      label: 'Related products',
      modelValue: active,
      'onUpdate:modelValue': (value: string) => wrapper?.setProps({ modelValue: value }),
    },
    slots: {
      first: '<p>Panel A</p>',
      second: '<p>Panel B</p>',
      third: '<p>Panel C</p>',
      ...slots,
    },
  })
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

describe('Tabs', () => {
  it('renders a labelled tab list with one tab per item', () => {
    const tabs = mountTabs()

    const list = tabs.get('[role="tablist"]')

    expect(list.attributes('aria-label')).toBe('Related products')
    expect(tabs.findAll('[role="tab"]').map((tab) => tab.text())).toEqual([
      'First',
      'Second',
      'Third',
    ])
  })

  it('marks only the active tab as selected and in the Tab order', () => {
    const tabs = mountTabs('second')

    const states = tabs
      .findAll('[role="tab"]')
      .map((tab) => [tab.attributes('aria-selected'), tab.attributes('tabindex')])

    expect(states).toEqual([
      ['false', '-1'],
      ['true', '0'],
      ['false', '-1'],
    ])
  })

  it('shows only the active panel and links it to its tab', () => {
    const tabs = mountTabs('second')

    const panels = tabs.findAll('[role="tabpanel"]')
    const visible = panels.filter((panel) => panel.isVisible())
    const secondTab = tabs.findAll('[role="tab"]')[1]

    expect(visible.map((panel) => panel.text())).toEqual(['Panel B'])
    expect(visible[0]?.attributes('aria-labelledby')).toBe(secondTab?.attributes('id'))
    expect(secondTab?.attributes('aria-controls')).toBe(visible[0]?.attributes('id'))
  })

  it('keeps hidden panels in the page, so their content survives switching', () => {
    const tabs = mountTabs()

    const panels = tabs.findAll('[role="tabpanel"]')

    expect(panels).toHaveLength(3)
  })

  it('activates a tab on click', async () => {
    const tabs = mountTabs()

    await tabs.findAll('[role="tab"]')[1]?.trigger('click')

    expect(tabs.emitted('update:modelValue')).toEqual([['second']])
    expect(tabs.get('.tabs__tab--active').text()).toBe('Second')
  })

  it.each([
    ['ArrowRight', 'first', 'second'],
    ['ArrowRight', 'third', 'first'],
    ['ArrowLeft', 'first', 'third'],
    ['ArrowLeft', 'second', 'first'],
    ['Home', 'third', 'first'],
    ['End', 'first', 'third'],
  ])('%s moves from %s to %s and focuses it', async (key, from, to) => {
    const tabs = mountTabs(from)
    const current = tabs.get(`.tabs__tab--active`)

    await current.trigger('keydown', { key })

    const active = tabs.get('.tabs__tab--active')
    expect(active.attributes('id')).toContain(`-tab-${to}`)
    expect(document.activeElement).toBe(active.element)
  })

  it('ignores other keys', async () => {
    const tabs = mountTabs()

    await tabs.get('.tabs__tab--active').trigger('keydown', { key: 'a' })

    expect(tabs.emitted('update:modelValue')).toBeUndefined()
  })

  it('renders the icon slot in every tab and passes the tab to it', () => {
    const tabs = mountTabs('first', {
      icon: '<template #icon="{ tab }"><i>{{ tab.id }}</i></template>',
    })

    const icons = tabs.findAll('.tabs__icon').map((icon) => icon.text())

    expect(icons).toEqual(['first', 'second', 'third'])
  })

  it('gives every tab group on a page its own ids', () => {
    const page = mount({
      components: { Tabs },
      setup: () => ({ tabs: TABS }),
      template: `
        <Tabs :tabs="tabs" label="One" model-value="first" />
        <Tabs :tabs="tabs" label="Two" model-value="first" />
      `,
    })

    const [idOne, idTwo] = page
      .findAll('[role="tablist"] > [role="tab"]:first-child')
      .map((tab) => tab.attributes('id'))

    expect(idOne).toBeDefined()
    expect(idOne).not.toBe(idTwo)
  })
})

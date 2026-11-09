<template>
  <div class="tabs">
    <div class="tabs__list" role="tablist" :aria-label="label" @keydown="onKeydown">
      <button
        v-for="tab in tabs"
        :id="tabId(tab.id)"
        :key="tab.id"
        :class="['tabs__tab', { 'tabs__tab--active': tab.id === active }]"
        type="button"
        role="tab"
        :aria-selected="tab.id === active"
        :aria-controls="panelId(tab.id)"
        :tabindex="tab.id === active ? 0 : -1"
        @click="active = tab.id"
      >
        <!-- Icon before the label (20 px), gets the tab as `{ tab }` -->
        <span v-if="$slots.icon" class="tabs__icon">
          <slot name="icon" :tab="tab" />
        </span>
        <span class="tabs__label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- One panel per tab, filled through a slot named like the tab id, e.g. #accessories -->
    <div
      v-for="tab in tabs"
      v-show="tab.id === active"
      :id="panelId(tab.id)"
      :key="tab.id"
      class="tabs__panel"
      role="tabpanel"
      :aria-labelledby="tabId(tab.id)"
      tabindex="0"
    >
      <slot :name="tab.id" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Tabs that switch between panels, e.g. "Accessories" and "Same category" in the mockup.
 *
 * @remarks
 * Follows the WAI-ARIA tabs pattern: only the active tab is in the Tab order, the arrow keys move
 * between tabs (wrapping around), Home and End jump to the first and last tab. A tab is activated
 * as soon as it gets focus.
 *
 * Inactive panels are only hidden, not removed, so their content (e.g. already loaded products)
 * stays when the user switches back.
 *
 * @example
 * ```vue
 * <Tabs v-model="activeTab" :tabs="tabs" label="Related products">
 *   <template #icon="{ tab }"><TabIcon :name="tab.id" /></template>
 *   <template #accessories>…</template>
 *   <template #category>…</template>
 * </Tabs>
 * ```
 */
import { useId, type PropType } from 'vue'

/** One tab. */
export interface TabItem {
  /** Unique id; also the name of the panel slot */
  id: string
  /** Visible, already translated label */
  label: string
}

defineProps({
  /** The tabs, in display order */
  tabs: {
    type: Array as PropType<TabItem[]>,
    required: true,
  },
  /** Name of the tab list for screen readers, e.g. "Related products" */
  label: {
    type: String,
    required: true,
  },
})

/** Id of the active tab. Updated on click and with the keyboard. */
const active = defineModel({
  type: String,
  required: true,
})

/** Makes the element ids unique, so several tab groups can be on one page. */
const baseId = useId()

function tabId(id: string): string {
  return `${baseId}-tab-${id}`
}

function panelId(id: string): string {
  return `${baseId}-panel-${id}`
}

/** Index of the tab to move to for a key, or `null` if the key is not handled. */
function targetIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count
    case 'ArrowLeft':
      return (current - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

function onKeydown(event: KeyboardEvent): void {
  const tabButtons = [
    ...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  ]
  const current = tabButtons.indexOf(event.target as HTMLButtonElement)
  if (current === -1) {
    return
  }
  const next = targetIndex(event.key, current, tabButtons.length)
  if (next === null) {
    return
  }
  event.preventDefault()
  tabButtons[next]?.focus()
  tabButtons[next]?.click()
}
</script>

<style scoped lang="scss">
.tabs {
  &__list {
    display: flex;
    gap: var(--space-2);
    overflow-x: auto; // many or long tabs scroll instead of breaking the layout on mobile
    // Drawn as an inset shadow, not a border: it sits underneath the tabs, so the active tab's line
    // covers it without the tabs overflowing the list (which would add a vertical scrollbar).
    box-shadow: inset 0 -1px 0 var(--color-border);
  }

  &__tab {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-6);
    border: 0;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--color-text-secondary);
    font-family: inherit;
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
    cursor: pointer;
    transition:
      color 150ms ease,
      border-color 150ms ease;

    // MD3 state layer, like BaseButton
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: currentColor;
      opacity: 0;
      transition: opacity 150ms ease;
      pointer-events: none;
    }

    &:hover::before {
      opacity: 0.08;
    }

    &:focus-visible::before,
    &:active::before {
      opacity: 0.1;
    }

    &--active {
      border-bottom-color: var(--color-primary);
      color: var(--color-primary-text);
    }
  }

  &__icon {
    display: inline-flex;
    width: var(--icon-size-md);
    height: var(--icon-size-md);

    :deep(svg) {
      width: 100%;
      height: 100%;
    }
  }

  &__panel {
    padding-top: var(--space-6);
  }
}
</style>

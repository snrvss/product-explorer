<template>
  <nav class="breadcrumbs" :aria-label="t('breadcrumbs.label')">
    <!-- An ordered list: the entries go from general to the current page -->
    <ol class="breadcrumbs__list">
      <li v-for="(item, index) in items" :key="index" class="breadcrumbs__item">
        <!-- Separator before every entry but the first, like the mockup: a chevron after an
             icon entry (Home), otherwise a slash. Only decoration. -->
        <span v-if="index > 0" class="breadcrumbs__separator" aria-hidden="true">
          <FontAwesomeIcon v-if="items[index - 1]?.icon" :icon="faChevronRight" />
          <template v-else>/</template>
        </span>

        <!-- A link when the entry has a destination, plain text otherwise. The last entry is
             the current page. -->
        <component
          :is="item.to ? RouterLink : 'span'"
          :to="item.to"
          :class="item.to ? 'breadcrumbs__link' : 'breadcrumbs__text'"
          :aria-current="index === items.length - 1 ? 'page' : undefined"
        >
          <!-- Icon entries show only the icon; the label stays for screen readers -->
          <FontAwesomeIcon v-if="item.icon" class="breadcrumbs__icon" :icon="item.icon" />
          <span :class="{ 'visually-hidden': item.icon }">{{ item.label }}</span>
        </component>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
/**
 * Breadcrumb trail above the page content, e.g. "Home › Products / PRD-1001".
 *
 * @remarks
 * Only shows the entries it gets; the page decides what they are and where they lead. Entries
 * with a destination become links (`RouterLink`), the others plain text. The last entry is the
 * current page and is marked with `aria-current="page"`.
 *
 * An entry with an icon shows only the icon; its label is still read by screen readers, so the
 * link has a name. Icons and separators are decoration and hidden from screen readers.
 *
 * @example
 * ```vue
 * <Breadcrumbs
 *   :items="[
 *     { label: 'Home', to: '/', icon: faHouse },
 *     { label: 'Products' },
 *     { label: 'PRD-1001' },
 *   ]"
 * />
 * ```
 */
import type { PropType } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { faChevronRight, type IconDefinition } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { t } from '@/i18n'

/** One entry of the trail. */
export interface BreadcrumbItem {
  /** Visible, already translated text; for icon entries only read by screen readers */
  label: string
  /** Where the entry leads; without it the entry is plain text */
  to?: RouteLocationRaw
  /** Shown instead of the label, e.g. a house for "Home" */
  icon?: IconDefinition
}

defineProps({
  /** The entries, from general to the current page (last) */
  items: {
    type: Array as PropType<BreadcrumbItem[]>,
    required: true,
  },
})
</script>

<style scoped lang="scss">
.breadcrumbs {
  min-width: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);

  &__list {
    display: flex;
    flex-wrap: wrap; // long trails wrap on phones instead of overflowing the page
    align-items: center;
    gap: var(--space-1) var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__item {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }

  &__separator {
    display: inline-flex;
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }

  &__link,
  &__text {
    display: inline-flex;
    align-items: center;
    overflow-wrap: anywhere; // long product ids break instead of overflowing
    border-radius: var(--radius-sm); // rounds the focus ring
  }

  &__link {
    color: inherit;
    text-decoration: none;

    &:hover {
      color: var(--color-text);
      text-decoration: underline;
    }
  }

  &__icon {
    width: var(--icon-size-md);
    height: var(--icon-size-md);
  }
}
</style>

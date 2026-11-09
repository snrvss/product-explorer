<template>
  <div ref="root" class="language-switcher" @keydown.esc="closeAndFocus" @focusout="onFocusOut">
    <!-- Globe, current language code and arrow, like in the mockup -->
    <button
      ref="trigger"
      class="language-switcher__trigger"
      type="button"
      :aria-label="`${label}: ${current?.name ?? language}`"
      :aria-expanded="isOpen"
      :aria-controls="listId"
      :title="label"
      @click="isOpen = !isOpen"
    >
      <FontAwesomeIcon class="language-switcher__icon" :icon="faGlobe" />
      <span class="language-switcher__code">{{ current?.code ?? language }}</span>
      <FontAwesomeIcon
        class="language-switcher__chevron"
        :icon="isOpen ? faChevronUp : faChevronDown"
      />
    </button>

    <!-- Languages, each in its own language so everybody finds theirs -->
    <ul v-show="isOpen" :id="listId" class="language-switcher__list">
      <li v-for="option in options" :key="option.value">
        <button
          :class="[
            'language-switcher__option',
            { 'language-switcher__option--current': option.value === language },
          ]"
          type="button"
          :lang="option.value"
          :aria-current="option.value === language || undefined"
          @click="choose(option.value)"
        >
          <span class="language-switcher__option-code">{{ option.code }}</span>
          {{ option.name }}
          <FontAwesomeIcon
            v-if="option.value === language"
            class="language-switcher__check"
            :icon="faCheck"
          />
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/**
 * Button with the current language ("EN") that opens a list to pick another one.
 *
 * @remarks
 * Only shows and changes the value it gets with `v-model`. What a switch does (changing the URL,
 * reloading the data) is decided by whoever uses it, like with `ThemeToggle`.
 *
 * Built as a disclosure: the button says with `aria-expanded` whether the list is open, and the
 * list holds plain buttons, so Tab and Enter work as usual. Each language is written in its own
 * language and marked with `lang`, so screen readers pronounce it right. The list closes after a
 * choice, on Escape (focus goes back to the button), and when focus or a click leaves it.
 *
 * @example
 * ```vue
 * <LanguageSwitcher
 *   v-model="language"
 *   :label="t('language.change')"
 *   :options="[{ value: 'de', code: 'DE', name: 'Deutsch' }, { value: 'en', code: 'EN', name: 'English' }]"
 * />
 * ```
 */
import { computed, onBeforeUnmount, ref, useId, useTemplateRef, watch, type PropType } from 'vue'
import { faCheck, faChevronDown, faChevronUp, faGlobe } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

/** One language in the list. */
export interface LanguageOption {
  /** Value for `v-model`, e.g. `en` */
  value: string
  /** Short code on the button, e.g. `EN` */
  code: string
  /** Name in the language itself, e.g. `English` */
  name: string
}

const props = defineProps({
  /** What the button does, already translated, e.g. "Change language" */
  label: {
    type: String,
    required: true,
  },
  /** The languages to choose from */
  options: {
    type: Array as PropType<LanguageOption[]>,
    required: true,
  },
})

/** The current language, e.g. `en`. Updated when the user picks another one. */
const language = defineModel({
  type: String,
  required: true,
})

const root = useTemplateRef<HTMLDivElement>('root')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const listId = useId()
const isOpen = ref(false)

const current = computed(() => props.options.find((option) => option.value === language.value))

function choose(value: string): void {
  isOpen.value = false
  trigger.value?.focus()
  if (value !== language.value) {
    language.value = value
  }
}

function closeAndFocus(): void {
  if (!isOpen.value) {
    return
  }
  isOpen.value = false
  trigger.value?.focus()
}

/** Tabbing out of the switcher closes the list. */
function onFocusOut(event: FocusEvent): void {
  if (!root.value?.contains(event.relatedTarget as Node | null)) {
    isOpen.value = false
  }
}

/** A click anywhere outside closes the list. */
function onDocumentPointerDown(event: PointerEvent): void {
  if (!root.value?.contains(event.target as Node | null)) {
    isOpen.value = false
  }
}

// Listens only while open, so closed switchers cost nothing
watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('pointerdown', onDocumentPointerDown)
  } else {
    document.removeEventListener('pointerdown', onDocumentPointerDown)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})
</script>

<style scoped lang="scss">
.language-switcher {
  position: relative;

  &__trigger {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    height: 2.5rem; // 40px, like the icon buttons next to it
    padding-inline: var(--space-3);
    overflow: hidden; // keeps the state layer inside the pill
    border: 0;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--color-text);
    font: inherit;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;

    // MD3 state layer, like ThemeToggle
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
    &:active::before,
    &[aria-expanded='true']::before {
      opacity: 0.1;
    }
  }

  &__icon {
    width: var(--icon-size-lg);
    height: var(--icon-size-lg);
  }

  &__chevron {
    width: var(--icon-size-sm);
    height: var(--icon-size-sm);
  }

  &__list {
    position: absolute;
    top: calc(100% + var(--space-2));
    right: 0;
    z-index: 10; // above the page content below the header
    min-width: 11rem;
    margin: 0;
    padding: var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    box-shadow: var(--shadow-card);
    list-style: none;
  }

  &__option {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text);
    font: inherit;
    font-size: var(--font-size-sm);
    text-align: start;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: var(--color-surface-chip);
    }

    &--current {
      color: var(--color-primary-text);
      font-weight: var(--font-weight-semibold);
    }
  }

  &__option-code {
    min-width: 1.5rem;
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
  }

  &__check {
    width: var(--icon-size-sm);
    height: var(--icon-size-sm);
    margin-left: auto;
  }
}
</style>

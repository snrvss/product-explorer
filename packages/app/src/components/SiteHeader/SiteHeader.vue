<template>
  <header class="site-header">
    <div class="site-header__inner">
      <div class="site-header__brand">
        <!-- Logo before the title, e.g. a BaseAvatar -->
        <slot name="logo" />
        <span class="site-header__title">{{ title }}</span>
      </div>

      <!-- Actions on the right, e.g. the language switcher -->
      <div v-if="$slots.actions" class="site-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * Header bar at the top of the page: logo and app name on the left, actions on the right.
 *
 * @remarks
 * The header only arranges its content; what goes into the slots is decided by the page. The
 * title is not a heading (`<h1>`), because the page's `<h1>` is the product.
 *
 * @example
 * ```vue
 * <SiteHeader title="Product Explorer">
 *   <template #logo><BaseAvatar :src="logoUrl" alt="" /></template>
 *   <template #actions><LanguageSwitcher /></template>
 * </SiteHeader>
 * ```
 */
defineProps({
  /** App name next to the logo, e.g. "Product Explorer" */
  title: {
    type: String,
    required: true,
  },
})
</script>

<style scoped lang="scss">
.site-header {
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background);

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    max-width: var(--container-max);
    min-height: 4.5rem; // 72px, like the mockup
    margin-inline: auto;
    padding: var(--space-2) var(--container-padding);
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    min-width: 0; // lets a long title shrink instead of pushing the actions out
  }

  &__title {
    overflow: hidden;
    color: var(--color-text);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-shrink: 0;
    color: var(--color-text);
  }
}
</style>

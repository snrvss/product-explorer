<template>
  <footer class="site-footer">
    <div class="site-footer__inner">
      <div class="site-footer__brand">
        <!-- Logo before the title, e.g. a small BaseAvatar -->
        <slot name="logo" />
        <span class="site-footer__title">{{ title }}</span>
      </div>

      <!-- Actions on the right, e.g. legal links or the language switcher -->
      <div v-if="$slots.actions" class="site-footer__actions">
        <slot name="actions" />
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
/**
 * Footer bar at the bottom of the page: logo and app name on the left, actions on the right.
 *
 * @remarks
 * Built like `SiteHeader`, but quieter: smaller title and secondary text colour, on the page
 * background like the mockup. On small screens the actions move below the logo.
 *
 * @example
 * ```vue
 * <SiteFooter title="Product Explorer">
 *   <template #logo><BaseAvatar :src="logoUrl" alt="" size="small" /></template>
 * </SiteFooter>
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
.site-footer {
  border-top: 1px solid var(--color-border);
  background: var(--color-background);

  &__inner {
    display: flex;
    flex-wrap: wrap; // actions move below the logo when there is no room
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3) var(--space-6);
    max-width: var(--container-max);
    min-height: 4rem; // 64px, like the mockup
    margin-inline: auto;
    padding: var(--space-3) var(--container-padding);
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }

  &__title {
    overflow: hidden;
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2) var(--space-6);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
  }
}
</style>

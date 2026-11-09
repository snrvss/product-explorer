import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/core', 'packages/infrastructure', 'packages/app'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.{ts,vue}'],
      exclude: ['**/*.test.ts'],
      reporter: ['text', 'html'],
    },
  },
})

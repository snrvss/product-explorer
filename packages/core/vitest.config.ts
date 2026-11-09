import { defineConfig } from 'vitest/config'
import { srcAlias } from '../../vite-plugin-src-alias'

export default defineConfig({
  plugins: [srcAlias()],
  test: { name: 'core', environment: 'node', globals: true, passWithNoTests: true },
})

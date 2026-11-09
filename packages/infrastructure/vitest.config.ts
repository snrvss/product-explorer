import { defineConfig } from 'vitest/config'
import { srcAlias } from '../../vite-plugin-src-alias'

export default defineConfig({
  plugins: [srcAlias()],
  test: { name: 'infrastructure', environment: 'node', globals: true, passWithNoTests: true },
})

import { defineProject, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default defineProject((env) =>
  mergeConfig(viteConfig(env), {
    test: { name: 'app', environment: 'jsdom', globals: true, passWithNoTests: true },
  }),
)

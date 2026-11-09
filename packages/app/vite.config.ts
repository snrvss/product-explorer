import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { srcAlias } from '../../vite-plugin-src-alias'

export default defineConfig(({ mode }) => {
  // `.env*` files live in the repository root, next to `.env.example`
  const envDir = fileURLToPath(new URL('../..', import.meta.url))
  const env = loadEnv(mode, envDir, 'VITE_')

  // Only with VITE_CATALOG_ADAPTER=http: the browser calls same-origin /api/*, and Vite forwards
  // it to the catalog API. That avoids CORS in development; a real deployment needs the same rule
  // in its web server. The default mock catalog needs no proxy.
  const apiUrl = env['VITE_CATALOG_API_URL']?.trim()
  const catalogApiProxy =
    env['VITE_CATALOG_ADAPTER']?.trim().toLowerCase() === 'http' && apiUrl
      ? {
          '/api': {
            target: apiUrl,
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/api/, ''),
          },
        }
      : undefined

  return {
    envDir,
    // `@/…` → src of the package that contains the importing file (app or core)
    plugins: [srcAlias(), vue()],
    // vue-i18n build flags: Composition API only, no devtools in production (avoids its console warning)
    define: {
      __VUE_I18N_FULL_INSTALL__: true,
      __VUE_I18N_LEGACY_API__: false,
      __INTLIFY_PROD_DEVTOOLS__: false,
    },
    css: {
      preprocessorOptions: {
        // Components can write `@use 'breakpoints' as *;` instead of a relative path
        scss: { loadPaths: [fileURLToPath(new URL('./src/styles', import.meta.url))] },
      },
    },
    // The same proxy for `npm run dev` and for trying the production build with `vite preview`
    server: { proxy: catalogApiProxy },
    preview: { proxy: catalogApiProxy },
  }
})

import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  {
    name: 'product-explorer/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  globalIgnores(['**/node_modules/**', '**/dist/**', '**/coverage/**']),

  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,

  {
    ...pluginVitest.configs.recommended,
    files: ['**/*.test.ts'],
  },

  {
    name: 'product-explorer/rules',
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // All icons come from Font Awesome Free, so templates never draw their own
      'vue/no-restricted-html-elements': [
        'error',
        {
          element: ['svg'],
          message:
            'Use <FontAwesomeIcon :icon="faName" /> from @fortawesome/free-solid-svg-icons instead of an inline <svg>.',
        },
      ],
    },
  },

  // Formatting is Prettier's job (npm run format); this turns off ESLint rules that would clash with it
  skipFormatting,
)

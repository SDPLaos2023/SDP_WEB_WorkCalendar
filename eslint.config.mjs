// @ts-check
// @ts-ignore
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // --- Vue Template ---
    'vue/no-multiple-template-root': 'off',
    'vue/max-attributes-per-line': ['error', { singleline: 3, multiline: 1 }],
    'vue/no-v-for-template-key-on-child': 'error',
    'vue/no-use-v-if-with-v-for': 'error',
    'vue/require-v-for-key': 'error',
    'vue/component-definition-name-casing': ['error', 'PascalCase'],
    'vue/component-tags-order': ['error', {
      order: ['script', 'template']
    }],

    // --- TypeScript ---
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

    // --- General ---
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
  }
})

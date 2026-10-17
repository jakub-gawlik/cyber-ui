import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import lit from 'eslint-plugin-lit';
import wc from 'eslint-plugin-wc';
import globals from 'globals';

export default defineConfig([
  // smoke apps are standalone projects that consume the packed tarball
  globalIgnores(['dist/', 'smoke/']),

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    files: ['src/**/*.ts'],
    extends: [lit.configs['flat/recommended'], wc.configs['flat/recommended']],
    languageOptions: { globals: globals.browser },
    settings: { wc: { elementBaseClasses: ['LitElement'] } },
    rules: {
      // from wc's best-practice set — the ones that fit Lit elements
      // (guard-super-call is noise: LitElement always defines the callbacks;
      // child traversal on connect is deliberate in <cyber-tabs>)
      'wc/no-constructor-attributes': 'error',
      'wc/no-constructor-params': 'error',
      'wc/no-typos': 'error',
      'wc/require-listener-teardown': 'error',
      'lit/no-this-assign-in-render': 'error',
      'lit/no-useless-template-literals': 'error',
    },
  },

  {
    files: ['tests/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },

  {
    files: ['**/*.{js,mjs}', '*.config.ts'],
    languageOptions: { globals: globals.node },
  },
]);

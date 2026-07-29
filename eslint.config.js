import eslintReact from '@eslint-react/eslint-plugin';
import eslintJs from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const typescriptFiles = [
  'src/**/*.{ts,tsx}',
  'tests/**/*.{ts,tsx}',
  'scripts/**/*.{ts,tsx}',
  'vite.config.ts',
];
const javascriptFiles = [
  'eslint.config.js',
  'tests/**/*.mjs',
  'server/**/*.mjs',
  'scripts/**/*.mjs',
];
const reactFiles = ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'scripts/**/*.tsx'];

export default defineConfig([
  globalIgnores(['dist/**', '.profile-cache/**']),
  {
    files: [...typescriptFiles, ...javascriptFiles],
    extends: [eslintJs.configs.recommended],
  },
  {
    files: typescriptFiles,
    extends: [tseslint.configs.recommended],
  },
  {
    files: reactFiles,
    extends: [eslintReact.configs['recommended-typescript'], reactHooks.configs.flat.recommended],
    settings: {
      'react-x': {
        version: 'detect',
        importSource: 'react',
      },
    },
    rules: {
      '@eslint-react/exhaustive-deps': 'off',
      '@eslint-react/set-state-in-effect': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['tests/**/*.{ts,tsx,mjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['eslint.config.js', 'server/**/*.mjs', 'scripts/**/*.{ts,tsx,mjs}', 'vite.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  prettier,
]);

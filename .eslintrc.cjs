module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: [],
  overrides: [
    {
      files: ['server/**/*.mjs', 'scripts/**/*.mjs'],
      env: { browser: false, node: true },
    },
    {
      files: ['tests/**/*.{ts,tsx,mjs}'],
      env: { node: true },
    },
    {
      files: ['vite.config.ts'],
      env: { browser: false, node: true },
    },
  ],
  rules: {},
  settings: {
    react: {
      version: 'detect',
    },
  },
};

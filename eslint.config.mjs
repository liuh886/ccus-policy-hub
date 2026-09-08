// @ts-check
import eslintPluginAstro from 'eslint-plugin-astro';
import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';

export default [
  // Astro components: recommended astro rules; typescript parser for <script> blocks.
  ...eslintPluginAstro.configs.recommended,
  {
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: {
        parser: typescriptParser,
        extraFileExtensions: ['.astro'],
      },
    },
    rules: {
      'no-alert': 'error',
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
    },
  },
  // TypeScript sources.
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { '@typescript-eslint': typescriptPlugin },
    rules: {
      ...typescriptPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-alert': 'error',
    },
  },
  // Plain ESM (scripts, agent logic, src/lib): light-touch but real.
  {
    files: ['**/*.mjs'],
    rules: {
      'no-alert': 'error',
      'no-useless-escape': 'error',
      'no-prototype-builtins': 'error',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '.astro/**', '.worktrees/**'],
  },
];

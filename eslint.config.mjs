// @ts-check
import eslintPluginAstro from 'eslint-plugin-astro';
import globals from 'globals';
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
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-alert': 'error',
      'no-useless-escape': 'error',
      'no-prototype-builtins': 'error',
      // no-undef 曾缺席，导致 scripts/ 里删掉一个函数后要到运行时才炸
      // （findDivEnd 被误删，eslint 全绿，运行时 ReferenceError）。
      'no-undef': 'error',
    },
  },
  // src/lib 下的模块运行在浏览器里（DOM 操作），需要浏览器全局。
  {
    files: ['src/lib/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '.astro/**', '.worktrees/**'],
  },
];

// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://liuh886.github.io',
  base: '/ccus-policy-hub',
  trailingSlash: 'always',
  server: {
    host: '127.0.0.1',
    port: 30000,
  },
  preview: {
    host: '127.0.0.1',
    port: 30001,
  },
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    // @ts-ignore
    plugins: [tailwindcss()],
  },
  integrations: [sitemap()],
});

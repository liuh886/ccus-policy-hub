import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const layout = readFileSync(
  new URL('../src/layouts/Layout.astro', import.meta.url),
  'utf8'
);
const runtime = readFileSync(
  new URL('../src/scripts/ga4.ts', import.meta.url),
  'utf8'
);

test('CCUS keeps GA4 lightweight and Astro-router aware', () => {
  assert.match(layout, /import '\.\.\/scripts\/ga4'/);
  assert.match(runtime, /G-4WP54VZF14/);
  assert.match(runtime, /googletagmanager\.com\/gtag\/js/);
  assert.match(runtime, /send_page_view:\s*false/);
  assert.match(runtime, /astro:page-load/);
  assert.match(runtime, /'event', 'page_view'/);
});

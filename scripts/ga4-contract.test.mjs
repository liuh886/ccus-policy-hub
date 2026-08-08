import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const layout = readFileSync(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');

test('CCUS keeps GA4 lightweight and Astro-router aware', () => {
  assert.match(layout, /G-4WP54VZF14/);
  assert.match(layout, /googletagmanager\.com\/gtag\/js\?id=G-4WP54VZF14/);
  assert.match(layout, /send_page_view:\s*false/);
  assert.match(layout, /astro:page-load/);
  assert.match(layout, /gtag\('event', 'page_view'/);
});

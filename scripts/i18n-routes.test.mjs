/**
 * i18n-routes.test.mjs
 *
 * Unit tests and route-drift guard for src/lib/i18nRoutes.ts.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  EN_ROUTE_SEGMENTS,
  hasEnCounterpart,
  localeAlternateURLs,
  stripSiteBase,
  withTrailingSlash,
} from '../src/lib/i18nRoutes.ts';

describe('stripSiteBase', () => {
  it('strips a matching site base prefix', () => {
    assert.strictEqual(
      stripSiteBase('/ccus-policy-hub/policy/us-45q-ira/', '/ccus-policy-hub'),
      '/policy/us-45q-ira/'
    );
    assert.strictEqual(
      stripSiteBase('/ccus-policy-hub/', '/ccus-policy-hub'),
      '/'
    );
  });

  it('returns "/" when pathname exactly equals siteBase', () => {
    assert.strictEqual(
      stripSiteBase('/ccus-policy-hub', '/ccus-policy-hub'),
      '/'
    );
  });

  it('returns the original pathname when siteBase does not match', () => {
    assert.strictEqual(
      stripSiteBase('/other-site/policy/', '/ccus-policy-hub'),
      '/other-site/policy/'
    );
  });

  it('handles an empty siteBase', () => {
    assert.strictEqual(
      stripSiteBase('/policy/us-45q-ira/', ''),
      '/policy/us-45q-ira/'
    );
    assert.strictEqual(stripSiteBase('/', ''), '/');
    assert.strictEqual(stripSiteBase('', ''), '/');
  });
});

describe('hasEnCounterpart', () => {
  it('returns true for the root path "/"', () => {
    assert.strictEqual(hasEnCounterpart('/'), true);
  });

  it('returns true for every EN_ROUTE_SEGMENTS route including nested detail slugs', () => {
    for (const segment of EN_ROUTE_SEGMENTS) {
      assert.strictEqual(
        hasEnCounterpart(`/${segment}/`),
        true,
        `/${segment}/`
      );
      assert.strictEqual(hasEnCounterpart(`/${segment}`), true, `/${segment}`);
      assert.strictEqual(
        hasEnCounterpart(`/${segment}/sample-slug/`),
        true,
        `/${segment}/sample-slug/`
      );
    }
    assert.strictEqual(hasEnCounterpart('/policy/us-45q-ira/'), true);
  });

  it('returns false for unmapped zh-only or unknown paths', () => {
    assert.strictEqual(hasEnCounterpart('/reports/2601_ESG30/'), false);
    assert.strictEqual(hasEnCounterpart('/reports/'), false);
    assert.strictEqual(hasEnCounterpart('/unknown/'), false);
    assert.strictEqual(hasEnCounterpart('/unknown/nested/path/'), false);
    assert.strictEqual(hasEnCounterpart(''), false);
  });
});

describe('withTrailingSlash', () => {
  it('appends a trailing slash when missing', () => {
    assert.strictEqual(withTrailingSlash('/policy'), '/policy/');
    assert.strictEqual(
      withTrailingSlash('/ccus-policy-hub/en'),
      '/ccus-policy-hub/en/'
    );
    assert.strictEqual(withTrailingSlash(''), '/');
  });

  it('is idempotent when a trailing slash is already present', () => {
    assert.strictEqual(withTrailingSlash('/'), '/');
    assert.strictEqual(withTrailingSlash('/policy/'), '/policy/');
    assert.strictEqual(
      withTrailingSlash('/ccus-policy-hub/en/'),
      '/ccus-policy-hub/en/'
    );
  });
});

describe('localeAlternateURLs', () => {
  const origin = 'https://ccus-policy.example.org';
  const siteBase = '/ccus-policy-hub';

  it('maps zh home to zh and en home alternates', () => {
    const { zhURL, enURL } = localeAlternateURLs(
      siteBase,
      `${origin}${siteBase}/`
    );
    assert.strictEqual(zhURL.href, `${origin}${siteBase}/`);
    assert.strictEqual(enURL.href, `${origin}${siteBase}/en/`);
  });

  it('maps en home to zh and en home alternates', () => {
    const { zhURL, enURL } = localeAlternateURLs(
      siteBase,
      `${origin}${siteBase}/en/`
    );
    assert.strictEqual(zhURL.href, `${origin}${siteBase}/`);
    assert.strictEqual(enURL.href, `${origin}${siteBase}/en/`);
  });

  it('maps a mapped zh detail route to its en detail counterpart', () => {
    const { zhURL, enURL } = localeAlternateURLs(
      siteBase,
      `${origin}${siteBase}/policy/us-45q-ira/`
    );
    assert.strictEqual(zhURL.href, `${origin}${siteBase}/policy/us-45q-ira/`);
    assert.strictEqual(
      enURL.href,
      `${origin}${siteBase}/en/policy/us-45q-ira/`
    );
  });

  it('maps a mapped en detail route back to its zh detail counterpart', () => {
    const { zhURL, enURL } = localeAlternateURLs(
      siteBase,
      `${origin}${siteBase}/en/policy/us-45q-ira/`
    );
    assert.strictEqual(zhURL.href, `${origin}${siteBase}/policy/us-45q-ira/`);
    assert.strictEqual(
      enURL.href,
      `${origin}${siteBase}/en/policy/us-45q-ira/`
    );
  });

  it('falls back to `${siteBase}/en/` for an unmapped zh path', () => {
    const { zhURL, enURL } = localeAlternateURLs(
      siteBase,
      `${origin}${siteBase}/reports/2601_ESG30/`
    );
    assert.strictEqual(zhURL.href, `${origin}${siteBase}/reports/2601_ESG30/`);
    assert.strictEqual(enURL.href, `${origin}${siteBase}/en/`);
  });

  it('works identically with an empty siteBase and normalizes trailing slashes', () => {
    const mapped = localeAlternateURLs('', `${origin}/policy/us-45q-ira`);
    assert.strictEqual(mapped.zhURL.href, `${origin}/policy/us-45q-ira/`);
    assert.strictEqual(mapped.enURL.href, `${origin}/en/policy/us-45q-ira/`);

    const unmapped = localeAlternateURLs('', `${origin}/reports/2601_ESG30`);
    assert.strictEqual(unmapped.zhURL.href, `${origin}/reports/2601_ESG30/`);
    assert.strictEqual(unmapped.enURL.href, `${origin}/en/`);
  });
});

describe('EN_ROUTE_SEGMENTS route drift guard', () => {
  it('matches the exact sorted set of top-level directories under src/pages/en/', () => {
    const enPagesDir = new URL('../src/pages/en/', import.meta.url);
    const actualDirs = fs
      .readdirSync(enPagesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const expectedSegments = [...EN_ROUTE_SEGMENTS].sort();

    assert.deepStrictEqual(
      actualDirs,
      expectedSegments,
      'EN_ROUTE_SEGMENTS must match top-level directories in src/pages/en/'
    );
  });
});

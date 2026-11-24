/**
 * facilities-index.test.mjs
 *
 * Pure helper unit tests for src/scripts/facilitiesIndex.ts (zero DOM dependency).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFacilityListUrl,
  hasActiveFacilityQuery,
  readFacilityFilterState,
  renderFacilityPaginationHtml,
} from '../src/scripts/facilitiesIndex.ts';
import { makePair } from '../src/i18n/ui.ts';

describe('readFacilityFilterState', () => {
  it('parses URL search parameters and preserves valid currentPage', () => {
    const state = readFacilityFilterState(
      '?q=Sleipner&country=Norway&status=Operational&sector=Power&type=Storage&sort=capacity-desc',
      3
    );

    assert.deepStrictEqual(state, {
      q: 'Sleipner',
      country: 'Norway',
      status: 'Operational',
      sector: 'Power',
      type: 'Storage',
      sort: 'capacity-desc',
      page: 3,
    });
  });

  it('defaults missing query fields and falls back invalid page numbers to 1', () => {
    assert.deepStrictEqual(readFacilityFilterState('', 0), {
      q: '',
      country: '',
      status: '',
      sector: '',
      type: '',
      sort: 'default',
      page: 1,
    });
    assert.strictEqual(readFacilityFilterState('', Number.NaN).page, 1);
    assert.strictEqual(readFacilityFilterState('', -5).page, 1);
  });
});

describe('hasActiveFacilityQuery', () => {
  const emptyState = {
    q: '',
    country: '',
    status: '',
    sector: '',
    type: '',
    sort: 'default',
  };

  it('returns false when all filters are empty and sort is default', () => {
    assert.strictEqual(hasActiveFacilityQuery(emptyState), false);
  });

  it('returns true when any filter field or non-default sort is set', () => {
    assert.strictEqual(
      hasActiveFacilityQuery({ ...emptyState, q: 'north' }),
      true
    );
    assert.strictEqual(
      hasActiveFacilityQuery({ ...emptyState, country: 'China' }),
      true
    );
    assert.strictEqual(
      hasActiveFacilityQuery({ ...emptyState, status: '运行中' }),
      true
    );
    assert.strictEqual(
      hasActiveFacilityQuery({ ...emptyState, sector: 'Cement' }),
      true
    );
    assert.strictEqual(
      hasActiveFacilityQuery({ ...emptyState, type: 'Capture' }),
      true
    );
    assert.strictEqual(
      hasActiveFacilityQuery({ ...emptyState, sort: 'year-asc' }),
      true
    );
  });
});

describe('buildFacilityListUrl', () => {
  const defaultState = {
    q: '',
    country: '',
    status: '',
    sector: '',
    type: '',
    sort: 'default',
  };

  it('builds root path for page 1 and /page/N/ for page > 1 with clean trailing slashes', () => {
    assert.strictEqual(
      buildFacilityListUrl({
        siteBase: '',
        listPath: '/facilities',
        state: defaultState,
        page: 1,
      }),
      '/facilities/'
    );
    assert.strictEqual(
      buildFacilityListUrl({
        siteBase: '',
        listPath: '/facilities/',
        state: defaultState,
        page: 2,
      }),
      '/facilities/page/2/'
    );
  });

  it('prepends siteBase without duplicate slashes and encodes active query params', () => {
    const url = buildFacilityListUrl({
      siteBase: '/hub/',
      listPath: '/en/facilities/',
      state: {
        q: 'Northern Lights & CO2',
        country: 'Norway',
        status: '',
        sector: 'Power & Heat',
        type: 'T&S',
        sort: 'capacity-desc',
      },
      page: 3,
    });

    assert.strictEqual(
      url,
      '/hub/en/facilities/page/3/?q=Northern+Lights+%26+CO2&country=Norway&sector=Power+%26+Heat&type=T%26S&sort=capacity-desc'
    );
  });

  it('omits default sort from the query string', () => {
    const url = buildFacilityListUrl({
      siteBase: '/hub',
      listPath: '/facilities',
      state: { ...defaultState, country: '中国', sort: 'default' },
      page: 1,
    });

    assert.strictEqual(url, '/hub/facilities/?country=%E4%B8%AD%E5%9B%BD');
    assert.ok(!url.includes('sort='));
  });
});

describe('renderFacilityPaginationHtml', () => {
  it('returns empty string when total pages <= 1', () => {
    assert.strictEqual(
      renderFacilityPaginationHtml({ page: 1, total: 1, tp: makePair('zh') }),
      ''
    );
    assert.strictEqual(
      renderFacilityPaginationHtml({ page: 1, total: 0, tp: makePair('en') }),
      ''
    );
  });

  it('renders localized Chinese pagination with disabled prev on page 1', () => {
    const html = renderFacilityPaginationHtml({
      page: 1,
      total: 4,
      tp: makePair('zh'),
    });

    assert.ok(html.includes('第 1 页 / 共 4 页'));
    assert.ok(html.includes('data-page="0"'));
    assert.ok(html.includes('disabled>&larr; 上一页</button>'));
    assert.ok(html.includes('data-page="2"'));
    assert.ok(html.includes('>下一页 &rarr;</button>'));
    assert.ok(!html.includes('disabled>下一页'));
  });

  it('renders localized English pagination with both buttons enabled on middle pages and disabled next on last page', () => {
    const middleHtml = renderFacilityPaginationHtml({
      page: 2,
      total: 3,
      tp: makePair('en'),
    });

    assert.ok(middleHtml.includes('Page 2 of 3'));
    assert.ok(middleHtml.includes('data-page="1"'));
    assert.ok(middleHtml.includes('data-page="3"'));
    assert.ok(!middleHtml.includes('disabled'));

    const lastHtml = renderFacilityPaginationHtml({
      page: 3,
      total: 3,
      tp: makePair('en'),
    });

    assert.ok(lastHtml.includes('Page 3 of 3'));
    assert.ok(lastHtml.includes('disabled>Next &rarr;</button>'));
    assert.ok(!lastHtml.includes('disabled>&larr; Previous'));
  });
});

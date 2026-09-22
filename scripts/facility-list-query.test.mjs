/**
 * facility-list-query.test.mjs
 *
 * Regression guard for the facilities directory bug where the card grid was
 * filtered page-by-page (48 server-rendered cards) while the dropdowns and
 * map covered the full dataset. Selecting Indonesia therefore surfaced only
 * the Indonesian facilities that happened to sit on the current page.
 *
 * These helpers must always operate on the FULL dataset; pagination is
 * applied last, after filtering and stats.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeFacilityStats,
  facilityCapacity,
  facilityYear,
  filterFacilities,
  paginateFacilities,
  sortFacilityItems,
} from '../src/lib/facilityListQuery.mjs';
import {
  escapeHtml,
  renderFacilityCardHtml,
} from '../src/lib/facilityCard.mjs';

const item = (overrides) => ({
  id: '1',
  name: 'Facility',
  country: 'Indonesia',
  region: '',
  sector: 'Power',
  type: 'Capture',
  status: 'Operational',
  estimatedCapacity: 1,
  announcedCapacityMax: null,
  announcement: '2020',
  hub: '',
  partners: '',
  operator: '',
  phase: '',
  precision: 'exact',
  ...overrides,
});

describe('filterFacilities', () => {
  it('matches every country across the full dataset, not a page slice', () => {
    const items = [
      ...Array.from({ length: 20 }, (_, i) =>
        item({ id: `id-${i}`, country: 'Indonesia' })
      ),
      ...Array.from({ length: 30 }, (_, i) =>
        item({ id: `us-${i}`, country: 'United States' })
      ),
    ];
    const result = filterFacilities(items, { country: 'Indonesia' });
    assert.equal(result.length, 20);
  });

  it('combines country, status, sector and type filters', () => {
    const items = [
      item({ id: '1', country: 'Indonesia', status: 'Operational' }),
      item({ id: '2', country: 'Indonesia', status: 'Planned' }),
      item({ id: '3', country: 'Norway', status: 'Operational' }),
      item({
        id: '4',
        country: 'Indonesia',
        status: 'Operational',
        type: 'Storage',
      }),
    ];
    const result = filterFacilities(items, {
      country: 'Indonesia',
      status: 'Operational',
      type: 'Capture',
    });
    assert.deepEqual(
      result.map((r) => r.id),
      ['1']
    );
  });

  it('searches name, hub, partners, operator, country and region', () => {
    const items = [
      item({ id: '1', name: 'Northern Lights' }),
      item({ id: '2', hub: 'Acorn Hub' }),
      item({ id: '3', partners: 'Shell Equinor' }),
      item({ id: '4', operator: 'Climeworks' }),
      item({ id: '5', country: 'Japan' }),
      item({ id: '6', region: 'Rotterdam' }),
    ];
    const ids = (q) => filterFacilities(items, { q }).map((r) => r.id);
    assert.deepEqual(ids('northern'), ['1']);
    assert.deepEqual(ids('acorn'), ['2']);
    assert.deepEqual(ids('equinor'), ['3']);
    assert.deepEqual(ids('clime'), ['4']);
    assert.deepEqual(ids('japan'), ['5']);
    assert.deepEqual(ids('rotter'), ['6']);
  });
});

describe('sortFacilityItems', () => {
  it('sorts capacity high-to-low using estimated then announced capacity', () => {
    const items = [
      item({ id: '1', estimatedCapacity: 1 }),
      item({ id: '2', estimatedCapacity: null, announcedCapacityMax: 9 }),
      item({ id: '3', estimatedCapacity: 5 }),
    ];
    assert.deepEqual(
      sortFacilityItems(items, 'capacity-desc').map((r) => r.id),
      ['2', '3', '1']
    );
  });

  it('sorts by year ascending and pushes unknown years last', () => {
    const items = [
      item({ id: '1', announcement: '2022' }),
      item({ id: '2', announcement: '' }),
      item({ id: '3', announcement: '2019' }),
    ];
    assert.deepEqual(
      sortFacilityItems(items, 'year-asc').map((r) => r.id),
      ['3', '1', '2']
    );
  });

  it('keeps canonical order for the default sort', () => {
    const items = [item({ id: '1' }), item({ id: '2' }), item({ id: '3' })];
    assert.deepEqual(
      sortFacilityItems(items, 'default').map((r) => r.id),
      ['1', '2', '3']
    );
  });
});

describe('paginateFacilities', () => {
  const items = Array.from({ length: 110 }, (_, i) => item({ id: `f-${i}` }));

  it('slices the filtered set and reports the page count', () => {
    const result = paginateFacilities(items, 2, 48);
    assert.equal(result.total, 3);
    assert.equal(result.page, 2);
    assert.equal(result.items.length, 48);
    assert.equal(result.items[0].id, 'f-48');
  });

  it('clamps out-of-range pages', () => {
    assert.equal(paginateFacilities(items, 99, 48).page, 3);
    assert.equal(paginateFacilities(items, 0, 48).page, 1);
  });
});

describe('computeFacilityStats', () => {
  it('counts over the full filtered set, not a single page', () => {
    const items = [
      ...Array.from({ length: 20 }, (_, i) =>
        item({ id: `i-${i}`, country: 'Indonesia', estimatedCapacity: 2 })
      ),
      item({ id: 'x', country: 'Norway', status: 'Under construction' }),
    ];
    const filtered = filterFacilities(items, { country: 'Indonesia' });
    const stats = computeFacilityStats(filtered);
    assert.equal(stats.count, 20);
    assert.equal(stats.operational, 20);
    assert.equal(stats.operationalCap, 40);
    assert.equal(stats.constructionCap, 0);
  });

  it('tracks construction capacity separately', () => {
    const stats = computeFacilityStats([
      item({ status: '建设中', estimatedCapacity: 3 }),
      item({
        status: 'Under construction',
        estimatedCapacity: null,
        announcedCapacityMax: 4,
      }),
      item({ status: 'Planned', estimatedCapacity: 5 }),
    ]);
    assert.equal(stats.constructionCap, 7);
    assert.equal(stats.capacity, 12);
  });
});

describe('facility helpers', () => {
  it('falls back from estimated to announced capacity', () => {
    assert.equal(
      facilityCapacity({ estimatedCapacity: null, announcedCapacityMax: 2.5 }),
      2.5
    );
    assert.equal(facilityCapacity({}), 0);
  });

  it('treats missing years as 9999', () => {
    assert.equal(facilityYear({ announcement: '' }), 9999);
    assert.equal(facilityYear({ announcement: '2021' }), 2021);
  });
});

describe('renderFacilityCardHtml', () => {
  const ctx = {
    base: '',
    lang: 'zh',
    t: (key) => key,
    tp: (zh) => zh,
  };

  it('renders the facility name, country and detail link', () => {
    const html = renderFacilityCardHtml(item({ id: '42', name: 'Acorn' }), ctx);
    assert.ok(html.includes('Acorn'));
    assert.ok(html.includes('Indonesia'));
    assert.ok(html.includes('/facilities/42/'));
  });

  it('escapes untrusted values', () => {
    const html = renderFacilityCardHtml(
      item({ name: '<script>alert(1)</script>' }),
      ctx
    );
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
  });

  it('escapeHtml handles all sensitive characters', () => {
    assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
  });
});

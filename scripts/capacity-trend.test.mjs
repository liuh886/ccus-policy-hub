/**
 * capacity-trend.test.mjs
 *
 * Pure helper unit tests for src/scripts/capacityTrend.ts (zero DOM dependency).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampYearRange,
  combineCapacitySeries,
  computeSliderTrackPercent,
  renderCapacityErrorHtml,
  resolveYearIndex,
} from '../src/scripts/capacityTrend.ts';

describe('combineCapacitySeries', () => {
  const allSeries = [
    { year: 2020, operational: 40, pipeline: 100 },
    { year: 2025, operational: 65, pipeline: 250 },
  ];
  const typeSeries = {
    capture: [
      { year: 2020, operational: 15, pipeline: 40 },
      { year: 2025, operational: 25, pipeline: 100 },
    ],
    storage: [
      { year: 2020, operational: 20, pipeline: 50 },
      { year: 2025, operational: 30, pipeline: 120 },
    ],
  };

  it('uses the allSeries fast path when all types are selected', () => {
    const combined = combineCapacitySeries(
      allSeries,
      typeSeries,
      ['capture', 'storage'],
      2
    );

    // Note: allSeries intentionally includes uncategorized records (40 > 15+20).
    assert.deepStrictEqual(combined, {
      operational: [40, 65],
      pipeline: [100, 250],
    });
  });

  it('sums only selected type series for partial selection', () => {
    const captureOnly = combineCapacitySeries(
      allSeries,
      typeSeries,
      ['capture'],
      2
    );
    assert.deepStrictEqual(captureOnly, {
      operational: [15, 25],
      pipeline: [40, 100],
    });

    const subsetOfThree = combineCapacitySeries(
      allSeries,
      typeSeries,
      ['capture', 'storage'],
      3
    );
    assert.deepStrictEqual(subsetOfThree, {
      operational: [35, 55],
      pipeline: [90, 220],
    });
  });

  it('returns an all-zero series when zero types are selected', () => {
    const empty = combineCapacitySeries(allSeries, typeSeries, [], 2);
    assert.deepStrictEqual(empty, {
      operational: [0, 0],
      pipeline: [0, 0],
    });
  });
});

describe('clampYearRange', () => {
  it('leaves non-colliding min < max ranges unchanged', () => {
    assert.deepStrictEqual(clampYearRange(1990, 2030, 'min'), {
      min: 1990,
      max: 2030,
    });
    assert.deepStrictEqual(clampYearRange(1990, 2030, 'max'), {
      min: 1990,
      max: 2030,
    });
    assert.deepStrictEqual(clampYearRange(1990, 2030, null), {
      min: 1990,
      max: 2030,
    });
  });

  it('clamps min to max - 1 when min slider collides with or passes max', () => {
    assert.deepStrictEqual(clampYearRange(2030, 2030, 'min'), {
      min: 2029,
      max: 2030,
    });
    assert.deepStrictEqual(clampYearRange(2035, 2030, 'min'), {
      min: 2029,
      max: 2030,
    });
  });

  it('clamps max to min + 1 when max slider or unspecified target collides', () => {
    assert.deepStrictEqual(clampYearRange(2020, 2020, 'max'), {
      min: 2020,
      max: 2021,
    });
    assert.deepStrictEqual(clampYearRange(2025, 2020, 'max'), {
      min: 2025,
      max: 2026,
    });
    assert.deepStrictEqual(clampYearRange(2020, 2020, null), {
      min: 2020,
      max: 2021,
    });
  });
});

describe('computeSliderTrackPercent', () => {
  it('computes full-span and interior track percentages accurately', () => {
    assert.deepStrictEqual(computeSliderTrackPercent(1970, 2040, 1970, 2040), {
      leftPercent: 0,
      widthPercent: 100,
    });
    assert.deepStrictEqual(computeSliderTrackPercent(2005, 2040, 1970, 2040), {
      leftPercent: 50,
      widthPercent: 50,
    });
    assert.deepStrictEqual(computeSliderTrackPercent(1990, 2030, 1970, 2050), {
      leftPercent: 25,
      widthPercent: 50,
    });
  });

  it('clamps out-of-range inputs and guards zero/negative span', () => {
    assert.deepStrictEqual(computeSliderTrackPercent(1950, 2100, 1970, 2040), {
      leftPercent: 0,
      widthPercent: 100,
    });
    assert.deepStrictEqual(computeSliderTrackPercent(2020, 2010, 1970, 2040), {
      leftPercent: ((2020 - 1970) / 70) * 100,
      widthPercent: 0,
    });
    assert.deepStrictEqual(computeSliderTrackPercent(2000, 2020, 2020, 2020), {
      leftPercent: 0,
      widthPercent: 0,
    });
  });
});

describe('resolveYearIndex', () => {
  it('returns the exact index when present and falls back to the last index when missing', () => {
    const labels = [1970, 1990, 2020, 2030];
    assert.strictEqual(resolveYearIndex(labels, 1970), 0);
    assert.strictEqual(resolveYearIndex(labels, 2020), 2);
    assert.strictEqual(resolveYearIndex(labels, 2030), 3);
    assert.strictEqual(resolveYearIndex(labels, 2099), 3);
    assert.strictEqual(resolveYearIndex(labels, 1900), 3);
  });
});

describe('renderCapacityErrorHtml', () => {
  it('escapes XSS payloads across title, note, action label, and link href', () => {
    const html = renderCapacityErrorHtml({
      title: 'Trend <script>alert(1)</script>',
      note: 'Check "data" & <img onerror=1>',
      actionLabel: 'Open <b>list</b>',
      facilitiesHref: '/facilities/?a="1"&b=<2>',
    });

    assert.doesNotMatch(html, /<script>/);
    assert.doesNotMatch(html, /<img /);
    assert.doesNotMatch(html, /<b>list<\/b>/);
    assert.ok(html.includes('Trend &lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(
      html.includes('Check &quot;data&quot; &amp; &lt;img onerror=1&gt;')
    );
    assert.ok(html.includes('Open &lt;b&gt;list&lt;/b&gt;'));
    assert.ok(
      html.includes('href="/facilities/?a=&quot;1&quot;&amp;b=&lt;2&gt;"')
    );
  });
});

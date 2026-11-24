/**
 * facility-map.test.mjs
 *
 * Pure helper unit tests for src/scripts/facilityMap.ts (zero DOM dependency).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyFacilityMarkerStatus,
  getEsriTileUrl,
  markerVisualStyle,
  renderFacilityPopupHtml,
  renderMapErrorHtml,
} from '../src/scripts/facilityMap.ts';
import { t as translateUi } from '../src/i18n/ui.ts';

describe('classifyFacilityMarkerStatus', () => {
  it('classifies Chinese and English operational statuses as emerald operational', () => {
    assert.deepStrictEqual(classifyFacilityMarkerStatus('运行中'), {
      color: '#10b981',
      category: 'operational',
    });
    assert.deepStrictEqual(classifyFacilityMarkerStatus('Operational'), {
      color: '#10b981',
      category: 'operational',
    });
  });

  it('classifies Chinese and English construction statuses as orange construction', () => {
    assert.deepStrictEqual(classifyFacilityMarkerStatus('建设中'), {
      color: '#f97316',
      category: 'construction',
    });
    assert.deepStrictEqual(classifyFacilityMarkerStatus('Under construction'), {
      color: '#f97316',
      category: 'construction',
    });
  });

  it('classifies Chinese and English planned statuses as blue planned', () => {
    assert.deepStrictEqual(classifyFacilityMarkerStatus('计划中'), {
      color: '#3b82f6',
      category: 'planned',
    });
    assert.deepStrictEqual(classifyFacilityMarkerStatus('Planned'), {
      color: '#3b82f6',
      category: 'planned',
    });
  });

  it('classifies cancelled, suspended, and unknown statuses as slate inactive', () => {
    for (const status of ['Cancelled', '已取消', 'Suspended', '', 'Unknown']) {
      assert.deepStrictEqual(classifyFacilityMarkerStatus(status), {
        color: '#94a3b8',
        category: 'inactive',
      });
    }
  });
});

describe('markerVisualStyle', () => {
  it('returns distinct opacity and border widths by coordinate precision', () => {
    assert.deepStrictEqual(markerVisualStyle('exact'), {
      opacity: 1.0,
      borderWidth: '2.5px',
    });
    assert.deepStrictEqual(markerVisualStyle('state'), {
      opacity: 0.7,
      borderWidth: '1.5px',
    });
    assert.deepStrictEqual(markerVisualStyle('country'), {
      opacity: 0.4,
      borderWidth: '1.5px',
    });
    assert.deepStrictEqual(markerVisualStyle('approximate'), {
      opacity: 0.4,
      borderWidth: '1.5px',
    });
  });
});

describe('getEsriTileUrl', () => {
  it('returns dark and light Esri canvas basemap URLs', () => {
    const darkUrl = getEsriTileUrl(true);
    const lightUrl = getEsriTileUrl(false);

    assert.match(
      darkUrl,
      /World_Dark_Gray_Base\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}$/
    );
    assert.match(
      lightUrl,
      /World_Light_Gray_Base\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}$/
    );
    assert.notStrictEqual(darkUrl, lightUrl);
  });
});

describe('renderFacilityPopupHtml', () => {
  it('escapes XSS payloads in text fields and URI-encodes facility IDs in href', () => {
    const html = renderFacilityPopupHtml(
      {
        id: 'fac/1?x="y"&z=<script>',
        name: '<img src=x onerror=alert(1)>',
        coordinates: [51.5, -0.1],
        precision: 'exact',
        status: 'Operational <b onclick="x">',
        estimatedCapacity: null,
        announcedCapacityMax: 2.5,
        type: 'Capture & "Storage"',
      },
      {
        directoryHref: '/en/facilities/',
        t: (key) => translateUi('en', key),
      }
    );

    assert.doesNotMatch(html, /<img /);
    assert.doesNotMatch(html, /<script>/);
    assert.doesNotMatch(html, /<b onclick/);
    assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
    assert.ok(html.includes('Capture &amp; &quot;Storage&quot;'));
    assert.ok(
      html.includes('2.5 Mtpa | Operational &lt;b onclick=&quot;x&quot;&gt;')
    );
    assert.ok(html.includes('Precision: exact'));
    assert.ok(
      html.includes(
        `href="/en/facilities/${encodeURIComponent('fac/1?x="y"&z=<script>')}/"`
      )
    );
    assert.ok(html.includes('>Details</a>'));
  });

  it('uses estimatedCapacity before announcedCapacityMax and renders zh precision labels', () => {
    const stateHtml = renderFacilityPopupHtml(
      {
        id: 42,
        name: '齐鲁石化',
        coordinates: [36.8, 118.3],
        precision: 'state',
        status: '运行中',
        estimatedCapacity: 1.0,
        announcedCapacityMax: 5.0,
        type: '全产业链',
      },
      {
        directoryHref: '/facilities/',
        t: (key) => translateUi('zh', key),
      }
    );

    assert.ok(stateHtml.includes('1 Mtpa | 运行中'));
    assert.ok(stateHtml.includes('定位精度: 省级/区域'));
    assert.ok(stateHtml.includes('href="/facilities/42/"'));
    assert.ok(stateHtml.includes('>查看详情</a>'));

    const countryHtml = renderFacilityPopupHtml(
      {
        id: 'c-1',
        name: 'Demo',
        coordinates: [10, 20],
        precision: 'country',
        status: '计划中',
        estimatedCapacity: null,
        announcedCapacityMax: null,
        type: 'Storage',
      },
      {
        directoryHref: '/facilities/',
        t: (key) => translateUi('zh', key),
      }
    );

    assert.ok(countryHtml.includes('0 Mtpa | 计划中'));
    assert.ok(countryHtml.includes('定位精度: 国家级'));
  });
});

describe('renderMapErrorHtml', () => {
  it('renders note when provided, omits note paragraph when empty, and escapes HTML', () => {
    const withNote = renderMapErrorHtml(
      'Failed <script>',
      'Note "quote" & more',
      'Retry <b>now</b>',
      '/facilities/?x="1"'
    );

    assert.doesNotMatch(withNote, /<script>/);
    assert.ok(withNote.includes('Failed &lt;script&gt;'));
    assert.ok(withNote.includes('Note &quot;quote&quot; &amp; more'));
    assert.ok(withNote.includes('Retry &lt;b&gt;now&lt;/b&gt;'));
    assert.ok(withNote.includes('href="/facilities/?x=&quot;1&quot;"'));

    const withoutNote = renderMapErrorHtml(
      'Map failed to load',
      '',
      'Browse list',
      '/en/facilities/'
    );
    assert.ok(withoutNote.includes('Map failed to load'));
    assert.ok(!withoutNote.includes('text-sm text-slate-500'));
    assert.ok(withoutNote.includes('href="/en/facilities/"'));
  });
});

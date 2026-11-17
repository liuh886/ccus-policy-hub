import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

import {
  POLICY_RELATED_FACILITIES_SSR_CAP,
  buildDirectoryMeta,
  buildLocalizationsByPolicyId,
  buildLocaleIndexData,
  buildRelationshipByPair,
  getRelationshipTrustRank,
  hasRenderableCoordinates,
  sliceRelatedFacilities,
  sortRelatedFacilities,
} from '../src/lib/dataIndexCore.mjs';
import { FACILITY_LIST_FIELDS } from '../src/lib/facilityListPayload.mjs';
import { MAP_PAYLOAD_FIELDS } from '../src/lib/mapPayload.mjs';
import { computeFacilityStats } from '../src/lib/facilityListQuery.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const makeFacility = (id, dataOverrides = {}) => ({
  id: String(id),
  data: {
    id: String(id),
    name: `Facility ${id}`,
    lang: 'en',
    country: 'United States',
    region: '',
    type: 'Capture',
    status: 'Operational',
    estimatedCapacity: 1,
    announcedCapacityMax: 1,
    announcement: '2022',
    hub: '',
    partners: [],
    operator: '',
    phase: '',
    precision: 'exact',
    sector: 'Power',
    coordinates: [30.1, -95.2],
    relatedPolicies: [],
    ...dataOverrides,
  },
});

const makePolicy = (id, dataOverrides = {}) => ({
  id: String(id),
  data: {
    id: String(id),
    title: `Policy ${id}`,
    country: 'United States',
    year: 2022,
    status: 'Active',
    category: 'Incentive',
    analysis: {
      incentive: { score: 80 },
      statutory: { score: 70 },
      market: { score: 60 },
      strategic: { score: 75 },
      mrv: { score: 65 },
    },
    relatedFacilities: [],
    ...dataOverrides,
  },
});

describe('getRelationshipTrustRank & sortRelatedFacilities', () => {
  it('orders trust levels strictly: verified evidence > evidence > sector > subnational_region > country > unknown', () => {
    const policyId = 'us-45q-ira';
    const rels = buildRelationshipByPair([
      { policy_id: policyId, facility_id: '10', link_type: 'country' },
      {
        policy_id: policyId,
        facility_id: '20',
        link_type: 'subnational_region',
      },
      { policy_id: policyId, facility_id: '30', link_type: 'sector' },
      {
        policy_id: policyId,
        facility_id: '40',
        link_type: 'evidence',
        review_status: 'draft',
        evidence: 'Draft note',
        source_url: 'https://example.org/draft',
      },
      {
        policy_id: policyId,
        facility_id: '50',
        link_type: 'evidence',
        review_status: 'verified',
        evidence: 'IRS award citation',
        source_url: 'https://example.org/verified',
      },
    ]);

    const facilities = [
      makeFacility('99', { estimatedCapacity: 100 }), // missing relationship -> lowest rank
      makeFacility('10', { estimatedCapacity: 50 }),
      makeFacility('20', { estimatedCapacity: 40 }),
      makeFacility('30', { estimatedCapacity: 30 }),
      makeFacility('40', { estimatedCapacity: 20 }),
      makeFacility('50', { estimatedCapacity: 1 }),
    ];

    const sorted = sortRelatedFacilities(facilities, policyId, rels);
    assert.deepEqual(
      sorted.map((f) => f.id),
      ['50', '40', '30', '20', '10', '99']
    );
  });

  it('breaks trust ties by estimatedCapacity desc then numeric id asc', () => {
    const policyId = 'p1';
    const rels = buildRelationshipByPair([
      { policy_id: policyId, facility_id: '2', link_type: 'country' },
      { policy_id: policyId, facility_id: '10', link_type: 'country' },
      { policy_id: policyId, facility_id: '5', link_type: 'country' },
    ]);

    const facilities = [
      makeFacility('10', { estimatedCapacity: 2.5 }),
      makeFacility('2', { estimatedCapacity: 2.5 }),
      makeFacility('5', { estimatedCapacity: 8.0 }),
    ];

    const sorted = sortRelatedFacilities(facilities, policyId, rels);
    assert.deepEqual(
      sorted.map((f) => f.id),
      ['5', '2', '10']
    );
  });

  it('keeps verified evidence higher than unverified or malformed evidence URLs', () => {
    const verified = {
      link_type: 'evidence',
      review_status: 'verified',
      evidence: 'Verified text',
      source_url: 'https://example.org/proof',
    };
    const invalidProtocol = {
      ...verified,
      source_url: 'ftp://example.org/proof',
    };
    const missingEvidence = { ...verified, evidence: '   ' };

    assert.equal(getRelationshipTrustRank(verified), 0);
    assert.equal(getRelationshipTrustRank(invalidProtocol), 1);
    assert.equal(getRelationshipTrustRank(missingEvidence), 1);
    assert.equal(getRelationshipTrustRank(null), 5);
  });
});

describe('buildRelationshipByPair & O(1) lookup parity', () => {
  it('matches Array.find parity on public/data/relationships.json and retains highest-trust entry on duplicates', () => {
    const raw = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'public/data/relationships.json'), 'utf8')
    );
    const byPair = buildRelationshipByPair(raw.records);
    assert.ok(byPair.size > 0);

    for (const sample of raw.records.slice(0, 25)) {
      const fromMap = byPair.get(`${sample.policy_id}::${sample.facility_id}`);
      assert.ok(fromMap);
      assert.equal(fromMap.policy_id, sample.policy_id);
      assert.equal(fromMap.facility_id, sample.facility_id);
    }

    // Duplicate pair with higher-trust second record must keep the higher-trust one.
    const deduped = buildRelationshipByPair([
      { policy_id: 'p1', facility_id: 'f1', link_type: 'country' },
      {
        policy_id: 'p1',
        facility_id: 'f1',
        link_type: 'evidence',
        review_status: 'verified',
        evidence: 'Direct',
        source_url: 'https://example.org/1',
      },
    ]);
    assert.equal(deduped.get('p1::f1')?.link_type, 'evidence');
    assert.equal(deduped.get('p1::f1')?.review_status, 'verified');
  });

  it('groups localizations by policy_id and ignores malformed rows', () => {
    const grouped = buildLocalizationsByPolicyId([
      { policy_id: 'p1', dimension: 'incentive' },
      { policy_id: 'p1', dimension: 'market' },
      { dimension: 'orphan' },
      null,
    ]);
    assert.equal(grouped.size, 1);
    assert.equal(grouped.get('p1')?.length, 2);
  });
});

describe('POLICY_RELATED_FACILITIES_SSR_CAP slicing', () => {
  it('fixes SSR cap at 12 and slices deterministically', () => {
    assert.equal(POLICY_RELATED_FACILITIES_SSR_CAP, 12);

    const exactlyTwelve = Array.from({ length: 12 }, (_, i) =>
      makeFacility(i + 1)
    );
    const exactSlice = sliceRelatedFacilities(exactlyTwelve);
    assert.equal(exactSlice.visible.length, 12);
    assert.equal(exactSlice.total, 12);
    assert.equal(exactSlice.hasMore, false);

    const many = Array.from({ length: 30 }, (_, i) => makeFacility(i + 1));
    const cappedSlice = sliceRelatedFacilities(many);
    assert.equal(cappedSlice.visible.length, 12);
    assert.equal(cappedSlice.total, 30);
    assert.equal(cappedSlice.hasMore, true);
    assert.equal(cappedSlice.visible[0].id, '1');
    assert.equal(cappedSlice.visible[11].id, '12');

    // Negative / empty input handling
    const emptySlice = sliceRelatedFacilities(null);
    assert.deepEqual(emptySlice.visible, []);
    assert.equal(emptySlice.total, 0);
    assert.equal(emptySlice.hasMore, false);
  });
});

describe('directoryMeta & JSON payload parity', () => {
  it('emits locked facility list & map schemas and accurate initialStats', () => {
    const facilities = [
      makeFacility('10', {
        country: 'United States',
        type: 'Full chain',
        status: 'Operational',
        estimatedCapacity: 2.0,
        coordinates: [29.7, -95.3],
        precision: 'exact',
      }),
      makeFacility('2', {
        country: 'China',
        type: 'Capture',
        status: 'Under construction',
        estimatedCapacity: 1.5,
        coordinates: [0.001, 0.001], // placeholder -> excluded as null coordinates
        precision: 'country',
      }),
      makeFacility('3', {
        country: 'China',
        type: 'Storage',
        status: 'Planned',
        estimatedCapacity: 3.0,
        coordinates: [35.0, 105.0],
        precision: 'country',
      }),
    ];

    const metaZh = buildDirectoryMeta({
      facilities,
      lang: 'zh',
      countryMap: {
        'United States': { zh: '美国', en: 'United States' },
        China: { zh: '中国', en: 'China' },
      },
    });

    assert.equal(metaZh.listItems.length, 3);
    assert.deepEqual(
      metaZh.listItems.map((i) => i.id),
      ['2', '3', '10']
    );
    assert.deepEqual(Object.keys(metaZh.listItems[0]), [
      ...FACILITY_LIST_FIELDS,
    ]);
    assert.equal(metaZh.listItems.find((i) => i.id === '10')?.type, '全产业链');
    assert.deepEqual(
      metaZh.initialStats,
      computeFacilityStats(metaZh.listItems)
    );
    assert.equal(metaZh.initialStats.count, 3);
    assert.equal(metaZh.initialStats.operational, 1);
    assert.equal(metaZh.initialStats.operationalCap, 2.0);
    assert.equal(metaZh.initialStats.constructionCap, 1.5);

    assert.equal(metaZh.mapData.length, 3);
    assert.deepEqual(Object.keys(metaZh.mapData[0]), [...MAP_PAYLOAD_FIELDS]);
    // Both China country-precision records resolve to canonical China centroid (or null if none valid)
    const chinaMapEntry = metaZh.mapData.find((m) => m.id === '2');
    assert.deepEqual(chinaMapEntry?.coordinates, [35, 105]);
  });

  it('rejects placeholder, NaN, and malformed coordinates', () => {
    assert.equal(hasRenderableCoordinates([0.001, 0.001]), false);
    assert.equal(hasRenderableCoordinates([0, 0]), false);
    assert.equal(hasRenderableCoordinates([NaN, 10]), false);
    assert.equal(hasRenderableCoordinates([10]), false);
    assert.equal(hasRenderableCoordinates(null), false);
    assert.equal(hasRenderableCoordinates([29.7, -95.3]), true);
  });

  it('builds consistent locale index data across real content directory for zh & en', () => {
    const relRaw = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'public/data/relationships.json'), 'utf8')
    );
    const relByPair = buildRelationshipByPair(relRaw.records);
    const i18nDict = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'src/data/i18n_dictionary.json'), 'utf8')
    );
    const countryMap = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'src/data/countries.json'), 'utf8')
    );

    const loadFacilities = (dir) =>
      fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .map((file) => {
          const { data } = matter(
            fs.readFileSync(path.join(dir, file), 'utf8')
          );
          return {
            id: String(data.id ?? file.replace(/\.md$/, '')),
            data: {
              region: '',
              type: '',
              status: 'Planned',
              announcedCapacityMax: 0,
              estimatedCapacity: 0,
              precision: 'country',
              sector: '',
              hub: '',
              phase: '',
              announcement: '',
              partners: [],
              ...data,
            },
          };
        });

    const loadPolicies = (dir) =>
      fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .map((file) => {
          const { data } = matter(
            fs.readFileSync(path.join(dir, file), 'utf8')
          );
          return { id: String(data.id ?? file.replace(/\.md$/, '')), data };
        });

    for (const lang of ['zh', 'en']) {
      const policies = loadPolicies(
        path.join(ROOT, 'src/content/policies', lang)
      );
      const facilities = loadFacilities(
        path.join(ROOT, 'src/content/facilities', lang)
      );

      const index = buildLocaleIndexData({
        policies,
        facilities,
        lang,
        relationshipByPair: relByPair,
        countryDict: i18nDict.countries,
        countryMap,
      });

      assert.equal(index.directoryMeta.listItems.length, facilities.length);
      assert.equal(index.directoryMeta.mapData.length, facilities.length);
      assert.equal(index.directoryMeta.initialStats.count, facilities.length);
      assert.ok(index.directoryMeta.initialStats.operational > 0);

      const us45qRelated =
        index.relatedFacilitiesByPolicyId.get('us-45q-ira') ?? [];
      assert.ok(
        us45qRelated.length > POLICY_RELATED_FACILITIES_SSR_CAP,
        `expected us-45q-ira (${lang}) to exceed SSR cap`
      );
      const sliced = sliceRelatedFacilities(us45qRelated);
      assert.equal(sliced.visible.length, POLICY_RELATED_FACILITIES_SSR_CAP);
      assert.equal(sliced.hasMore, true);

      // Verify monotonic trust rank ordering on us-45q-ira
      let prevRank = -1;
      for (const f of us45qRelated) {
        const rank = getRelationshipTrustRank(
          relByPair.get(`us-45q-ira::${f.id}`)
        );
        assert.ok(rank >= prevRank, 'trust rank must be non-decreasing');
        prevRank = rank;
      }
    }

    // If dist/ exists, verify emitted JSON endpoint arrays match directoryMeta parity
    for (const lang of ['zh', 'en']) {
      const distList = path.join(ROOT, `dist/api/facilities-list.${lang}.json`);
      const distMap = path.join(ROOT, `dist/api/facilities-map.${lang}.json`);
      if (fs.existsSync(distList) && fs.existsSync(distMap)) {
        const facilitiesForLang = loadFacilities(
          path.join(ROOT, 'src/content/facilities', lang)
        );
        const metaForLang = buildDirectoryMeta({
          facilities: facilitiesForLang,
          lang,
          countryMap,
        });
        const builtList = JSON.parse(fs.readFileSync(distList, 'utf8'));
        const builtMap = JSON.parse(fs.readFileSync(distMap, 'utf8'));
        assert.deepEqual(builtList, metaForLang.listItems);
        assert.deepEqual(builtMap, metaForLang.mapData);
      }
    }
  });
});

describe('buildLocaleIndexData policy lookup', () => {
  it('indexes policies and facilities for O(1) lookup and country summaries', () => {
    const p1 = makePolicy('p1', {
      country: 'United States',
      relatedFacilities: ['1'],
      analysis: {
        incentive: { score: 90 },
        statutory: { score: 50 },
        market: { score: 40 },
        strategic: { score: 60 },
        mrv: { score: 70 },
      },
    });
    const f1 = makeFacility('1', {
      country: 'United States',
      status: 'Operational',
      estimatedCapacity: 4.2,
    });

    const index = buildLocaleIndexData({
      policies: [p1],
      facilities: [f1],
      lang: 'en',
      relationshipByPair: new Map(),
      countryDict: {},
      countryMap: {},
    });

    assert.equal(index.policyById.get('p1')?.id, 'p1');
    assert.equal(index.facilityById.get('1')?.id, '1');
    assert.equal(
      index.countrySummaryByCountry.get('United States')?.stats.operational,
      4.2
    );
    assert.equal(
      index.countrySummaryByCountry.get('United States')?.aggregateAnalysis
        .incentive,
      90
    );
  });
});

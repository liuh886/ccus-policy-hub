import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { governanceClientCopy } from '../src/lib/governanceCopy.mjs';
import {
  buildCountrySystem,
  buildGlobalSystems,
  classifyQuadrant,
  countryDisplayName,
  csvCell,
  readWeightsFromUrl,
  regulatoryClarity,
  serializeCompareViewParams,
} from '../src/lib/governanceComparisonClient.mjs';

const COUNTRY_MAP = {
  'United States': { en: 'United States', zh: '美国' },
  China: { en: 'China', zh: '中国' },
  Norway: { en: 'Norway', zh: '挪威' },
};

function makePolicy(id, overrides = {}) {
  const {
    country = 'United States',
    status = 'Active',
    reviewStatus = 'verified',
    year = 2024,
    scores = {},
  } = overrides;
  return {
    id,
    data: {
      title: `Policy ${id}`,
      country,
      status,
      reviewStatus,
      year,
      analysis: {
        incentive: { score: scores.incentive ?? 0 },
        statutory: { score: scores.statutory ?? 0 },
        market: { score: scores.market ?? 0 },
        strategic: { score: scores.strategic ?? 0 },
        mrv: { score: scores.mrv ?? 0 },
      },
    },
  };
}

function makeFacility(id, overrides = {}) {
  const {
    country = 'United States',
    status = 'Operational',
    estimatedCapacity = 2,
  } = overrides;
  return {
    id,
    data: {
      country,
      status,
      estimatedCapacity,
    },
  };
}

describe('countryDisplayName', () => {
  it('resolves localized labels and falls back to the canonical key', () => {
    assert.equal(
      countryDisplayName('United States', COUNTRY_MAP, 'en'),
      'United States'
    );
    assert.equal(
      countryDisplayName('United States', COUNTRY_MAP, 'zh'),
      '美国'
    );
    assert.equal(countryDisplayName('Brazil', COUNTRY_MAP, 'en'), 'Brazil');
    assert.equal(countryDisplayName('Brazil', COUNTRY_MAP, 'zh'), 'Brazil');
    assert.equal(countryDisplayName('Norway', undefined, 'zh'), 'Norway');
  });
});

describe('readWeightsFromUrl & serializeCompareViewParams', () => {
  it('parses valid five-dimension weight vectors from URL params', () => {
    const params = new URLSearchParams('weights=30,25,20,15,10');
    assert.deepEqual(readWeightsFromUrl(params), {
      incentive: 30,
      statutory: 25,
      market: 20,
      strategic: 15,
      mrv: 10,
    });

    const spaced = new URLSearchParams('weights= 40 , 0 , 30 , 20 , 10 ');
    assert.deepEqual(readWeightsFromUrl(spaced), {
      incentive: 40,
      statutory: 0,
      market: 30,
      strategic: 20,
      mrv: 10,
    });
  });

  it('rejects missing, malformed, negative, or all-zero weight params', () => {
    assert.equal(readWeightsFromUrl(new URLSearchParams('')), null);
    assert.equal(readWeightsFromUrl(new URLSearchParams('weights=')), null);
    assert.equal(
      readWeightsFromUrl(new URLSearchParams('weights=20,20,20,20')),
      null
    );
    assert.equal(
      readWeightsFromUrl(new URLSearchParams('weights=20,20,20,20,20,20')),
      null
    );
    assert.equal(
      readWeightsFromUrl(new URLSearchParams('weights=-5,20,20,20,20')),
      null
    );
    assert.equal(
      readWeightsFromUrl(new URLSearchParams('weights=abc,20,20,20,20')),
      null
    );
    assert.equal(
      readWeightsFromUrl(new URLSearchParams('weights=0,0,0,0,0')),
      null
    );
  });

  it('omits uniform weights, preserves unrelated params, and round-trips custom weights', () => {
    const initial = new URLSearchParams(
      'countries=united-states,china&weights=40,20,20,10,10&planned=1'
    );
    const uniform = {
      incentive: 20,
      statutory: 20,
      market: 20,
      strategic: 20,
      mrv: 20,
    };
    const cleared = serializeCompareViewParams(initial, uniform, false);

    // Pure: must not mutate input URLSearchParams.
    assert.equal(initial.get('weights'), '40,20,20,10,10');
    assert.equal(initial.get('planned'), '1');

    assert.equal(cleared.get('countries'), 'united-states,china');
    assert.equal(cleared.has('weights'), false);
    assert.equal(cleared.has('planned'), false);

    const custom = {
      incentive: 50,
      statutory: 20,
      market: 15,
      strategic: 10,
      mrv: 5,
    };
    const serialized = serializeCompareViewParams(
      new URLSearchParams('countries=norway'),
      custom,
      true
    );
    assert.equal(serialized.get('countries'), 'norway');
    assert.equal(serialized.get('weights'), '50,20,15,10,5');
    assert.equal(serialized.get('planned'), '1');
    assert.deepEqual(readWeightsFromUrl(serialized), custom);
  });

  it('keeps existing weights untouched when weights argument is null', () => {
    const params = new URLSearchParams('weights=40,20,20,10,10');
    const next = serializeCompareViewParams(params, null, true);
    assert.equal(next.get('weights'), '40,20,20,10,10');
    assert.equal(next.get('planned'), '1');
  });
});

describe('buildCountrySystem', () => {
  const policies = [
    makePolicy('us-1', {
      country: 'United States',
      scores: {
        incentive: 90,
        statutory: 60,
        market: 40,
        strategic: 70,
        mrv: 80,
      },
    }),
    makePolicy('us-2', {
      country: 'United States',
      scores: {
        incentive: 50,
        statutory: 80,
        market: 70,
        strategic: 50,
        mrv: 60,
      },
    }),
  ];
  const facilities = [
    makeFacility('f-1', { status: 'Operational', estimatedCapacity: 10 }),
    makeFacility('f-2', { status: 'Under construction', estimatedCapacity: 5 }),
    makeFacility('f-3', { status: 'Planned', estimatedCapacity: 12 }),
  ];
  const profiles = [
    {
      data: {
        id: '美国',
        regulatory: {
          pore_space_rights: 'Surface owner default; state statutes vary',
          liability_transfer: 'Pending federal harmonization',
        },
      },
    },
  ];

  it('uses committed capacity for matrixX when includePlanned is false and adds planned when true', () => {
    const committedOnly = buildCountrySystem({
      canonical: 'United States',
      policies,
      facilities,
      countryMap: COUNTRY_MAP,
      profiles,
      lang: 'zh',
      index: 0,
      weights: null,
      includePlanned: false,
    });
    assert.equal(committedOnly.displayCountry, '美国');
    assert.equal(committedOnly.deployment.committedCapacity, 15);
    assert.equal(committedOnly.deployment.plannedCapacity, 12);
    assert.equal(committedOnly.deployment.matrixX, 15);
    assert.deepEqual(committedOnly.peakAnalysis, {
      incentive: 90,
      statutory: 80,
      market: 70,
      strategic: 70,
      mrv: 80,
    });
    assert.equal(committedOnly.governance.index, 78);
    assert.equal(
      committedOnly.regulatory.pore_space_rights,
      'Surface owner default; state statutes vary'
    );

    const withPlanned = buildCountrySystem({
      canonical: 'United States',
      policies,
      facilities,
      countryMap: COUNTRY_MAP,
      profiles,
      lang: 'en',
      index: 6,
      weights: {
        incentive: 100,
        statutory: 0,
        market: 0,
        strategic: 0,
        mrv: 0,
      },
      includePlanned: true,
    });
    assert.equal(withPlanned.displayCountry, 'United States');
    assert.equal(withPlanned.deployment.matrixX, 27);
    assert.equal(withPlanned.governance.index, 90);
    // Color wraps cleanly with index % 6.
    assert.deepEqual(withPlanned.color, committedOnly.color);
  });
});

describe('buildGlobalSystems', () => {
  it('filters inactive and draft policies and deduplicates zh/en country names', () => {
    const allPolicies = [
      makePolicy('us-en', {
        country: 'United States',
        status: 'Active',
        scores: {
          incentive: 90,
          statutory: 80,
          market: 70,
          strategic: 60,
          mrv: 50,
        },
      }),
      makePolicy('us-zh', {
        country: '美国',
        status: '现行',
        scores: {
          incentive: 40,
          statutory: 85,
          market: 75,
          strategic: 65,
          mrv: 90,
        },
      }),
      makePolicy('us-draft', {
        country: 'United States',
        status: 'Active',
        reviewStatus: 'draft',
        scores: {
          incentive: 100,
          statutory: 100,
          market: 100,
          strategic: 100,
          mrv: 100,
        },
      }),
      makePolicy('cn-expired', {
        country: 'China',
        status: 'Expired',
        scores: {
          incentive: 95,
          statutory: 95,
          market: 95,
          strategic: 95,
          mrv: 95,
        },
      }),
      makePolicy('cn-active', {
        country: '中国',
        status: '运行中',
        scores: {
          incentive: 60,
          statutory: 70,
          market: 50,
          strategic: 80,
          mrv: 40,
        },
      }),
      makePolicy('unknown-country', {
        country: 'Atlantis',
        status: 'Active',
        scores: { incentive: 99 },
      }),
    ];
    const allFacilities = [
      makeFacility('us-f1', {
        country: '美国',
        status: 'Operational',
        estimatedCapacity: 8,
      }),
      makeFacility('us-f2', {
        country: 'United States',
        status: 'Planned',
        estimatedCapacity: 14,
      }),
      makeFacility('cn-f1', {
        country: 'China',
        status: '建设中',
        estimatedCapacity: 3.5,
      }),
    ];

    const committedSystems = buildGlobalSystems(
      allPolicies,
      allFacilities,
      COUNTRY_MAP,
      null,
      false
    );
    assert.deepEqual(
      committedSystems.map((item) => item.canonicalCountry),
      ['United States', 'China']
    );

    const us = committedSystems[0];
    assert.equal(us.governance.policyCount, 2);
    assert.equal(us.peakAnalysis.incentive, 90);
    assert.equal(us.peakAnalysis.mrv, 90);
    assert.equal(us.deployment.committedCapacity, 8);
    assert.equal(us.deployment.plannedCapacity, 14);
    assert.equal(us.deployment.matrixX, 8);

    const cn = committedSystems[1];
    assert.equal(cn.governance.policyCount, 1);
    assert.equal(cn.governance.index, 60);
    assert.equal(cn.deployment.committedCapacity, 3.5);

    const plannedSystems = buildGlobalSystems(
      allPolicies,
      allFacilities,
      COUNTRY_MAP,
      null,
      true
    );
    assert.equal(plannedSystems[0].deployment.matrixX, 22);
    assert.equal(plannedSystems[1].deployment.matrixX, 3.5);
  });
});

describe('regulatoryClarity', () => {
  it('counts only stated operative entries and ignores pending or empty items', () => {
    const regulatory = {
      pore_space_rights: 'Statutorily vested in the Crown',
      liability_transfer: 'Transfer after 20 years post-closure',
      liability_period: 'Pending ministerial rule',
      financial_assurance: 'Mandatory decommissioning bond',
      permitting_lead_time: '尚未明确具体审批周期',
      co2_definition: 'Under study by environment ministry',
      cross_border_rules: '',
    };
    assert.equal(
      regulatoryClarity(regulatory, governanceClientCopy.en.regKeys),
      3
    );
    assert.equal(regulatoryClarity({}, governanceClientCopy.zh.regKeys), 0);
  });
});

describe('classifyQuadrant', () => {
  const benchmarks = { governance: 70, deployment: 10 };

  it('classifies all four governance-deployment quadrants including threshold boundaries', () => {
    assert.equal(
      classifyQuadrant(
        { governance: { index: 70 }, deployment: { matrixX: 10 } },
        benchmarks
      ),
      'integrated-leaders'
    );
    assert.equal(
      classifyQuadrant(
        { governance: { index: 85 }, deployment: { matrixX: 4 } },
        benchmarks
      ),
      'policy-led'
    );
    assert.equal(
      classifyQuadrant(
        { governance: { index: 55 }, deployment: { matrixX: 18 } },
        benchmarks
      ),
      'deployment-led'
    );
    assert.equal(
      classifyQuadrant(
        { governance: { index: 40 }, deployment: { matrixX: 2 } },
        benchmarks
      ),
      'foundation-building'
    );
  });
});

describe('csvCell', () => {
  it('passes through safe values and quotes/escapes commas, quotes, and newlines', () => {
    assert.equal(csvCell('Norway'), 'Norway');
    assert.equal(csvCell(78.5), '78.5');
    assert.equal(csvCell(0), '0');
    assert.equal(csvCell(null), '');
    assert.equal(csvCell(undefined), '');
    assert.equal(csvCell('Capture, Storage'), '"Capture, Storage"');
    assert.equal(csvCell('Say "45Q"'), '"Say ""45Q"""');
    assert.equal(csvCell('Line 1\nLine 2'), '"Line 1\nLine 2"');
  });
});

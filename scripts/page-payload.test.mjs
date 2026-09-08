/**
 * page-payload.test.mjs
 *
 * T3 weight contracts: page-embedded JSON payloads must contain exactly the
 * fields their client scripts read. Adding a field grows built pages for
 * every visitor, so the field sets are frozen and locked here.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  COMPARE_FACILITY_FIELDS,
  COMPARE_POLICY_FIELDS,
  toCompareFacility,
  toComparePolicy,
  toCompareProfile,
} from '../src/lib/comparePayload.mjs';
import { MAP_PAYLOAD_FIELDS, toMapFacility } from '../src/lib/mapPayload.mjs';

describe('compare payload projections', () => {
  it('policy projection keeps exactly the consumed fields', () => {
    const projected = toComparePolicy({
      id: 'p1',
      data: {
        country: 'China',
        status: 'Active',
        analysis: { incentive: { score: 80 } },
        year: 2024,
        title: 'T',
        source: 'S',
        description: 'LONG BODY THAT MUST NOT SHIP',
        scope: 'dropped',
        tags: ['dropped'],
        interpretation: 'dropped',
      },
    });
    assert.strictEqual(projected.id, 'p1');
    assert.deepStrictEqual(
      Object.keys(projected.data).sort(),
      [...COMPARE_POLICY_FIELDS].sort()
    );
    assert.ok(!JSON.stringify(projected).includes('LONG BODY'));
  });

  it('facility projection keeps country/status/capacities only', () => {
    const projected = toCompareFacility({
      id: 'f1',
      data: {
        country: 'Norway',
        status: 'Operational',
        estimatedCapacity: 1.5,
        announcedCapacityMin: 1,
        announcedCapacityMax: 2,
        name: 'dropped',
        description: 'dropped',
        operator: 'dropped',
      },
    });
    assert.strictEqual(projected.id, 'f1');
    assert.deepStrictEqual(
      Object.keys(projected.data).sort(),
      [...COMPARE_FACILITY_FIELDS].sort()
    );
    assert.strictEqual(projected.data.estimatedCapacity, 1.5);
  });

  it('profile projection keeps id + regulatory only', () => {
    const projected = toCompareProfile({
      id: 'china',
      data: {
        id: 'China',
        regulatory: { pore_space_rights: 'State-owned' },
        summary: 'dropped',
        governance: 'dropped',
      },
    });
    assert.deepStrictEqual(projected, {
      id: 'china',
      data: { id: 'China', regulatory: { pore_space_rights: 'State-owned' } },
    });
  });

  it('projections tolerate missing data without throwing', () => {
    assert.deepStrictEqual(toComparePolicy(), { id: undefined, data: {} });
    assert.deepStrictEqual(toCompareFacility(null), {
      id: undefined,
      data: {},
    });
    assert.deepStrictEqual(toCompareProfile({}), {
      id: undefined,
      data: {},
    });
  });
});

describe('map payload projection', () => {
  it('map facility carries exactly the documented fields', () => {
    const projected = toMapFacility({
      id: '1',
      name: 'N',
      coordinates: [1, 2],
      precision: 'exact',
      status: 'Operational',
      estimatedCapacity: 3,
      announcedCapacityMax: 4,
      type: 'capture',
      country: 'dropped',
      description: 'dropped',
    });
    assert.deepStrictEqual(Object.keys(projected), [...MAP_PAYLOAD_FIELDS]);
    assert.strictEqual(projected.name, 'N');
    assert.deepStrictEqual(projected.coordinates, [1, 2]);
  });

  it('missing values become null (stable shape for the client)', () => {
    assert.deepStrictEqual(toMapFacility({ id: '1' }), {
      id: '1',
      name: null,
      coordinates: null,
      precision: null,
      status: null,
      estimatedCapacity: null,
      announcedCapacityMax: null,
      type: null,
    });
  });
});

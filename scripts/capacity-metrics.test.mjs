import assert from 'node:assert/strict';
import test from 'node:test';

import {
  facilityCapacity,
  normalizeFacilityStatus,
  normalizeFacilityType,
  summarizeFacilities,
} from '../src/lib/capacityMetrics.mjs';

test('normalizes bilingual facility statuses and types', () => {
  assert.equal(normalizeFacilityStatus('运行中'), 'operational');
  assert.equal(
    normalizeFacilityStatus('Under Construction'),
    'under-construction'
  );
  assert.equal(normalizeFacilityType('运输与封存'), 'ts');
  assert.equal(normalizeFacilityType('全流程项目'), 'full-chain');
  assert.equal(normalizeFacilityType('碳利用'), 'ccu');
  assert.equal(normalizeFacilityType('Unknown'), null);
});

test('uses estimated capacity first and falls back to announced range', () => {
  assert.equal(facilityCapacity({ estimatedCapacity: 4.2 }), 4.2);
  assert.equal(
    facilityCapacity({ announcedCapacityMin: 2, announcedCapacityMax: 4 }),
    3
  );
  assert.equal(facilityCapacity({ announcedCapacityMax: 1.5 }), 1.5);
});

test('summarizes storage-related project records without capture, transport or CCU', () => {
  const facilities = [
    { data: { status: 'Operational', type: 'Capture', estimatedCapacity: 1 } },
    {
      data: { status: 'Operational', type: 'Transport', estimatedCapacity: 2 },
    },
    { data: { status: 'Operational', type: 'T&S', estimatedCapacity: 3 } },
    { data: { status: 'Operational', type: 'Storage', estimatedCapacity: 4 } },
    {
      data: { status: 'Operational', type: 'Full chain', estimatedCapacity: 5 },
    },
    { data: { status: 'Operational', type: 'CCU', estimatedCapacity: 6 } },
    { data: { status: 'Operational', type: 'Unknown', estimatedCapacity: 7 } },
    {
      data: {
        status: 'Under construction',
        type: 'Storage',
        announcedCapacityMin: 8,
        announcedCapacityMax: 10,
      },
    },
  ];

  assert.deepEqual(summarizeFacilities(facilities, 'operational'), {
    totalCount: 7,
    totalCapacity: 28,
    storageRelatedCount: 3,
    storageRelatedCapacity: 12,
  });
  assert.deepEqual(summarizeFacilities(facilities, 'under-construction'), {
    totalCount: 1,
    totalCapacity: 9,
    storageRelatedCount: 1,
    storageRelatedCapacity: 9,
  });
});

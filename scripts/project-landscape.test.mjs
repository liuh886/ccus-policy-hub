import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProjectLandscape,
  collapseRegions,
} from '../src/lib/projectLandscape.mjs';

const facilities = [
  {
    data: {
      status: 'Operational',
      region: 'Europe',
      estimatedCapacity: 4,
    },
  },
  {
    data: {
      status: 'Under construction',
      region: 'Europe',
      estimatedCapacity: 6,
    },
  },
  {
    data: {
      status: 'Planned',
      region: 'Europe',
      estimatedCapacity: 10,
    },
  },
  {
    data: {
      status: 'Planned',
      region: 'North America',
      estimatedCapacity: 8,
    },
  },
  {
    data: {
      status: 'Operational',
      region: 'Asia Pacific',
      announcedCapacityMin: 2,
      announcedCapacityMax: 4,
    },
  },
  {
    data: {
      status: 'Planned',
      region: 'Asia Pacific',
    },
  },
  {
    data: {
      status: 'Cancelled',
      region: 'Europe',
      estimatedCapacity: 50,
    },
  },
];

test('builds a current active-portfolio snapshot with committed as a pipeline subset', () => {
  const result = buildProjectLandscape(facilities, {
    topRegions: 6,
    otherLabel: 'Other regions',
  });

  assert.equal(result.activeCount, 6);
  assert.equal(result.excludedCount, 1);
  assert.equal(result.status.operational.count, 2);
  assert.equal(result.status['under-construction'].count, 1);
  assert.equal(result.status.planned.count, 3);
  assert.equal(result.activeCapacity, 31);
  assert.equal(result.committedCount, 3);
  assert.equal(result.committedCapacity, 13);
  assert.equal(result.capacityCoverage.count, 5);
  assert.equal(result.capacityCoverage.total, 6);
  assert.equal(result.largestPipelineRegion.name, 'Europe');
  assert.equal(result.largestPipelineRegion.pipelineCapacity, 20);
  assert.equal(result.largestCommittedRegion.name, 'Europe');
  assert.equal(result.largestCommittedRegion.committedCapacity, 10);
});

test('creates distinct regional rankings for capacity and project views', () => {
  const result = buildProjectLandscape(facilities);

  assert.equal(result.regionViews.capacity[0].name, 'Europe');
  assert.equal(result.regionViews.capacity[0].pipelineValue, 20);
  assert.equal(result.regionViews.capacity[0].committedValue, 10);
  assert.equal(result.regionViews.capacity[0].committedShare, 50);

  assert.equal(result.regionViews.projects[0].name, 'Europe');
  assert.equal(result.regionViews.projects[0].pipelineValue, 3);
  assert.equal(result.regionViews.projects[0].committedValue, 2);
});

test('collapses lower-ranked regions into an explicit other-regions row', () => {
  const regions = [
    {
      name: 'A',
      pipelineCount: 5,
      committedCount: 4,
      pipelineCapacity: 50,
      committedCapacity: 40,
      capacityRecordCount: 5,
      committedCapacityRecordCount: 4,
    },
    {
      name: 'B',
      pipelineCount: 4,
      committedCount: 2,
      pipelineCapacity: 40,
      committedCapacity: 20,
      capacityRecordCount: 4,
      committedCapacityRecordCount: 2,
    },
    {
      name: 'C',
      pipelineCount: 3,
      committedCount: 1,
      pipelineCapacity: 30,
      committedCapacity: 10,
      capacityRecordCount: 3,
      committedCapacityRecordCount: 1,
    },
  ];

  const rows = collapseRegions(regions, 'capacity', 1, 'Other regions');

  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'A');
  assert.equal(rows[1].name, 'Other regions');
  assert.equal(rows[1].pipelineCapacity, 70);
  assert.equal(rows[1].committedCapacity, 30);
  assert.equal(rows[1].pipelineCount, 7);
});

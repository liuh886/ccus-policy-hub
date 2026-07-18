import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateDeploymentMetrics,
  calculateGlobalBenchmarks,
  calculateGovernanceCapability,
  classifyGovernanceDeployment,
  median,
} from '../src/lib/governanceBenchmarking.mjs';

const policy = (id, status, scores, year = 2025) => ({
  id,
  data: {
    status,
    year,
    analysis: Object.fromEntries(
      Object.entries(scores).map(([dimension, score]) => [
        dimension,
        { score },
      ])
    ),
  },
});

const facility = (status, estimatedCapacity, extra = {}) => ({
  data: { status, estimatedCapacity, ...extra },
});

test('governance capability uses peak active-policy strength and a 0-100 average', () => {
  const result = calculateGovernanceCapability([
    policy('a', 'Active', {
      incentive: 90,
      statutory: 30,
      market: 40,
      strategic: 50,
      mrv: 60,
    }),
    policy('b', '现行', {
      incentive: 70,
      statutory: 80,
      market: 55,
      strategic: 45,
      mrv: 65,
    }),
    policy('inactive', 'Expired', {
      incentive: 100,
      statutory: 100,
      market: 100,
      strategic: 100,
      mrv: 100,
    }),
  ]);

  assert.deepEqual(result.scores, [90, 80, 55, 50, 65]);
  assert.equal(result.index, 68);
  assert.equal(result.policyCount, 2);
  assert.equal(result.strongestDimension, 'incentive');
  assert.equal(result.weakestDimension, 'strategic');
  assert.deepEqual(
    result.contributors.map((item) => item.id),
    ['a', 'b']
  );
});

test('deployment metrics reuse governed capacity fallbacks and normalized statuses', () => {
  const result = calculateDeploymentMetrics([
    facility('Operational', 10),
    facility('建设中', 0, {
      announcedCapacityMin: 4,
      announcedCapacityMax: 8,
    }),
    facility('Planned', 3),
    facility('Cancelled', 99),
  ]);

  assert.equal(result.operationalCount, 1);
  assert.equal(result.operationalCapacity, 10);
  assert.equal(result.constructionCount, 1);
  assert.equal(result.constructionCapacity, 6);
  assert.equal(result.plannedCapacity, 3);
  assert.equal(result.committedCount, 2);
  assert.equal(result.committedCapacity, 16);
});

test('global benchmarks use stable medians and exclude zero deployment from the x threshold', () => {
  const benchmarks = calculateGlobalBenchmarks([
    {
      governance: { index: 40 },
      deployment: { committedCapacity: 0 },
    },
    {
      governance: { index: 60 },
      deployment: { committedCapacity: 10 },
    },
    {
      governance: { index: 80 },
      deployment: { committedCapacity: 30 },
    },
  ]);

  assert.equal(benchmarks.governance, 60);
  assert.equal(benchmarks.deployment, 20);
  assert.equal(median([4, 1, 3, 2]), 2.5);
});

test('quadrant classification uses governance and deployment benchmarks', () => {
  const benchmarks = { governance: 60, deployment: 20 };
  assert.equal(
    classifyGovernanceDeployment(80, 30, benchmarks),
    'integrated-leaders'
  );
  assert.equal(classifyGovernanceDeployment(80, 10, benchmarks), 'policy-led');
  assert.equal(
    classifyGovernanceDeployment(40, 30, benchmarks),
    'deployment-led'
  );
  assert.equal(
    classifyGovernanceDeployment(40, 10, benchmarks),
    'foundation-building'
  );
});

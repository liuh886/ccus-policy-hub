import assert from 'node:assert/strict';
import test from 'node:test';

import {
  governanceAxisMinimum,
  heatmapOpacity,
  preferredProfileView,
} from '../src/lib/governanceWorkspaceVisuals.mjs';

test('governance workspace selects readable profile views', () => {
  assert.equal(preferredProfileView(3), 'radar');
  assert.equal(preferredProfileView(4), 'heatmap');
  assert.equal(heatmapOpacity(0), 0.08);
  assert.equal(heatmapOpacity(100), 0.8);
});

test('governance matrix starts at 30 when all relevant scores are at least 30', () => {
  const countries = [
    { governance: { index: 42 } },
    { governance: { index: 76 } },
  ];
  assert.equal(governanceAxisMinimum(countries, { governance: 54 }), 30);
});

test('governance matrix safely expands below 30 for low scores or benchmarks', () => {
  assert.equal(
    governanceAxisMinimum([{ governance: { index: 24 } }], { governance: 51 }),
    20
  );
  assert.equal(
    governanceAxisMinimum([{ governance: { index: 8 } }], { governance: 40 }),
    0
  );
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  governanceAxisMinimum,
  heatmapOpacity,
  preferredProfileView,
} from '../src/lib/governanceWorkspaceVisuals.mjs';

test('profile view defaults to radar for up to three countries', () => {
  assert.equal(preferredProfileView(1), 'radar');
  assert.equal(preferredProfileView(3), 'radar');
  assert.equal(preferredProfileView(4), 'heatmap');
  assert.equal(preferredProfileView(5), 'heatmap');
});

test('heatmap opacity is monotonic and clamps governance scores', () => {
  assert.equal(heatmapOpacity(-10), 0.08);
  assert.equal(heatmapOpacity(0), 0.08);
  assert.equal(heatmapOpacity(50), 0.44);
  assert.equal(heatmapOpacity(100), 0.8);
  assert.equal(heatmapOpacity(140), 0.8);
});

test('governance matrix starts at 30 when the lowest relevant score is 30-49', () => {
  const countries = [
    { governance: { index: 42 } },
    { governance: { index: 76 } },
  ];

  assert.equal(governanceAxisMinimum([], {}), 30);
  assert.equal(governanceAxisMinimum(countries, { governance: 54 }), 30);
  assert.equal(
    governanceAxisMinimum([{ governance: { index: 35 } }], { governance: 40 }),
    30
  );
});

test('governance matrix keeps a high floor close to high-scoring data', () => {
  const countries = [
    { governance: { index: 84 } },
    { governance: { index: 97 } },
  ];
  assert.equal(governanceAxisMinimum(countries, { governance: 84 }), 70);
  assert.equal(
    governanceAxisMinimum([{ governance: { index: 62 } }], { governance: 71 }),
    50
  );
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
  assert.equal(
    governanceAxisMinimum([{ governance: { index: 42 } }], { governance: 27 }),
    20
  );
});

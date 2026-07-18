import assert from 'node:assert/strict';
import test from 'node:test';

import {
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

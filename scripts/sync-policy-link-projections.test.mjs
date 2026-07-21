import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeIds,
  replaceRelatedPolicies,
  sameIds,
} from './sync-policy-link-projections.mjs';

const sample = `---
{
  'id': '937',
  'name': 'Example',
  'relatedPolicies': ['japan-ccs-act', 'jp-ccs-business-act-2024'],
  'sector': 'Iron and steel',
}
---

Body text stays unchanged.
`;

test('identifier normalization is sorted and unique', () => {
  assert.deepEqual(normalizeIds(['b', 'a', 'b']), ['a', 'b']);
  assert.equal(sameIds(['a', 'b'], ['b', 'a', 'a']), true);
});

test('relationship replacement preserves unrelated content', () => {
  const result = replaceRelatedPolicies(sample, ['jp-ccs-business-act-2024']);
  assert.equal(result.changed, true);
  assert.deepEqual(result.expected, ['jp-ccs-business-act-2024']);
  assert.ok(result.text.includes('jp-ccs-business-act-2024'));
  assert.ok(!result.text.includes('japan-ccs-act'));
  assert.ok(result.text.includes("'sector': 'Iron and steel'"));
  assert.ok(result.text.includes('Body text stays unchanged.'));
});

test('relationship replacement is idempotent', () => {
  const first = replaceRelatedPolicies(sample, ['jp-ccs-business-act-2024']);
  const second = replaceRelatedPolicies(first.text, [
    'jp-ccs-business-act-2024',
  ]);
  assert.equal(second.changed, false);
  assert.equal(second.text, first.text);
});

test('a missing non-empty relationship array is inserted', () => {
  const text = `---
{
  'id': '1',
  'name': 'Example',
}
---

Body.
`;
  const result = replaceRelatedPolicies(text, ['policy-a']);
  assert.equal(result.changed, true);
  assert.ok(result.text.includes('relatedPolicies'));
  assert.ok(result.text.includes('policy-a'));
});

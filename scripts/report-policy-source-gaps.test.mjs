import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyPolicySourceGap,
  summarizePolicySourceGaps,
} from './report-policy-source-gaps.mjs';

test('classifies missing source and URL combinations', () => {
  assert.deepEqual(
    classifyPolicySourceGap({
      id: 'both',
      source: ' ',
      url: null,
    }),
    {
      id: 'both',
      source: '',
      url: '',
      missing_source: true,
      missing_url: true,
      gap_type: 'missing_source_and_url',
    }
  );

  assert.equal(
    classifyPolicySourceGap({ source: '', url: 'https://example.com' })
      .gap_type,
    'missing_source'
  );
  assert.equal(
    classifyPolicySourceGap({ source: 'Ministry', url: '' }).gap_type,
    'missing_url'
  );
});

test('summarizes review-state and field gaps independently', () => {
  const summary = summarizePolicySourceGaps([
    { source: '', url: '', review_status: 'verified' },
    { source: 'Agency', url: '', review_status: 'draft' },
    { source: '', url: 'https://example.com', review_status: 'verified' },
  ]);

  assert.deepEqual(summary, {
    total_gap_records: 3,
    missing_source: 2,
    missing_url: 2,
    missing_source_and_url: 1,
    verified_records_with_gaps: 2,
    draft_records_with_gaps: 1,
  });
});

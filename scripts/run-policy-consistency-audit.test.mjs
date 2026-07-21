import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isLineEndingOnlyMismatch,
  normalizePolicyText,
} from './run-policy-consistency-audit.mjs';

test('normalizes CRLF and CR policy text to LF', () => {
  assert.equal(normalizePolicyText('A\r\n\r\nB\r'), 'A\n\nB');
  assert.equal(normalizePolicyText('A\n\nB'), 'A\n\nB');
});

test('ignores only body mismatches caused solely by line endings', () => {
  assert.equal(
    isLineEndingOnlyMismatch({
      field: 'body',
      expected: 'A\r\n\r\nB',
      actual: 'A\n\nB',
    }),
    true
  );

  assert.equal(
    isLineEndingOnlyMismatch({
      field: 'body',
      expected: 'A\r\nB',
      actual: 'A\nChanged',
    }),
    false
  );

  assert.equal(
    isLineEndingOnlyMismatch({
      field: 'frontmatter',
      expected: 'A\r\nB',
      actual: 'A\nB',
    }),
    false
  );
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isFormattingOnlyMismatch,
  normalizePolicyText,
} from './run-policy-consistency-audit.mjs';

test('normalizes CRLF and CR policy text to LF', () => {
  assert.equal(normalizePolicyText('A\r\n\r\nB\r'), 'A\n\nB');
  assert.equal(normalizePolicyText('A\n\nB'), 'A\n\nB');
});

test('ignores only body mismatches caused solely by formatting', () => {
  assert.equal(
    isFormattingOnlyMismatch({
      field: 'body',
      expected: 'A\r\n\r\nB',
      actual: 'A\n\nB',
    }),
    true
  );

  assert.equal(
    isFormattingOnlyMismatch({
      field: 'body',
      expected: 'A\r\nB',
      actual: 'A\nChanged',
    }),
    false
  );

  assert.equal(
    isFormattingOnlyMismatch({
      field: 'body',
      expected: '## Heading\nBody with trailing space. ',
      actual: '## Heading\n\nBody with trailing space.',
    }),
    true
  );

  assert.equal(
    isFormattingOnlyMismatch({
      field: 'body',
      expected: 'Paragraph one.\nParagraph two.',
      actual: 'Paragraph one.\n\nParagraph two.',
    }),
    false
  );

  assert.equal(
    isFormattingOnlyMismatch({
      field: 'frontmatter',
      expected: 'A\r\nB',
      actual: 'A\nB',
    }),
    false
  );
});

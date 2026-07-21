import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAuditMetadata } from './stamp-audit-metadata.mjs';

test('buildAuditMetadata produces deterministic governed metadata', () => {
  const metadata = buildAuditMetadata({
    date: new Date('2026-07-21T12:34:56.000Z'),
    revision: 'abcdef1234567890',
  });

  assert.equal(metadata.last_audit_date, '2026-07-21');
  assert.equal(metadata.last_audit_rule_version, '2026-07-v1');
  assert.equal(metadata.last_audit_source_revision, 'abcdef1234567890');
  assert.match(metadata.last_audit_summary, /Deep audit passed/);
  assert.match(metadata.last_audit_summary, /2026-07-v1/);
  assert.match(metadata.last_audit_summary, /abcdef1234567890/);
});

test('buildAuditMetadata uses a transparent local revision fallback', () => {
  const metadata = buildAuditMetadata({
    date: new Date('2026-07-21T00:00:00.000Z'),
    revision: '',
  });

  assert.equal(metadata.last_audit_source_revision, 'local-worktree');
  assert.match(metadata.last_audit_summary, /local-worktree/);
});

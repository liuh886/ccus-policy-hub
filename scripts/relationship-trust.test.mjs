import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeRelationships,
  isVerifiedProjectEvidence,
  relationshipLabel,
} from '../src/lib/relationshipTrust.mjs';

test('a verified geographic match never becomes direct project evidence', () => {
  const geographic = {
    link_type: 'subnational_region',
    confidence: 0.75,
    review_status: 'verified',
    evidence: 'Subnational jurisdiction match',
    source_url: null,
  };
  assert.equal(isVerifiedProjectEvidence(geographic), false);
  const summary = summarizeRelationships([
    geographic,
    { link_type: 'country' },
    { link_type: 'future_type' },
  ]);
  assert.equal(summary.subnational_level, 1);
  assert.equal(summary.evidence_level, 0);
  assert.equal(summary.unclassified, 1);
  assert.equal(summary.total, 3);
  assert.equal(relationshipLabel(geographic, 'zh'), '地方行政区匹配');
});

test('direct evidence needs an explicit type, review, explanation and source', () => {
  const direct = {
    link_type: 'evidence',
    review_status: 'verified',
    evidence: 'Award identifies this project',
    source_url: 'https://example.org/award',
  };
  assert.equal(isVerifiedProjectEvidence(direct), true);
  assert.equal(
    isVerifiedProjectEvidence({ ...direct, review_status: 'draft' }),
    false
  );
  assert.equal(isVerifiedProjectEvidence({ ...direct, source_url: '' }), false);
  assert.equal(
    isVerifiedProjectEvidence({ ...direct, source_url: 'https://' }),
    false
  );
  assert.equal(summarizeRelationships([direct]).verified_project_evidence, 1);
});

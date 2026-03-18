import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeBody,
  normalizeValueForCompare,
  compareStringArrays,
  floatEqual,
  projectFacilityForLang,
  resolveSharedMdValue,
} from '../audit-facilities-parity.mjs';

test('normalizeBody trims surrounding whitespace and normalizes CRLF', () => {
  const input = '\r\n  Hello\r\nWorld  \r\n';
  assert.equal(normalizeBody(input), 'Hello\nWorld');
});

test('normalizeValueForCompare treats null/undefined/empty string consistently', () => {
  assert.equal(normalizeValueForCompare(undefined), '');
  assert.equal(normalizeValueForCompare(null), '');
  assert.equal(normalizeValueForCompare(''), '');
});

test('compareStringArrays detects set equality and order mismatch separately', () => {
  const sameSetDifferentOrder = compareStringArrays(['b', 'a'], ['a', 'b']);
  assert.equal(sameSetDifferentOrder.sameSet, true);
  assert.equal(sameSetDifferentOrder.sameOrder, false);

  const differentSet = compareStringArrays(['a'], ['a', 'b']);
  assert.equal(differentSet.sameSet, false);
});

test('floatEqual compares numbers with tolerance', () => {
  assert.equal(floatEqual(1.0000000001, 1), true);
  assert.equal(floatEqual(1.01, 1), false);
});

test('projectFacilityForLang keeps canonical country/status for zh in md-truth audit mode', () => {
  const projected = projectFacilityForLang({
    f: {
      id: '1',
      country: 'United States',
      status: 'Planned',
      announced_capacity_min: 0,
      announced_capacity_max: 0,
      announced_capacity_raw: '',
      estimated_capacity: 0,
      lat: 0,
      lng: 0,
      precision: 'country',
      investment_scale: '',
      provenance_author: 'IEA',
      provenance_reviewer: 'Human Audit Pending',
      provenance_last_audit_date: '2026-02-01',
    },
    i: {
      name: 'Test',
      region: 'North America',
      type: 'Storage',
      sector: 'Storage',
      fate_of_carbon: 'Stored',
      hub: '',
      operator: '',
      capture_technology: '',
      storage_type: '',
      phase: '',
      announcement: '',
      fid: '',
      operation: '',
      suspension_date: '',
      description: '',
    },
    lang: 'zh',
    partners: [],
    links: [],
    relatedPolicies: [],
  });

  assert.equal(projected.frontmatter.country, 'United States');
  assert.equal(projected.frontmatter.status, 'Planned');
  assert.equal(projected.frontmatter.provenance.reviewer, 'Human Audit Pending');
});

test('resolveSharedMdValue deduplicates matching en/zh values and rejects divergence', () => {
  assert.equal(resolveSharedMdValue('country', { country: 'France' }, { country: 'France' }), 'France');
  assert.equal(resolveSharedMdValue('country', { country: 'France' }, {}), 'France');
  assert.equal(resolveSharedMdValue('country', {}, { country: 'France' }), 'France');

  assert.throws(
    () => resolveSharedMdValue('country', { country: 'France' }, { country: 'Germany' }),
    /inconsistent/i
  );
});

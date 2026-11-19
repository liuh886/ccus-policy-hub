import test from 'node:test';
import assert from 'node:assert/strict';

import { REVIEWER_PLACEHOLDER } from '../../../../scripts/lib/i18n-translate.mjs';
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

test('projectFacilityForLang reconciles sorted relations, description fallback, and provenance defaults', () => {
  const inputPartners = ['Partner B', 'Partner A'];
  const inputLinks = ['https://b.example', 'https://a.example'];
  const projected = projectFacilityForLang({
    f: {
      id: '1',
      country: 'United States',
      status: 'Planned',
      announced_capacity_min: null,
      announced_capacity_max: null,
      announced_capacity_raw: '',
      estimated_capacity: null,
      lat: 0,
      lng: 0,
      precision: 'country',
      investment_scale: null,
      provenance_author: '',
      provenance_reviewer: null,
      provenance_last_audit_date: null,
    },
    i: {
      name: 'Test Facility',
      region: 'North America',
      type: 'Storage',
      sector: 'Storage',
      fate_of_carbon: 'Stored',
      hub: '',
      operator: 'Acme',
      capture_technology: '',
      storage_type: '',
      phase: '',
      announcement: '',
      fid: '',
      operation: '',
      suspension_date: '',
      description: '  Test Facility  ',
    },
    lang: 'en',
    partners: inputPartners,
    links: inputLinks,
    news: [
      {
        url: 'https://news.example/1',
        title: null,
        publisher: 'Pub',
        published_date: null,
        tier: 'press_release',
      },
      {
        url: 'https://news.example/2',
        title: 'Second',
        publisher: null,
        published_date: '2026-01-01',
        tier: 'media',
      },
    ],
    relatedPolicies: ['p2', 'p1'],
    datasetAsOf: '2026-04-03',
  });

  assert.deepEqual(projected.frontmatter.partners, ['Partner A', 'Partner B']);
  assert.deepEqual(inputPartners, ['Partner B', 'Partner A']);
  assert.deepEqual(projected.frontmatter.links, [
    'https://a.example',
    'https://b.example',
  ]);
  assert.deepEqual(inputLinks, ['https://b.example', 'https://a.example']);
  assert.deepEqual(projected.frontmatter.relatedPolicies, ['p1', 'p2']);
  assert.equal(projected.frontmatter.news[0].tier, 'press_release');
  assert.equal('title' in projected.frontmatter.news[0], false);
  assert.equal('announcedCapacityMin' in projected.frontmatter, false);
  assert.equal(projected.frontmatter.provenance.author, 'IEA Ingestion');
  assert.equal(projected.frontmatter.provenance.reviewer, REVIEWER_PLACEHOLDER);
  assert.equal(projected.frontmatter.provenance.lastAuditDate, '2026-04-03');
  assert.match(projected.body, /^### Project Overview/);
  assert.match(projected.body, /operated by Acme/);
});

test('resolveSharedMdValue deduplicates matching en/zh values and rejects divergence', () => {
  assert.equal(
    resolveSharedMdValue(
      'country',
      { country: 'France' },
      { country: 'France' }
    ),
    'France'
  );
  assert.equal(
    resolveSharedMdValue('country', { country: 'France' }, {}),
    'France'
  );
  assert.equal(
    resolveSharedMdValue('country', {}, { country: 'France' }),
    'France'
  );

  assert.throws(
    () =>
      resolveSharedMdValue(
        'country',
        { country: 'France' },
        { country: 'Germany' }
      ),
    /inconsistent/i
  );
});

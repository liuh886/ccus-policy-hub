import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateCoverage } from './audit-policy-coverage.mjs';

function policy(id, country, reviewStatus = 'verified') {
  return {
    id,
    country,
    review_status: reviewStatus,
    title_en: id,
    year: 2025,
    status: 'Active',
    source: 'Official source',
    url: 'https://example.com',
  };
}

function framework(entryOverrides = {}) {
  return {
    schema_version: 1,
    dimensions: [
      { id: 'legal_regulatory', label: 'Legal', definition: 'Legal basis' },
      { id: 'incentives_finance', label: 'Finance', definition: 'Finance' },
    ],
    jurisdictions: [
      {
        id: 'XX',
        name: 'Example',
        allowed_policy_countries: ['Example'],
        coverage: {
          legal_regulatory: {
            status: 'covered',
            priority: 'high',
            policy_ids: ['policy-a'],
            rationale: 'Direct law.',
          },
          incentives_finance: {
            status: 'missing',
            priority: 'high',
            policy_ids: [],
            rationale: 'No direct policy.',
          },
          ...entryOverrides,
        },
      },
    ],
    guardrails: {
      maximum_high_priority_missing: 1,
      require_verified_policy_ids_for_covered: true,
    },
  };
}

test('summarizes covered and missing cells with valid SQLite evidence', () => {
  const result = evaluateCoverage(
    framework(),
    new Map([['policy-a', policy('policy-a', 'Example')]])
  );

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.summary, {
    jurisdictions: 1,
    dimensions: 2,
    cells: 2,
    covered: 1,
    partial: 0,
    missing: 1,
    not_applicable: 0,
    high_priority_missing: 1,
    medium_priority_missing: 0,
  });
});

test('rejects unknown policy IDs and country mismatches', () => {
  const unknown = evaluateCoverage(framework(), new Map());
  assert.match(unknown.errors.join('\n'), /unknown policy policy-a/);

  const wrongCountry = evaluateCoverage(
    framework(),
    new Map([['policy-a', policy('policy-a', 'Elsewhere')]])
  );
  assert.match(wrongCountry.errors.join('\n'), /not an allowed country/);
});

test('covered cells require verified policies', () => {
  const result = evaluateCoverage(
    framework(),
    new Map([['policy-a', policy('policy-a', 'Example', 'draft')]])
  );
  assert.match(result.errors.join('\n'), /non-verified policy policy-a/);
});

test('missing cells cannot cite policies and partial cells require evidence', () => {
  const invalidMissing = evaluateCoverage(
    framework({
      incentives_finance: {
        status: 'missing',
        priority: 'high',
        policy_ids: ['policy-a'],
        rationale: 'Invalid.',
      },
    }),
    new Map([['policy-a', policy('policy-a', 'Example')]])
  );
  assert.match(
    invalidMissing.errors.join('\n'),
    /missing but references policy IDs/
  );

  const invalidPartial = evaluateCoverage(
    framework({
      incentives_finance: {
        status: 'partial',
        priority: 'medium',
        policy_ids: [],
        rationale: 'Invalid.',
      },
    }),
    new Map([['policy-a', policy('policy-a', 'Example')]])
  );
  assert.match(invalidPartial.errors.join('\n'), /partial without evidence/);
});

test('high-priority gap guardrail prevents silent regression', () => {
  const guarded = framework();
  guarded.guardrails.maximum_high_priority_missing = 0;
  const result = evaluateCoverage(
    guarded,
    new Map([['policy-a', policy('policy-a', 'Example')]])
  );
  assert.match(
    result.errors.join('\n'),
    /High-priority missing coverage increased/
  );
});

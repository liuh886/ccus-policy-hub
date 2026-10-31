import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  auditExtraction,
  sealReviewPack,
  reviewHash,
  extractionCacheKey,
  validateReviewPack,
} from './lib/extraction-review.mjs';
import { writePrivateReviewFiles } from './lib/private-review-files.mjs';

function fixture(text = '😀 Eligibility requires A and B.') {
  const pack = sealReviewPack([
    {
      id: 'synthetic-case',
      risks: ['preserve conjunction'],
      units: [
        {
          id: 'synthetic-unit',
          text,
          raw_sha256: reviewHash('synthetic raw'),
          unit_sha256: reviewHash(text),
          coverage: 'historical_snapshot',
          edition: 'fixture',
          source_kind: 'legislation',
          layout_available: false,
          locator: { description: 'synthetic section' },
        },
      ],
    },
  ]);
  const unit = pack.cases[0].units[0];
  const run = {
    profile: pack.profile,
    pack_sha256: pack.pack_sha256,
    model_id: 'synthetic-fixture-no-model-executed',
    generation_settings: {},
    outputs: [
      {
        id: 'candidate',
        case_id: 'synthetic-case',
        decision: 'extract',
        statement: 'A alone is sufficient.',
        claim_kind: 'legal_text_statement',
        scope: {
          coverage: unit.coverage,
          edition: unit.edition,
          currentness: 'not_verified',
        },
        evidence: [
          {
            unit_id: unit.id,
            raw_sha256: unit.raw_sha256,
            unit_sha256: unit.unit_sha256,
            quote: 'Eligibility requires A and B.',
          },
        ],
        missing_context: [],
      },
    ],
  };
  return { pack, run };
}

test('exact quotation is locatable but does not establish semantic support', () => {
  const { pack, run } = fixture();
  const audit = auditExtraction(pack, run),
    result = audit.results[0];
  assert.equal(result.status, 'needs_support_review');
  assert.equal(result.semantic_support, 'not_evaluated');
  assert.equal(result.verified_unit_locators[0].start_offset, 3);
  assert.equal(result.human_review_status, 'not_reviewed');
  assert.equal(audit.summary.human_supported_items, 0);
  assert.equal(audit.summary.knowledge_accuracy, null);
  assert.equal(audit.model_execution_verified, false);
});

for (const [code, mutate] of [
  [
    'QUOTE_NOT_FOUND',
    (r) => {
      r.evidence[0].quote = 'not in source';
    },
  ],
  [
    'SOURCE_VERSION_OR_CONTEXT_MISMATCH',
    (r) => {
      r.evidence[0].raw_sha256 = reviewHash('different');
    },
  ],
  [
    'SOURCE_VERSION_OR_CONTEXT_MISMATCH',
    (r) => {
      r.evidence[0].unit_sha256 = reviewHash('different');
    },
  ],
  [
    'UNKNOWN_SOURCE_UNIT',
    (r) => {
      r.evidence[0].unit_id = 'other';
    },
  ],
  [
    'SCOPE_OR_EDITION_MISMATCH',
    (r) => {
      r.scope.edition = 'different';
    },
  ],
  [
    'SCOPE_OR_EDITION_MISMATCH',
    (r) => {
      r.scope.coverage = 'different';
    },
  ],
  [
    'CURRENTNESS_NOT_VERIFIED',
    (r) => {
      r.scope.currentness = 'current_verified';
    },
  ],
  [
    'LAYOUT_EVIDENCE_UNAVAILABLE',
    (r) => {
      r.claim_kind = 'diagram_relation';
    },
  ],
])
  test(`blocks ${code}`, () => {
    const { pack, run } = fixture();
    mutate(run.outputs[0]);
    const result = auditExtraction(pack, run).results[0];
    assert.equal(result.status, 'blocked');
    assert.ok(result.integrity_issues.includes(code));
  });

test('ambiguous quotes and report-as-law claims are blocked', () => {
  const { pack, run } = fixture(
    'Eligibility requires A and B. Eligibility requires A and B.'
  );
  assert.ok(
    auditExtraction(pack, run).results[0].integrity_issues.includes(
      'QUOTE_AMBIGUOUS'
    )
  );
  pack.cases[0].units[0].source_kind = 'secondary_report';
  const resealed = sealReviewPack(pack.cases);
  run.pack_sha256 = resealed.pack_sha256;
  assert.ok(
    auditExtraction(resealed, run).results[0].integrity_issues.includes(
      'SECONDARY_REPORT_AS_LEGAL_AUTHORITY'
    )
  );
});

test('abstention requires a gap and cannot contain a statement or evidence', () => {
  const { pack, run } = fixture();
  const item = run.outputs[0];
  Object.assign(item, {
    decision: 'abstain',
    statement: null,
    evidence: [],
    missing_context: ['external definition missing'],
  });
  assert.equal(auditExtraction(pack, run).results[0].status, 'abstained');
  item.statement = 'claim';
  assert.equal(auditExtraction(pack, run).results[0].status, 'blocked');
});

test('candidate output cannot self-approve or silently use another context', () => {
  const { pack, run } = fixture();
  run.outputs[0].human_review_status = 'approved';
  assert.throws(() => auditExtraction(pack, run), /schema rejected/);
  delete run.outputs[0].human_review_status;
  run.pack_sha256 = reviewHash('other');
  assert.throws(() => auditExtraction(pack, run), /different source context/);
});

test('empty outputs expose missing cases rather than implying completeness', () => {
  const { pack, run } = fixture();
  run.outputs = [];
  const audit = auditExtraction(pack, run);
  assert.equal(audit.summary.cases_with_outputs, 0);
  assert.deepEqual(audit.summary.cases_without_outputs, ['synthetic-case']);
  assert.equal(audit.summary.knowledge_accuracy, null);
});

test('resealed incompatible schemas and empty source packs are rejected', () => {
  const { pack } = fixture();
  pack.candidate_schema = {};
  pack.candidate_schema_sha256 = reviewHash({});
  delete pack.pack_sha256;
  pack.pack_sha256 = reviewHash(pack);
  assert.throws(() => validateReviewPack(pack), /fingerprint/);
  assert.throws(
    () => validateReviewPack(sealReviewPack([])),
    /needs source cases/
  );
});

test('cache identity changes with context, source, prompt, model and settings', () => {
  const { pack } = fixture();
  const original = extractionCacheKey(pack, 'fixture');
  assert.equal(original, extractionCacheKey(pack, 'fixture'));
  assert.notEqual(original, extractionCacheKey(pack, 'other'));
  assert.notEqual(
    original,
    extractionCacheKey(pack, 'fixture', { temperature: 0 })
  );
  const changed = structuredClone(pack.cases);
  changed[0].units[0].raw_sha256 = reviewHash('new raw');
  assert.notEqual(
    original,
    extractionCacheKey(sealReviewPack(changed), 'fixture')
  );
  const prompt = structuredClone(pack);
  prompt.prompt += ' changed';
  prompt.prompt_sha256 = reviewHash(prompt.prompt);
  delete prompt.pack_sha256;
  prompt.pack_sha256 = reviewHash(prompt);
  assert.notEqual(original, extractionCacheKey(prompt, 'fixture'));
  pack.cases[0].units[0].text += ' tampered';
  assert.throws(() => validateReviewPack(pack), /fingerprint/);
  assert.throws(
    () => validateReviewPack(sealReviewPack(pack.cases)),
    /text hash/
  );
});

test('private writer excludes publication directories, traversal and symlink escapes', () => {
  const repository = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ccus-extraction-review-')
  );
  try {
    const files = new Map([['pack.json', '{}']]);
    for (const directory of [
      'public',
      'dist',
      'scripts/data',
      '.codex/private-extraction/../../public',
    ])
      assert.throws(
        () =>
          writePrivateReviewFiles(
            repository,
            path.join(repository, directory),
            files
          ),
        /must stay under/
      );
    const target = path.join(repository, '.codex/private-extraction/cohort');
    writePrivateReviewFiles(repository, target, files);
    assert.equal(
      fs.readFileSync(path.join(target, '.gitignore'), 'utf8'),
      '*\n'
    );
    assert.throws(
      () =>
        writePrivateReviewFiles(
          repository,
          target,
          new Map([['../pack.json', '{}']])
        ),
      /flat filenames/
    );
    const outside = path.join(repository, 'outside');
    fs.mkdirSync(outside);
    fs.symlinkSync(outside, path.join(target, 'escape'), 'junction');
    assert.throws(
      () =>
        writePrivateReviewFiles(repository, path.join(target, 'escape'), files),
      /must stay under/
    );
  } finally {
    const real = fs.realpathSync(repository);
    assert.equal(path.dirname(real), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(real).startsWith('ccus-extraction-review-'));
    fs.rmSync(real, { recursive: true, force: true });
  }
});

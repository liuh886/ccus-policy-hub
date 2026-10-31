import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writePrivateReviewFiles } from './lib/private-review-files.mjs';
import { sealReviewPack, reviewHash } from './lib/extraction-review.mjs';
import {
  prepareReferenceReview,
  referenceReviewMarkdown,
} from './lib/extraction-reference.mjs';

function fixture() {
  const text = 'A and B are required.';
  const unit = {
    id: 'synthetic-unit',
    text,
    unit_sha256: reviewHash(text),
    raw_sha256: reviewHash('raw'),
    source_kind: 'legislation',
    coverage: 'historical_snapshot',
    edition: 'fixture',
    layout_available: false,
    locator: { description: 'section' },
  };
  const pack = sealReviewPack([
    { id: 'case', risks: ['conjunction loss'], units: [unit] },
  ]);
  const draft = {
    profile: 'extraction-reference-draft-v1',
    pack_sha256: pack.pack_sha256,
    authorship: 'agent_draft',
    cases: [
      {
        case_id: 'case',
        expectations: [
          {
            id: 'conjunction',
            statement: 'A alone suffices.',
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
                quote: text,
              },
            ],
            missing_context: [],
          },
        ],
        required_checks: [
          { id: 'conditions', description: 'Preserve both A and B.' },
        ],
        must_not_infer: ['current law'],
      },
    ],
  };
  return { pack, draft };
}

test('reference preparation retains unreviewed semantic and omission status, even for a false proposition', () => {
  const { pack, draft } = fixture();
  const review = prepareReferenceReview(pack, draft),
    item = review.cases[0];
  assert.equal(review.reference_draft_sha256, reviewHash(draft));
  assert.equal(review.gold_status, 'not_annotated');
  assert.equal(review.knowledge_accuracy, null);
  assert.equal(item.expectations[0].semantic_support, 'not_reviewed');
  assert.equal(item.expectations[0].qualifier_retention, 'not_reviewed');
  assert.equal(item.expectations[0].locators.length, 1);
  assert.equal(item.source_identity_review, 'not_reviewed');
  assert.equal(item.missing_reference_propositions, null);
  const markdown = referenceReviewMarkdown(review);
  assert.ok(markdown.includes('- [ ] conditions'));
  assert.ok(markdown.includes('A alone suffices.'));
  assert.ok(!markdown.includes('[x]'));
});

for (const [name, mutate, error] of [
  [
    'stale context',
    (d) => {
      d.pack_sha256 = reviewHash('other');
    },
    /another source pack/,
  ],
  [
    'self-assigned human approval',
    (d) => {
      d.authorship = 'human';
    },
    /schema rejected/,
  ],
  [
    'injected approval field',
    (d) => {
      d.cases[0].expectations[0].approved = true;
    },
    /schema rejected/,
  ],
  [
    'missing case',
    (d) => {
      d.cases = [];
    },
    /schema rejected/,
  ],
  [
    'duplicate case',
    (d) => {
      d.cases.push(structuredClone(d.cases[0]));
    },
    /duplicate reference case/,
  ],
  [
    'unknown case',
    (d) => {
      d.cases[0].case_id = 'other';
    },
    /Unknown/,
  ],
  [
    'duplicate expectation',
    (d) => {
      d.cases[0].expectations.push(structuredClone(d.cases[0].expectations[0]));
    },
    /Duplicate reference expectation/,
  ],
  [
    'duplicate check',
    (d) => {
      d.cases[0].required_checks.push(
        structuredClone(d.cases[0].required_checks[0])
      );
    },
    /Duplicate reference check/,
  ],
  [
    'false quotation',
    (d) => {
      d.cases[0].expectations[0].evidence[0].quote = 'not present';
    },
    /blocked quotation/,
  ],
  [
    'stale source',
    (d) => {
      d.cases[0].expectations[0].evidence[0].raw_sha256 = reviewHash('other');
    },
    /blocked quotation/,
  ],
  [
    'unsupported currentness',
    (d) => {
      d.cases[0].expectations[0].scope.currentness = 'current_verified';
    },
    /blocked quotation/,
  ],
])
  test(`reference draft rejects ${name}`, () => {
    const { pack, draft } = fixture();
    mutate(draft);
    assert.throws(() => prepareReferenceReview(pack, draft), error);
  });

test('a multi-case source pack cannot be silently reduced to one reference case', () => {
  const { pack, draft } = fixture();
  const other = structuredClone(pack.cases[0]);
  other.id = 'other';
  other.units[0].id = 'other-unit';
  const larger = sealReviewPack([...pack.cases, other]);
  draft.pack_sha256 = larger.pack_sha256;
  assert.throws(
    () => prepareReferenceReview(larger, draft),
    /every selected case/
  );
});

test('reference worksheet reruns cannot erase annotations or partially write a changed batch', () => {
  const repository = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ccus-reference-review-')
  );
  try {
    const output = path.join(repository, '.codex/private-extraction/cohort');
    const files = new Map([['reference-review.md', 'original']]);
    writePrivateReviewFiles(repository, output, files, { overwrite: false });
    writePrivateReviewFiles(repository, output, files, { overwrite: false });
    fs.writeFileSync(path.join(output, 'reference-review.md'), 'human notes');
    assert.throws(
      () =>
        writePrivateReviewFiles(
          repository,
          output,
          new Map([
            ['new.json', '{}'],
            ['reference-review.md', 'regenerated'],
          ]),
          { overwrite: false }
        ),
      /preserve annotations/
    );
    assert.equal(
      fs.readFileSync(path.join(output, 'reference-review.md'), 'utf8'),
      'human notes'
    );
    assert.ok(!fs.existsSync(path.join(output, 'new.json')));
  } finally {
    const resolved = fs.realpathSync(repository);
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('ccus-reference-review-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});

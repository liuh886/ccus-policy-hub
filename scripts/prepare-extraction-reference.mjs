#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  prepareReferenceReview,
  referenceReviewMarkdown,
} from './lib/extraction-reference.mjs';
import { writePrivateReviewFiles } from './lib/private-review-files.mjs';

const args = process.argv.slice(2);
if (args.length !== 3)
  throw new Error(
    'Usage: node scripts/prepare-extraction-reference.mjs <private-pack.json> <agent-reference-draft.json> <private-output-folder>'
  );
const pack = JSON.parse(fs.readFileSync(args[0], 'utf8'));
const draft = JSON.parse(fs.readFileSync(args[1], 'utf8'));
const review = prepareReferenceReview(pack, draft);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
writePrivateReviewFiles(
  root,
  args[2],
  new Map([
    ['reference-review.json', JSON.stringify(review, null, 2) + '\n'],
    ['reference-review.md', referenceReviewMarkdown(review)],
  ]),
  { overwrite: false }
);
console.log(
  JSON.stringify({
    cases: review.cases.length,
    reference_drafts: review.cases.reduce(
      (n, c) => n + c.expectations.length,
      0
    ),
    required_checks: review.cases.reduce(
      (n, c) => n + c.required_checks.length,
      0
    ),
    human_review_status: review.human_review_status,
    gold_status: review.gold_status,
    knowledge_accuracy: review.knowledge_accuracy,
  })
);

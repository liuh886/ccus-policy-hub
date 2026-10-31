#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditExtraction } from './lib/extraction-review.mjs';
import { writePrivateReviewFiles } from './lib/private-review-files.mjs';

const args = process.argv.slice(2);
if (args.length !== 3)
  throw new Error(
    'Usage: node scripts/audit-extraction-review.mjs <private-pack.json> <candidate-run.json> <private-output-folder>'
  );
const pack = JSON.parse(fs.readFileSync(args[0], 'utf8'));
const run = JSON.parse(fs.readFileSync(args[1], 'utf8'));
const audit = auditExtraction(pack, run);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
writePrivateReviewFiles(
  root,
  args[2],
  new Map([['audit.json', JSON.stringify(audit, null, 2) + '\n']])
);
console.log(JSON.stringify(audit.summary));
if (audit.summary.blocked) process.exitCode = 1;

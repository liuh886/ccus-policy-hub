import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectEvidence, digest, EvidenceError } from './source-evidence.mjs';
import { queryRows } from './sqlite-query.mjs';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const pilotPath = path.join(ROOT, 'scripts/data/evidence/us-45q-2024');

// SQLite owns accepted policy facts; Git owns this evidence snapshot and review
// input. Original text is never copied into a second database storage authority.
export function sourceEvidenceFiles(db, { directory = pilotPath } = {}) {
  const input = JSON.parse(
    fs.readFileSync(path.join(directory, 'packet.json'), 'utf8')
  );
  const raw = fs.readFileSync(path.join(directory, 'source.html'));
  const checked = inspectEvidence(input, raw);
  if (
    !queryRows(db, 'SELECT id FROM policies WHERE id=?', [input.policy_id])
      .length
  )
    throw new EvidenceError(
      'POLICY_NOT_FOUND',
      'Source refers to an unknown SQLite policy.'
    );
  const stem = `${input.document_id}/${input.raw_sha256}`;
  const record = {
    schema_version: '1.0.0',
    document_id: input.document_id,
    policy_id: input.policy_id,
    title: input.title,
    source_url: input.source_url,
    evidence_level: 'source_document',
    source_language: 'en',
    edition: input.edition,
    fetched_at: input.fetched_at,
    published_at: input.published_at,
    source_current_through: input.source_current_through,
    coverage: 'historical_snapshot',
    source_currentness_verified: false,
    review: input.review,
    extractor_version: input.extractor_version,
    raw_sha256: input.raw_sha256,
    normalized_sha256: input.normalized_sha256,
    raw_file: `${stem}.html.txt`,
    normalized_file: `${stem}.normalized.txt`,
    anchors: checked.anchors,
    gaps: [
      ...(checked.requires_review ? ['HUMAN_ANCHOR_REVIEW_PENDING'] : []),
      'CURRENT_LAW_NOT_VERIFIED',
      'LATER_AMENDMENTS_AND_GUIDANCE_NOT_COVERED',
    ],
  };
  const json = JSON.stringify(record, null, 2) + '\n';
  const files = new Map([
    [`${input.document_id}.json`, json],
    [record.raw_file, raw],
    [record.normalized_file, checked.normalized_text],
  ]);
  files.set(
    'index.json',
    JSON.stringify(
      {
        schema_version: '1.0.0',
        count: 1,
        records: [
          {
            document_id: input.document_id,
            policy_id: input.policy_id,
            file: `${input.document_id}.json`,
            sha256: digest(json),
            coverage: record.coverage,
            review_status: input.review.status,
          },
        ],
      },
      null,
      2
    ) + '\n'
  );
  return files;
}

export function publishSourceEvidence(files, outputDir) {
  for (const name of files.keys())
    if (
      !/^(index\.json|[a-z0-9-]+\.json|[a-z0-9-]+\/[a-f0-9]{64}\.(html|normalized)\.txt)$/.test(
        name
      )
    )
      throw new EvidenceError(
        'INVALID_OUTPUT_PATH',
        'Invalid evidence output name.'
      );
  for (const [name, content] of files) {
    const target = path.join(outputDir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectEvidence, digest, EvidenceError } from './source-evidence.mjs';
import { queryRows } from './sqlite-query.mjs';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const defaultEvidenceRoot = path.join(ROOT, 'scripts/data/evidence');

function collectPacketDirectories(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const dirs = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(rootDir, entry.name);
    if (fs.existsSync(path.join(candidate, 'packet.json')))
      dirs.push(candidate);
  }
  return dirs.sort();
}

// SQLite owns accepted policy facts; Git owns these evidence snapshots and review
// inputs. Original text is never copied into a second database storage authority.
export function sourceEvidenceFiles(
  db,
  { rootDir = defaultEvidenceRoot, directory } = {}
) {
  const dirs = directory ? [directory] : collectPacketDirectories(rootDir);
  const loaded = dirs.map((dir) => {
    const input = JSON.parse(
      fs.readFileSync(path.join(dir, 'packet.json'), 'utf8')
    );
    const storage = input.storage ?? 'git_inline';
    if (storage === 'external_archive') {
      const normalizedPath = path.join(dir, 'normalized.txt');
      const normalizedText = fs.existsSync(normalizedPath)
        ? fs.readFileSync(normalizedPath, 'utf8')
        : null;
      return { input, raw: null, normalizedText };
    }
    const raw = fs.readFileSync(path.join(dir, 'source.html'));
    return { input, raw, normalizedText: null };
  });
  loaded.sort((a, b) =>
    String(a.input.document_id || '').localeCompare(
      String(b.input.document_id || ''),
      'en'
    )
  );
  const files = new Map();
  const indexRecords = [];
  const seenDocumentIds = new Set();
  for (const { input, raw, normalizedText } of loaded) {
    const checked = inspectEvidence(input, raw, { normalizedText });
    if (seenDocumentIds.has(checked.document_id))
      throw new EvidenceError(
        'DUPLICATE_DOCUMENT',
        `Duplicate source evidence document ID: ${checked.document_id}`
      );
    seenDocumentIds.add(checked.document_id);
    if (
      !queryRows(db, 'SELECT id FROM policies WHERE id=?', [input.policy_id])
        .length
    )
      throw new EvidenceError(
        'POLICY_NOT_FOUND',
        `Source refers to an unknown SQLite policy: ${input.policy_id}`
      );
    const stem = `${input.document_id}/${input.raw_sha256}`;
    const isExternal = checked.storage === 'external_archive';
    const rawFile = isExternal ? null : `${stem}.html.txt`;
    const normalizedFile =
      checked.normalized_text !== null ? `${stem}.normalized.txt` : null;
    const record = {
      schema_version: '1.0.0',
      storage: checked.storage,
      ...(isExternal
        ? { external_uri: checked.external_uri, bytes: checked.bytes }
        : {}),
      document_id: input.document_id,
      policy_id: input.policy_id,
      title: input.title,
      source_url: input.source_url,
      evidence_level: 'source_document',
      source_language: checked.source_language,
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
      raw_file: rawFile,
      normalized_file: normalizedFile,
      anchors: checked.anchors,
      gaps: [
        ...(checked.requires_review ? ['HUMAN_ANCHOR_REVIEW_PENDING'] : []),
        ...(isExternal ? ['EXTERNAL_ARCHIVE_ORIGINAL_BYTES_NOT_INLINE'] : []),
        'CURRENT_LAW_NOT_VERIFIED',
        'LATER_AMENDMENTS_AND_GUIDANCE_NOT_COVERED',
      ],
    };
    const json = JSON.stringify(record, null, 2) + '\n';
    files.set(`${input.document_id}.json`, json);
    if (rawFile !== null) files.set(rawFile, raw);
    if (normalizedFile !== null)
      files.set(normalizedFile, checked.normalized_text);
    indexRecords.push({
      document_id: input.document_id,
      policy_id: input.policy_id,
      file: `${input.document_id}.json`,
      sha256: digest(json),
      coverage: record.coverage,
      review_status: input.review.status,
      source_language: record.source_language,
    });
  }
  files.set(
    'index.json',
    JSON.stringify(
      {
        schema_version: '1.0.0',
        count: indexRecords.length,
        records: indexRecords,
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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectEvidence, digest, EvidenceError } from './source-evidence.mjs';
import { queryRows } from './sqlite-query.mjs';
import { pruneStaleFiles } from './publish-clean.mjs';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
export const DEFAULT_EVIDENCE_ROOT = path.join(ROOT, 'scripts/data/evidence');

function readSiblingFile(dir, name, { required = false } = {}) {
  if (!name) return null;
  if (path.basename(name) !== name || name === '.' || name === '..')
    throw new EvidenceError(
      'INVALID_INPUT_PATH',
      'Evidence inputs must be explicit sibling files.'
    );
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) {
    if (required) {
      throw new EvidenceError(
        'MISSING_RAW_SOURCE',
        `Missing required evidence file: ${name}`
      );
    }
    return null;
  }
  const real = fs.realpathSync(file);
  if (path.dirname(real) !== fs.realpathSync(dir))
    throw new EvidenceError(
      'INVALID_INPUT_PATH',
      'Evidence file escapes its packet directory.'
    );
  return fs.readFileSync(real);
}

export function collectPacketFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const files = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name === 'packet.json') files.push(full);
    }
  };
  visit(rootDir);
  return files.sort();
}

export function loadEvidencePacket(
  packetFile,
  { allowMissingRaw = false } = {}
) {
  const file =
    packetFile instanceof URL ? fileURLToPath(packetFile) : packetFile;
  const dir = path.dirname(file);
  const manifestBytes = fs.readFileSync(file);
  const input = JSON.parse(manifestBytes.toString('utf8'));
  const storage = input.storage ?? 'git_inline';
  let raw = null;
  let normalizedBytes = null;

  if (storage === 'external_archive') {
    const rawName =
      input.raw_file !== undefined ? input.raw_file : 'source.html';
    raw = readSiblingFile(dir, rawName, { required: false });
    const normName =
      input.normalized_file !== undefined
        ? input.normalized_file
        : 'normalized.txt';
    normalizedBytes = readSiblingFile(dir, normName, { required: false });
  } else {
    const rawName =
      input.raw_file !== undefined ? input.raw_file : 'source.html';
    raw = readSiblingFile(dir, rawName, { required: !allowMissingRaw });
    if (input.normalized_file) {
      normalizedBytes = readSiblingFile(dir, input.normalized_file, {
        required: false,
      });
    }
  }

  return {
    file,
    dir,
    manifestBytes,
    manifest_sha256: digest(manifestBytes),
    input,
    raw,
    normalizedBytes,
    normalizedText: normalizedBytes ? normalizedBytes.toString('utf8') : null,
  };
}

export function loadEvidencePackets(
  rootDir = DEFAULT_EVIDENCE_ROOT,
  options = {}
) {
  const resolvedRoot =
    rootDir instanceof URL ? fileURLToPath(rootDir) : rootDir;
  return collectPacketFiles(resolvedRoot)
    .map((file) => loadEvidencePacket(file, options))
    .sort((a, b) =>
      String(a.input.document_id || '').localeCompare(
        String(b.input.document_id || ''),
        'en'
      )
    );
}

// SQLite owns accepted policy facts; Git owns these evidence snapshots and review
// inputs. Original text is never copied into a second database storage authority.
export function sourceEvidenceFiles(
  db,
  { rootDir = DEFAULT_EVIDENCE_ROOT, directory } = {}
) {
  const loaded = directory
    ? [loadEvidencePacket(path.join(directory, 'packet.json'))]
    : loadEvidencePackets(rootDir);
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
  pruneStaleFiles(outputDir, files);
}

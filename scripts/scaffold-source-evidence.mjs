#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXTRACTORS,
  MAX_SOURCE_BYTES,
  EvidenceError,
  digest,
  inspectEvidence,
  normalizeOfficialHtml,
} from './lib/source-evidence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_EVIDENCE_ROOT = path.join(ROOT, 'scripts/data/evidence');

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const LANG_RE = /^[a-z]{2}(?:-[a-z0-9]+)?$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const DRAFT_REVIEW = Object.freeze({
  status: 'draft',
  reviewer: null,
  method: 'not_reviewed',
  reviewed_at: null,
});

const VALUE_FLAGS = Object.freeze({
  '--policy-id': 'policyId',
  '--document-id': 'documentId',
  '--url': 'url',
  '--file': 'file',
  '--extractor': 'extractor',
  '--lang': 'lang',
  '--edition': 'edition',
  '--current-through': 'currentThrough',
  '--published-at': 'publishedAt',
  '--anchor-id': 'anchorId',
  '--locator': 'locator',
  '--query': 'query',
  '--start': 'start',
  '--end': 'end',
  '--title-en': 'titleEn',
  '--title-zh': 'titleZh',
  '--out-dir': 'outDir',
});

export function parseScaffoldArgs(args) {
  const options = {
    extractor: 'official-html-v1',
    lang: 'en',
    edition: null,
    currentThrough: null,
    publishedAt: null,
    outDir: DEFAULT_EVIDENCE_ROOT,
    overwrite: false,
  };
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--overwrite') {
      options.overwrite = true;
      continue;
    }
    const key = VALUE_FLAGS[arg];
    if (!key) {
      throw new EvidenceError(
        'INVALID_ARGUMENT',
        `Unsupported argument: ${arg}`
      );
    }
    if (seen.has(key)) {
      throw new EvidenceError('INVALID_ARGUMENT', `Duplicate option: ${arg}`);
    }
    seen.add(key);
    const value = args[++i];
    if (value === undefined || value.startsWith('--')) {
      throw new EvidenceError('INVALID_ARGUMENT', `${arg} requires a value.`);
    }
    options[key] = value;
  }

  for (const [flag, key] of [
    ['--policy-id', 'policyId'],
    ['--document-id', 'documentId'],
    ['--url', 'url'],
    ['--anchor-id', 'anchorId'],
    ['--locator', 'locator'],
  ]) {
    if (!options[key] || !String(options[key]).trim()) {
      throw new EvidenceError('INVALID_ARGUMENT', `${flag} is required.`);
    }
  }
  if (!ID_RE.test(options.policyId))
    throw new EvidenceError('INVALID_ARGUMENT', 'Invalid --policy-id.');
  if (!ID_RE.test(options.documentId))
    throw new EvidenceError('INVALID_ARGUMENT', 'Invalid --document-id.');
  if (!ID_RE.test(options.anchorId))
    throw new EvidenceError('INVALID_ARGUMENT', 'Invalid --anchor-id.');
  if (!LANG_RE.test(options.lang))
    throw new EvidenceError('INVALID_ARGUMENT', 'Invalid --lang.');
  if (!Object.hasOwn(EXTRACTORS, options.extractor))
    throw new EvidenceError(
      'UNSUPPORTED_EXTRACTOR',
      `Unsupported extractor: ${options.extractor}`
    );

  let parsedUrl;
  try {
    parsedUrl = new URL(options.url);
  } catch {
    throw new EvidenceError('INVALID_ARGUMENT', 'Invalid --url.');
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new EvidenceError(
      'INVALID_ARGUMENT',
      '--url must use http or https.'
    );
  }
  options.url = parsedUrl.href;

  if (
    options.currentThrough !== null &&
    !DATE_RE.test(options.currentThrough)
  ) {
    throw new EvidenceError(
      'INVALID_ARGUMENT',
      '--current-through must be YYYY-MM-DD.'
    );
  }
  if (options.publishedAt !== null && !DATE_RE.test(options.publishedAt)) {
    throw new EvidenceError(
      'INVALID_ARGUMENT',
      '--published-at must be YYYY-MM-DD.'
    );
  }

  const hasQuery = options.query !== undefined;
  const hasStart = options.start !== undefined;
  const hasEnd = options.end !== undefined;
  if (hasQuery && (hasStart || hasEnd)) {
    throw new EvidenceError(
      'INVALID_ARGUMENT',
      'Provide either --query or --start/--end, not both.'
    );
  }
  if (!hasQuery && !(hasStart && hasEnd)) {
    throw new EvidenceError(
      'INVALID_ARGUMENT',
      'Provide --query <uniqueSnippet> or both --start <int> and --end <int>.'
    );
  }
  if (hasStart || hasEnd) {
    if (!/^\d+$/.test(options.start) || !/^\d+$/.test(options.end)) {
      throw new EvidenceError(
        'INVALID_ARGUMENT',
        '--start and --end must be non-negative integers.'
      );
    }
    options.start = Number(options.start);
    options.end = Number(options.end);
    if (options.end <= options.start) {
      throw new EvidenceError(
        'INVALID_ARGUMENT',
        '--end must be greater than --start.'
      );
    }
  }
  if (options.file !== undefined) {
    options.file = path.resolve(options.file);
  }
  options.outDir = path.resolve(options.outDir);
  return options;
}

export function extractUniqueQuote(normalizedText, { query, start, end }) {
  let quote;
  if (query !== undefined) {
    if (!query.length) {
      throw new EvidenceError('INVALID_ARGUMENT', '--query must not be empty.');
    }
    quote = query;
  } else {
    if (end > normalizedText.length) {
      throw new EvidenceError(
        'ANCHOR_NOT_UNIQUE',
        `Slice [${start}, ${end}) exceeds normalized text length ${normalizedText.length}.`
      );
    }
    quote = normalizedText.slice(start, end);
    if (!quote.trim()) {
      throw new EvidenceError(
        'ANCHOR_NOT_UNIQUE',
        'Selected slice cannot be blank.'
      );
    }
  }
  const first = normalizedText.indexOf(quote);
  if (first < 0) {
    throw new EvidenceError(
      'ANCHOR_NOT_UNIQUE',
      'Quote snippet did not match the normalized source text.'
    );
  }
  if (normalizedText.indexOf(quote, first + 1) >= 0) {
    throw new EvidenceError(
      'ANCHOR_NOT_UNIQUE',
      'Quote snippet matched multiple locations in the normalized source text.'
    );
  }
  return quote;
}

async function fetchSourceBytes(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new EvidenceError(
      'FETCH_FAILED',
      `HTTP ${response.status} fetching ${url}`
    );
  }
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > MAX_SOURCE_BYTES) {
    throw new EvidenceError(
      'SOURCE_TOO_LARGE',
      'The source snapshot exceeds 512 KiB.'
    );
  }
  const buf = Buffer.from(await response.arrayBuffer());
  if (buf.length > MAX_SOURCE_BYTES) {
    throw new EvidenceError(
      'SOURCE_TOO_LARGE',
      'The source snapshot exceeds 512 KiB.'
    );
  }
  return buf;
}

export async function scaffoldEvidence(options, { fetchImpl = fetch } = {}) {
  const targetDir = path.resolve(options.outDir, options.documentId);
  if (
    path.dirname(targetDir) !== path.resolve(options.outDir) ||
    !ID_RE.test(options.documentId)
  ) {
    throw new EvidenceError('INVALID_OUTPUT_PATH', 'Invalid document path.');
  }
  if (!options.overwrite && fs.existsSync(targetDir)) {
    throw new EvidenceError(
      'EVIDENCE_EXISTS',
      `Evidence directory already exists: ${targetDir} (pass --overwrite to replace).`
    );
  }
  const raw =
    options.file !== undefined
      ? fs.readFileSync(options.file)
      : await fetchSourceBytes(options.url, fetchImpl);

  const normalizedText = normalizeOfficialHtml(raw, options.extractor);
  const rawSha256 = digest(raw);
  const normalizedSha256 = digest(normalizedText);
  const exactQuote = extractUniqueQuote(normalizedText, {
    query: options.query,
    start: options.start,
    end: options.end,
  });

  const titleEn = options.titleEn?.trim() || options.documentId;
  const titleZh = options.titleZh?.trim() || `${titleEn}（待复核中文标题）`;

  // Always start in draft/not_reviewed state; human review cannot be minted here.
  const packet = {
    schema_version: '1.0.0',
    document_id: options.documentId,
    policy_id: options.policyId,
    title: { en: titleEn, zh: titleZh },
    source_url: options.url,
    source_language: options.lang,
    edition: options.edition,
    fetched_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    published_at: options.publishedAt,
    source_current_through: options.currentThrough,
    raw_file: 'source.html',
    raw_sha256: rawSha256,
    normalized_sha256: normalizedSha256,
    extractor_version: options.extractor,
    review: { ...DRAFT_REVIEW },
    anchors: [
      {
        id: options.anchorId,
        locator: options.locator,
        exact_quote: exactQuote,
        version_sha256: rawSha256,
        review: { ...DRAFT_REVIEW },
      },
    ],
  };

  const inspection = inspectEvidence(packet, raw);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'source.html'), raw);
  fs.writeFileSync(
    path.join(targetDir, 'packet.json'),
    JSON.stringify(packet, null, 2) + '\n'
  );
  return { directory: targetDir, packet, inspection };
}

async function main() {
  const options = parseScaffoldArgs(process.argv.slice(2));
  const { directory, inspection } = await scaffoldEvidence(options);
  process.stdout.write(
    JSON.stringify(
      {
        directory,
        document_id: inspection.document_id,
        policy_id: inspection.policy_id,
        raw_sha256: inspection.raw_sha256,
        normalized_sha256: inspection.normalized_sha256,
        requires_review: inspection.requires_review,
        anchors: inspection.anchors.map((a) => ({
          id: a.id,
          state: a.state,
          start_offset: a.start_offset,
          end_offset: a.end_offset,
          usable_as_reviewed_reference: a.usable_as_reviewed_reference,
        })),
      },
      null,
      2
    ) + '\n'
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    process.stderr.write(
      JSON.stringify({
        error: {
          code: error.code || 'EVIDENCE_SCAFFOLD_FAILED',
          message: error.message,
        },
      }) + '\n'
    );
    process.exitCode = 1;
  });
}

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectEvidence, EvidenceError } from './lib/source-evidence.mjs';
import {
  DEFAULT_EVIDENCE_ROOT,
  loadEvidencePacket,
  loadEvidencePackets,
} from './lib/source-evidence-files.mjs';

export { DEFAULT_EVIDENCE_ROOT, loadEvidencePacket };

function formatInspectionReport(input, raw, options = {}) {
  const { normalized_text: text, ...report } = inspectEvidence(
    input,
    raw,
    options
  );
  report.normalized_characters = text === null ? null : text.length;
  return report;
}

export function inspectAllEvidence(evidenceRoot = DEFAULT_EVIDENCE_ROOT) {
  const rootDir = path.resolve(
    evidenceRoot instanceof URL ? fileURLToPath(evidenceRoot) : evidenceRoot
  );
  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    throw new EvidenceError(
      'EVIDENCE_NOT_FOUND',
      `Evidence directory does not exist: ${rootDir}`
    );
  }
  const loaded = loadEvidencePackets(rootDir);
  if (!loaded.length) {
    throw new EvidenceError(
      'EVIDENCE_NOT_FOUND',
      `No evidence packets found under ${rootDir}`
    );
  }
  const packets = [];
  const seenDocumentIds = new Set();
  for (const { input, raw, normalizedText } of loaded) {
    const report = formatInspectionReport(input, raw, { normalizedText });
    if (seenDocumentIds.has(report.document_id)) {
      throw new EvidenceError(
        'DUPLICATE_DOCUMENT',
        `Duplicate source evidence document ID: ${report.document_id}`
      );
    }
    seenDocumentIds.add(report.document_id);
    packets.push(report);
  }
  packets.sort((a, b) =>
    String(a.document_id || '').localeCompare(String(b.document_id || ''), 'en')
  );
  return {
    count: packets.length,
    requires_review_count: packets.filter((p) => p.requires_review).length,
    packets,
  };
}

export function parseEvidenceArgs(args) {
  const options = { all: false };
  const valueFlags = {
    '--file': 'file',
    '--observed-file': 'observed',
    '--evidence-root': 'evidenceRoot',
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--all') {
      if (options.all)
        throw new EvidenceError('INVALID_ARGUMENT', 'Duplicate --all option.');
      options.all = true;
      continue;
    }
    const key = valueFlags[arg];
    if (!key)
      throw new EvidenceError(
        'INVALID_ARGUMENT',
        `Unsupported argument: ${arg}`
      );
    if (options[key] !== undefined)
      throw new EvidenceError('INVALID_ARGUMENT', `Duplicate ${arg} option.`);
    if (!args[i + 1] || args[i + 1].startsWith('--'))
      throw new EvidenceError('INVALID_ARGUMENT', `${arg} requires a value.`);
    options[key] = args[++i];
  }
  if (options.all && (options.file || options.observed)) {
    throw new EvidenceError(
      'INVALID_ARGUMENT',
      '--all cannot be combined with --file or --observed-file.'
    );
  }
  if (options.evidenceRoot && !options.all) {
    throw new EvidenceError(
      'INVALID_ARGUMENT',
      '--evidence-root requires --all.'
    );
  }
  if (options.observed && !options.file) {
    throw new EvidenceError(
      'INVALID_ARGUMENT',
      '--observed-file requires --file.'
    );
  }
  if (!options.all && !options.file) {
    throw new EvidenceError(
      'INVALID_ARGUMENT',
      '--file <packet.json> or --all required.'
    );
  }
  return options;
}

async function main() {
  const options = parseEvidenceArgs(process.argv.slice(2));
  if (options.all) {
    const summary = inspectAllEvidence(
      options.evidenceRoot
        ? path.resolve(options.evidenceRoot)
        : DEFAULT_EVIDENCE_ROOT
    );
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
    return;
  }
  const { input, raw, normalizedText } = loadEvidencePacket(
    path.resolve(options.file)
  );
  const report = formatInspectionReport(input, raw, {
    normalizedText,
    ...(options.observed
      ? { observedRaw: fs.readFileSync(options.observed) }
      : {}),
  });
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    process.stderr.write(
      JSON.stringify({
        error: {
          code: error.code || 'EVIDENCE_INSPECTION_FAILED',
          message: error.message,
        },
      }) + '\n'
    );
    process.exitCode = 1;
  });

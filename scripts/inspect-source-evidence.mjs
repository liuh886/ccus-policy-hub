#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectEvidence, EvidenceError } from './lib/source-evidence.mjs';

export function loadEvidencePacket(file) {
  file = file instanceof URL ? fileURLToPath(file) : file;
  const input = JSON.parse(fs.readFileSync(file, 'utf8'));
  const raw = fs.readFileSync(path.join(path.dirname(file), 'source.html'));
  return { input, raw };
}
export function parseEvidenceArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!['--file', '--observed-file'].includes(arg))
      throw new EvidenceError(
        'INVALID_ARGUMENT',
        `Unsupported argument: ${arg}`
      );
    if (!args[i + 1] || args[i + 1].startsWith('--'))
      throw new EvidenceError('INVALID_ARGUMENT', `${arg} requires a file.`);
    options[arg === '--file' ? 'file' : 'observed'] = args[++i];
  }
  if (!options.file)
    throw new EvidenceError(
      'INVALID_ARGUMENT',
      '--file <packet.json> required.'
    );
  return options;
}
async function main() {
  const options = parseEvidenceArgs(process.argv.slice(2));
  const { input, raw } = loadEvidencePacket(path.resolve(options.file));
  const { normalized_text: text, ...report } = inspectEvidence(
    input,
    raw,
    options.observed ? { observedRaw: fs.readFileSync(options.observed) } : {}
  );
  report.normalized_characters = text.length;
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

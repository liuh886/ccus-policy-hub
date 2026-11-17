#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { format } from 'prettier';
import { queryRows } from './lib/sqlite-query.mjs';
import {
  captureManualObservations,
  reconcileManualObservations,
} from './lib/manual-source-observations.mjs';
import { EXTRACTOR_VERSION, inspectEvidence } from './lib/source-evidence.mjs';
import {
  sha256,
  captureObservations,
  buildReadiness,
  parseVerifiedBaseline,
  renderReadiness,
} from './lib/source-readiness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = path.join(
  ROOT,
  'scripts/data/source-readiness/v4-transfer-observations.json'
);
const MANUAL = path.join(
  ROOT,
  'scripts/data/source-readiness/manual-transfer-observations.json'
);
export const VERIFIED_INVENTORY_BASELINES = [
  {
    inventory_sha256:
      '1aa9c830c7cd13dd026ebf6118bff9df590b05dc70bea1de0c8567aac15fa53d',
    file: path.join(
      ROOT,
      'scripts/data/source-readiness/inventory-url-baseline-1aa9c830.json'
    ),
    file_sha256:
      '0470ac7cc70d867b5082afb5c03a82e8ef4380db29c617e732a3448adef8d6ad',
  },
];

export function loadVerifiedBaselines(specs = VERIFIED_INVENTORY_BASELINES) {
  const baselines = new Map();
  for (const spec of specs) {
    if (!fs.existsSync(spec.file))
      throw new Error(`Missing inventory baseline snapshot: ${spec.file}`);
    const parsed = parseVerifiedBaseline(fs.readFileSync(spec.file, 'utf8'), {
      expectedInventorySha: spec.inventory_sha256,
      expectedFileSha: spec.file_sha256,
    });
    baselines.set(spec.inventory_sha256, parsed);
  }
  return baselines;
}
export function loadPackets(directory) {
  if (!fs.existsSync(directory)) return [];
  const result = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) visit(path.join(dir, entry.name));
      else if (entry.name === 'packet.json') {
        const manifestBytes = fs.readFileSync(path.join(dir, entry.name));
        const data = JSON.parse(manifestBytes.toString('utf8'));
        const read = (name) => {
          if (!name) return null;
          if (path.basename(name) !== name || name === '.' || name === '..')
            throw new Error('Evidence inputs must be explicit sibling files.');
          const file = path.join(dir, name);
          if (!fs.existsSync(file)) return null;
          const real = fs.realpathSync(file);
          if (path.dirname(real) !== fs.realpathSync(dir))
            throw new Error('Evidence file escapes its packet directory.');
          return fs.readFileSync(real);
        };
        const raw = read(data.raw_file);
        let normalized = read(data.normalized_file);
        let packetData = data;
        if (
          !normalized &&
          raw &&
          data.extractor_version === EXTRACTOR_VERSION
        ) {
          try {
            const checked = inspectEvidence(data, raw);
            normalized = Buffer.from(checked.normalized_text, 'utf8');
            packetData = { ...data, anchors: checked.anchors };
          } catch {
            // Leave normalized null so packetState flags integrity regressions.
          }
        }
        result.push({
          manifest_sha256: sha256(manifestBytes),
          data: packetData,
          raw,
          normalized,
        });
      }
    }
  };
  visit(directory);
  return result;
}

export async function generateReadiness({
  evidenceRoot = path.join(ROOT, 'scripts/data/evidence'),
  asOf = '2026-10-30',
  baselines = loadVerifiedBaselines(),
} = {}) {
  const bytes = fs.readFileSync(
    path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite')
  );
  const inventorySha = sha256(bytes);
  const SQL = await initSqlJs();
  const db = new SQL.Database(bytes);
  try {
    const policies = queryRows(
      db,
      'SELECT id,country,review_status,url FROM policies ORDER BY id'
    );
    const observations = fs.existsSync(SNAPSHOT)
      ? JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'))
      : null;
    const report = buildReadiness({
      policies,
      inventorySha,
      observations,
      packets: loadPackets(evidenceRoot),
      asOf,
      baselines,
    });
    report.manual_acquisition = reconcileManualObservations(
      fs.existsSync(MANUAL)
        ? JSON.parse(fs.readFileSync(MANUAL, 'utf8'))
        : null,
      policies,
      inventorySha,
      report.policies,
      baselines
    );
    if (report.manual_acquisition) {
      const manualSuperseded =
        report.manual_acquisition.superseded_url_manual_candidate_policy_ids;
      const combinedSuperseded = [
        ...new Set([
          ...report.superseded_url_candidates.v4_policy_ids,
          ...manualSuperseded,
        ]),
      ].sort();
      report.superseded_url_candidates.manual_policy_ids = manualSuperseded;
      report.superseded_url_candidates.policy_ids = combinedSuperseded;
      report.manual_acquisition.superseded_url_candidates = combinedSuperseded;
      report.totals.cumulative_private_raw_candidate_policies =
        report.manual_acquisition.cumulative_candidate_policy_ids.length;
      report.totals.superseded_url_candidate_policies =
        combinedSuperseded.length;
      report.totals.policies_without_raw_candidate =
        report.manual_acquisition.policies_without_raw_candidate.length;
      report.totals.manual_locally_hash_checked_unique_blobs =
        report.manual_acquisition.locally_hash_checked_unique_blobs;
    }
    return report;
  } finally {
    db.close();
  }
}

async function main() {
  const args = process.argv.slice(2),
    options = {};
  let check = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--check') check = true;
    else if (
      [
        '--as-of',
        '--evidence-root',
        '--capture-audit',
        '--capture-backlog',
        '--capture-manual',
        '--private-primary-root',
        '--private-supporting-root',
      ].includes(arg)
    ) {
      if (!args[i + 1] || args[i + 1].startsWith('--'))
        throw new Error(`${arg} requires a value`);
      options[arg.slice(2)] = args[++i];
    } else throw new Error(`Unknown argument ${arg}`);
  }
  if (options['capture-manual']) {
    if (
      check ||
      !options['private-primary-root'] ||
      !options['private-supporting-root']
    )
      throw new Error(
        'Manual capture requires both private byte directories and cannot use --check.'
      );
    const snapshot = captureManualObservations(
      fs.readFileSync(options['capture-manual']),
      options['private-primary-root'],
      options['private-supporting-root']
    );
    fs.mkdirSync(path.dirname(MANUAL), { recursive: true });
    fs.writeFileSync(MANUAL, JSON.stringify(snapshot, null, 2) + '\n');
  }
  if (options['capture-audit'] || options['capture-backlog']) {
    if (check || !options['capture-audit'] || !options['capture-backlog'])
      throw new Error(
        'Capture requires both CSV files and cannot be combined with --check.'
      );
    const snapshot = captureObservations(
      fs.readFileSync(options['capture-audit']),
      fs.readFileSync(options['capture-backlog'])
    );
    fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
    fs.writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2) + '\n');
  }
  const report = await generateReadiness({
    evidenceRoot: options['evidence-root'],
    asOf: options['as-of'],
  });
  const jsonPath = path.join(ROOT, 'docs/policy-source-readiness.json');
  const mdPath = path.join(ROOT, 'docs/policy-source-readiness.md');
  const files = [
    [jsonPath, await format(JSON.stringify(report), { parser: 'json' })],
    [mdPath, await format(renderReadiness(report), { parser: 'markdown' })],
  ];
  for (const [name, content] of files) {
    if (check) {
      if (!fs.existsSync(name) || fs.readFileSync(name, 'utf8') !== content)
        throw new Error(
          `Generated source readiness drift: ${path.basename(name)}`
        );
    } else fs.writeFileSync(name, content);
  }
  process.stdout.write(
    JSON.stringify({
      check,
      ...report.totals,
      verified_regressions: report.regressions.length,
    }) + '\n'
  );
  if (report.regressions.length) process.exitCode = 1;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    process.stderr.write(
      JSON.stringify({
        error: { code: 'SOURCE_READINESS_FAILED', message: error.message },
      }) + '\n'
    );
    process.exitCode = 1;
  });

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import {
  CONTEXT_TARGETS,
  ContextError,
  buildPolicyContext,
  renderContextMarkdown,
} from './lib/policy-context.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DB = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');
const DEFAULT_OUTPUT = path.join(ROOT, 'public/data/context');
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

export function contextFiles(db) {
  const files = new Map();
  const entries = [];
  for (const target of CONTEXT_TARGETS)
    for (const lang of ['en', 'zh']) {
      const bundle = buildPolicyContext(db, target.id, lang);
      const json = JSON.stringify(bundle, null, 2) + '\n';
      const markdown = renderContextMarkdown(bundle);
      const jsonPath = `policies/${target.id}.${lang}.json`;
      const markdownPath = `policies/${target.id}.${lang}.md`;
      files.set(jsonPath, json);
      files.set(markdownPath, markdown);
      entries.push({
        id: target.id,
        kind: target.kind,
        lang,
        policy_ids: target.policy_ids,
        data_as_of: bundle.data_as_of,
        json: jsonPath,
        markdown: markdownPath,
        sha256_json: sha256(json),
        sha256_markdown: sha256(markdown),
        evidence_level: 'record_summary',
      });
    }
  files.set(
    'index.json',
    JSON.stringify(
      { schema_version: '1.0.0', count: entries.length, records: entries },
      null,
      2
    ) + '\n'
  );
  return files;
}

export function publishContextFiles(files, outputDir, { check = false } = {}) {
  const mismatches = [];
  // Validate every path before touching the output tree. All names originate
  // in the registry, never from a caller-supplied file name.
  for (const name of files.keys())
    if (!/^(index\.json|policies\/[a-z0-9-]+\.(en|zh)\.(json|md))$/.test(name))
      throw new ContextError(
        'INVALID_OUTPUT_PATH',
        'An output name is outside the context contract.'
      );
  for (const [name, content] of files) {
    const target = path.join(outputDir, name);
    if (check) {
      if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content)
        mismatches.push(name);
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const temporary = `${target}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
      try {
        fs.writeFileSync(temporary, content);
        fs.renameSync(temporary, target);
      } finally {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
      }
    }
  }
  return mismatches;
}

export async function generatePolicyContexts({
  dbPath = DEFAULT_DB,
  outputDir = DEFAULT_OUTPUT,
  check = false,
} = {}) {
  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(dbPath)));
  try {
    const files = contextFiles(db);
    const mismatches = publishContextFiles(files, outputDir, { check });
    if (mismatches.length)
      throw new ContextError(
        'CONTEXT_DRIFT',
        `Generated context files differ: ${mismatches.join(', ')}`
      );
    return { bundles: CONTEXT_TARGETS.length * 2, files: files.size, check };
  } finally {
    db.close();
  }
}

export function parseContextArgs(args) {
  const options = {
    lang: 'en',
    format: 'json',
    check: false,
    id: null,
    help: false,
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') options.help = true;
    else if (arg === '--check') options.check = true;
    else if (['--id', '--lang', '--format'].includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith('--'))
        throw new ContextError('INVALID_ARGUMENT', `${arg} requires a value.`);
      options[arg.slice(2)] = value;
    } else
      throw new ContextError(
        'INVALID_ARGUMENT',
        `Unsupported argument: ${arg}`
      );
  }
  if (!['en', 'zh'].includes(options.lang))
    throw new ContextError(
      'UNSUPPORTED_LANGUAGE',
      'Supported languages: en, zh.'
    );
  if (!['json', 'md'].includes(options.format))
    throw new ContextError(
      'UNSUPPORTED_FORMAT',
      'Supported formats: json, md.'
    );
  if (options.check && options.id)
    throw new ContextError(
      'INVALID_ARGUMENT',
      '--check validates the complete published set; omit --id.'
    );
  if (!options.id && (args.includes('--lang') || args.includes('--format')))
    throw new ContextError(
      'INVALID_ARGUMENT',
      '--lang and --format require --id.'
    );
  return options;
}

async function main() {
  const options = parseContextArgs(process.argv.slice(2));
  if (options.help) {
    console.log(
      'Static policy context (SQLite read-only)\n  --id <context-id> --lang en|zh --format json|md   Print one bundle, without writing\n  --check                                       Verify published files\n  (no arguments)                                Generate all registered bundles\nHistorical as_of queries and tax eligibility decisions are not supported.'
    );
    return;
  }
  if (!options.id) {
    console.log(
      JSON.stringify(await generatePolicyContexts({ check: options.check }))
    );
    return;
  }
  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(DEFAULT_DB)));
  try {
    const bundle = buildPolicyContext(db, options.id, options.lang);
    process.stdout.write(
      options.format === 'md'
        ? renderContextMarkdown(bundle)
        : JSON.stringify(bundle, null, 2) + '\n'
    );
  } finally {
    db.close();
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    process.stderr.write(
      JSON.stringify({
        error: {
          code: error.code || 'CONTEXT_GENERATION_FAILED',
          message: error.message,
        },
      }) + '\n'
    );
    process.exitCode = 1;
  });

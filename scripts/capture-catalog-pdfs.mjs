#!/usr/bin/env node
// Explicit local inputs only: no directory discovery, network or archive writes.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { z } from 'astro/zod';
import { sha256 } from './lib/crypto-utils.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_TARGETS_PATH = path.join(
  ROOT,
  'scripts/data/discovery/pdf-targets.json'
);
export const DEFAULT_OUTPUT_PATH = path.join(
  ROOT,
  'scripts/data/discovery/captured-pdfs.json'
);

const pdfTargetSchema = z
  .object({
    document_id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    filename: z.string().min(1).optional(),
    title: z
      .object({
        en: z.string().trim().min(1),
        zh: z.string().trim().min(1),
      })
      .strict(),
    publisher: z.string().trim().min(1),
    source_kind: z.enum(['legislation', 'secondary_report']),
    language: z.string().regex(/^[a-z]{2}(?:-[a-z0-9]+)?$/i),
    edition: z.string().min(1).nullable(),
    source_url: z
      .string()
      .url()
      .refine(
        (value) => value.startsWith('https://'),
        'Source URL must use HTTPS.'
      ),
    policy_ids: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]*$/)),
    coverage: z.enum([
      'historical_snapshot',
      'original_enactment',
      'edition_unknown',
    ]),
    page: z.number().int().positive(),
    printed_page: z.string().min(1),
    locator: z.string().min(1),
    quote: z.string().min(1),
    printed_pattern: z
      .string()
      .min(1)
      .refine((pattern) => {
        try {
          new RegExp(pattern);
          return true;
        } catch {
          return false;
        }
      }, 'printed_pattern must be a valid regular expression.'),
  })
  .strict();

export const pdfTargetsManifestSchema = z
  .object({
    schema_version: z.literal('1.0.0'),
    targets: z.array(pdfTargetSchema).min(1),
  })
  .strict()
  .superRefine((val, ctx) => {
    const seen = new Set();
    for (const [index, target] of val.targets.entries()) {
      if (seen.has(target.document_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['targets', index, 'document_id'],
          message: `Duplicate PDF target document_id: ${target.document_id}`,
        });
      }
      seen.add(target.document_id);
    }
  });

export function loadPdfTargets(filePath = DEFAULT_TARGETS_PATH) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read PDF targets manifest: ${error.message}`);
  }
  const parsed = pdfTargetsManifestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Invalid PDF targets manifest: ${parsed.error.issues.map((i) => i.message).join('; ')}`
    );
  }
  return Object.freeze(parsed.data.targets);
}

export function parseCaptureArgs(args) {
  const options = {
    targetsPath: DEFAULT_TARGETS_PATH,
    inputDir: null,
    pdfOverrides: new Map(),
    outputPath: DEFAULT_OUTPUT_PATH,
    hasExplicitTargets: false,
    hasExplicitOutput: false,
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];
    if (arg === '--targets') {
      if (!value || value.startsWith('--'))
        throw new Error('--targets requires a file path.');
      if (options.hasExplicitTargets)
        throw new Error('Duplicate --targets option.');
      options.targetsPath = path.resolve(value);
      options.hasExplicitTargets = true;
      i++;
    } else if (arg === '--input-dir') {
      if (!value || value.startsWith('--'))
        throw new Error('--input-dir requires a directory path.');
      if (options.inputDir !== null)
        throw new Error('Duplicate --input-dir option.');
      options.inputDir = path.resolve(value);
      i++;
    } else if (arg === '--output') {
      if (!value || value.startsWith('--'))
        throw new Error('--output requires a JSON file path.');
      if (options.hasExplicitOutput)
        throw new Error('Duplicate --output option.');
      options.outputPath = path.resolve(value);
      options.hasExplicitOutput = true;
      i++;
    } else if (arg === '--pdf') {
      if (!value || value.startsWith('--'))
        throw new Error('--pdf requires <document-id>=<path>.');
      const eq = value.indexOf('=');
      if (eq <= 0 || eq === value.length - 1)
        throw new Error(
          'Invalid --pdf mapping; expected <document-id>=<path>.'
        );
      const docId = value.slice(0, eq);
      const filePath = value.slice(eq + 1);
      if (options.pdfOverrides.has(docId))
        throw new Error(`Duplicate --pdf mapping for ${docId}.`);
      options.pdfOverrides.set(docId, path.resolve(filePath));
      i++;
    } else {
      throw new Error(
        `Unsupported argument: ${arg}. Usage: node scripts/capture-catalog-pdfs.mjs [--targets <manifest.json>] [--input-dir <dir>] [--pdf <id>=<path>...] [--output <captured-pdfs.json>]`
      );
    }
  }
  if (!options.inputDir && options.pdfOverrides.size === 0) {
    throw new Error('Provide --input-dir <dir> and/or --pdf <id>=<path>.');
  }
  if (path.extname(options.outputPath).toLowerCase() !== '.json') {
    throw new Error('Capture output must be a .json file.');
  }
  return options;
}

export function resolvePdfInputs(
  targets,
  { inputDir = null, pdfOverrides = new Map() } = {}
) {
  const knownIds = new Set(targets.map((t) => t.document_id));
  for (const id of pdfOverrides.keys()) {
    if (!knownIds.has(id)) {
      throw new Error(`Unknown PDF target in --pdf override: ${id}`);
    }
  }
  const resolved = new Map();
  for (const target of targets) {
    if (pdfOverrides.has(target.document_id)) {
      const explicitPath = path.resolve(pdfOverrides.get(target.document_id));
      if (!fs.existsSync(explicitPath)) {
        throw new Error(
          `Missing PDF for ${target.document_id}: ${explicitPath}`
        );
      }
      resolved.set(target.document_id, explicitPath);
      continue;
    }
    if (!inputDir) {
      throw new Error(
        `Missing PDF input for ${target.document_id}; pass --pdf ${target.document_id}=<path> or --input-dir <dir>.`
      );
    }
    const urlBasename = path.posix.basename(
      new URL(target.source_url).pathname
    );
    const candidates = [
      `${target.document_id}.pdf`,
      ...(target.filename ? [target.filename] : []),
      ...(urlBasename ? [urlBasename] : []),
    ];
    const match = candidates
      .map((name) => path.resolve(inputDir, name))
      .find((candidate) => fs.existsSync(candidate));
    if (!match) {
      throw new Error(
        `Missing PDF for ${target.document_id} in ${inputDir} (checked: ${[...new Set(candidates)].join(', ')}).`
      );
    }
    resolved.set(target.document_id, match);
  }
  return resolved;
}

function defaultRunCommand(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(`Local extractor failed: ${command}`);
  return result;
}

export function captureCatalogPdfs({
  targetsPath = DEFAULT_TARGETS_PATH,
  inputDir = null,
  pdfOverrides = new Map(),
  outputPath = DEFAULT_OUTPUT_PATH,
  runCommand = defaultRunCommand,
} = {}) {
  const resolvedOutput = path.resolve(outputPath);
  if (path.extname(resolvedOutput).toLowerCase() !== '.json') {
    throw new Error('Capture output must be a .json file.');
  }
  const targets = loadPdfTargets(targetsPath);
  const inputPaths = resolvePdfInputs(targets, { inputDir, pdfOverrides });
  for (const inputPath of inputPaths.values()) {
    if (path.resolve(inputPath) === resolvedOutput) {
      throw new Error('Capture output must be a separate JSON file.');
    }
  }
  const infoVersion = runCommand('pdftotext', ['-v']);
  const version = (infoVersion.stdout + infoVersion.stderr).match(
    /pdftotext version ([^\s]+)/
  )?.[1];
  if (!version) throw new Error('Unknown Poppler version.');

  const records = [];
  for (const input of targets) {
    const pdfPath = inputPaths.get(input.document_id);
    const bytes = fs.readFileSync(pdfPath);
    if (
      sha256(bytes) !== input.sha256 ||
      bytes.subarray(0, 5).toString() !== '%PDF-'
    )
      throw new Error(`Frozen PDF hash mismatch: ${input.document_id}`);
    const info = runCommand('pdfinfo', [pdfPath]).stdout;
    const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
    if (!pages || input.page > pages)
      throw new Error('Invalid PDF page count.');
    const start = performance.now();
    const pageResult = runCommand('pdftotext', [
      '-f',
      String(input.page),
      '-l',
      String(input.page),
      '-layout',
      pdfPath,
      '-',
    ]);
    const rawPage = pageResult.stdout;
    const text = rawPage.normalize('NFC').replace(/\s+/gu, ' ').trim();
    if (
      text.split(input.quote).length !== 2 ||
      !new RegExp(input.printed_pattern).test(rawPage)
    )
      throw new Error(`Locator or printed page mismatch: ${input.document_id}`);
    const pageMs = performance.now() - start;
    const fullStart = performance.now();
    const fullResult = runCommand('pdftotext', ['-layout', pdfPath, '-']);
    const full = fullResult.stdout;
    const {
      sha256: rawSha256,
      filename: ignoredFilename,
      page,
      quote,
      locator,
      printed_page,
      printed_pattern: ignoredPattern,
      ...metadata
    } = input;
    void ignoredFilename;
    void ignoredPattern;
    records.push({
      ...metadata,
      raw_sha256: rawSha256,
      bytes: bytes.length,
      physical_pages: pages,
      locator: {
        id: 'selected-heading-or-caption',
        physical_page: page,
        printed_page,
        description: locator,
        exact_quote: quote,
        page_text_sha256: sha256(text),
        normalization: 'NFC-whitespace-v1',
        review_status: 'draft',
      },
      capture: {
        tool: 'Poppler pdftotext -layout',
        version,
        original_bytes_checked: true,
        full_page_text_published: false,
        selected_page_warnings: pageResult.stderr.split('\n').filter(Boolean)
          .length,
        full_document_warnings: fullResult.stderr.split('\n').filter(Boolean)
          .length,
        selected_page_characters: text.length,
        full_document_characters: full.length,
        selected_page_ms: Math.round(pageMs),
        full_document_ms: Math.round(performance.now() - fullStart),
      },
    });
  }
  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  fs.writeFileSync(
    resolvedOutput,
    JSON.stringify(
      { capture_type: 'explicit_private_pdf_metadata_only', records },
      null,
      2
    ) + '\n'
  );
  return { outputPath: resolvedOutput, records };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const options = parseCaptureArgs(process.argv.slice(2));
  const { records } = captureCatalogPdfs(options);
  console.log(
    JSON.stringify(
      records.map((r) => ({
        document_id: r.document_id,
        raw_sha256: r.raw_sha256,
        ...r.capture,
      }))
    )
  );
}

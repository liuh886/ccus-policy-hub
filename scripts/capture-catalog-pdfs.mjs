#!/usr/bin/env node
// Explicit local inputs only: no directory discovery, network or archive writes.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { hash } from './consume-agent-data.mjs';

const inputs = [
  {
    document_id: 'uk-energy-act-2023-enacted',
    sha256: '2dbf9edc060777a2d775c80f1e93b9f63f85e185e6d5a100e2283d32610c71fa',
    title: {
      en: 'Energy Act 2023, chapter 52 — original enactment',
      zh: '英国《2023年能源法》（2023 c.52）：原始制定文本',
    },
    publisher: 'legislation.gov.uk',
    source_kind: 'legislation',
    language: 'en',
    edition: '2023 original enactment',
    source_url:
      'https://www.legislation.gov.uk/ukpga/2023/52/pdfs/ukpga_20230052_en.pdf',
    policy_ids: ['uk-energy-act-2023'],
    coverage: 'original_enactment',
    page: 24,
    printed_page: '4',
    locator: 'Section 2, heading',
    quote: 'Prohibition on unlicensed activities',
    printed_pattern: '^\\s*4\\s+Energy Act',
  },
  {
    document_id: 'gccsi-ccus-progress-china-en',
    sha256: '60991a814ab98ef9fa5dd3b96ea47785a560b27c3028689ca6e9f5506baf92e4',
    title: {
      en: 'CCUS Progress in China — A Status Report',
      zh: '中国 CCUS 进展：状况报告（英文版）',
    },
    publisher: 'Global CCS Institute publication listing',
    source_kind: 'secondary_report',
    language: 'en',
    edition: null,
    source_url:
      'https://www.globalccsinstitute.com/wp-content/uploads/2025/10/CCUS-Progress-in-China.pdf',
    policy_ids: [],
    coverage: 'edition_unknown',
    page: 16,
    printed_page: '6',
    locator: 'Figure 1-3, caption',
    quote: 'Figure 1-3. CCUS technology system',
    printed_pattern: '\\[\\s*6\\s*\\]\\s*$',
  },
];
const args = process.argv.slice(2);
if (args.length !== 3)
  throw new Error(
    'Usage: node scripts/capture-catalog-pdfs.mjs <existing-UK-PDF> <existing-GCCSI-PDF> <output-JSON>'
  );
if (
  path.extname(args[2]).toLowerCase() !== '.json' ||
  args.slice(0, 2).some((file) => path.resolve(file) === path.resolve(args[2]))
)
  throw new Error('Capture output must be a separate JSON file.');
function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(`Local extractor failed: ${command}`);
  return result;
}
const infoVersion = run('pdftotext', ['-v']);
const version = (infoVersion.stdout + infoVersion.stderr).match(
  /pdftotext version ([^\s]+)/
)?.[1];
if (!version) throw new Error('Unknown Poppler version.');
const records = [];
for (const [i, input] of inputs.entries()) {
  const bytes = fs.readFileSync(args[i]);
  if (
    hash(bytes) !== input.sha256 ||
    bytes.subarray(0, 5).toString() !== '%PDF-'
  )
    throw new Error(`Frozen PDF hash mismatch: ${input.document_id}`);
  const info = run('pdfinfo', [args[i]]).stdout;
  const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
  if (!pages || input.page > pages) throw new Error('Invalid PDF page count.');
  const start = performance.now();
  const pageResult = run('pdftotext', [
    '-f',
    String(input.page),
    '-l',
    String(input.page),
    '-layout',
    args[i],
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
  const fullResult = run('pdftotext', ['-layout', args[i], '-']);
  const full = fullResult.stdout;
  const {
    sha256,
    page,
    quote,
    locator,
    printed_page,
    printed_pattern: ignored,
    ...metadata
  } = input;
  void ignored;
  records.push({
    ...metadata,
    raw_sha256: sha256,
    bytes: bytes.length,
    physical_pages: pages,
    locator: {
      id: 'selected-heading-or-caption',
      physical_page: page,
      printed_page,
      description: locator,
      exact_quote: quote,
      page_text_sha256: hash(text),
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
fs.writeFileSync(
  args[2],
  JSON.stringify(
    { capture_type: 'explicit_private_pdf_metadata_only', records },
    null,
    2
  ) + '\n'
);
console.log(
  JSON.stringify(
    records.map((r) => ({
      document_id: r.document_id,
      raw_sha256: r.raw_sha256,
      ...r.capture,
    }))
  )
);

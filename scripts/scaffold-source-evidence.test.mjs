import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MAX_EXTERNAL_SOURCE_BYTES,
  MAX_SOURCE_BYTES,
  digest,
  inspectEvidence,
  normalizeOfficialHtml,
} from './lib/source-evidence.mjs';
import { loadEvidencePacket } from './lib/source-evidence-files.mjs';
import {
  parseScaffoldArgs,
  scaffoldEvidence,
} from './scaffold-source-evidence.mjs';

const SCAFFOLD_SCRIPT = fileURLToPath(
  new URL('./scaffold-source-evidence.mjs', import.meta.url)
);

const SAMPLE_HTML = [
  '<!DOCTYPE html>',
  '<html><head><title>Official Act</title></head><body>',
  '<h1>Carbon Capture Act 2026</h1>',
  '<p>Repeated clause text.</p>',
  '<p>Section 5(2) specifies a unique credit threshold of 50,000 tonnes per year.</p>',
  '<p>Repeated clause text.</p>',
  '</body></html>',
].join('\n');

const LARGE_UNIQUE_CLAUSE =
  'Article 42(b) establishes the permanent geological storage monitoring obligation for large snapshots.';

function makeLargeHtml(minBytes = MAX_SOURCE_BYTES + 8192) {
  const prefix = [
    '<!DOCTYPE html>',
    '<html><head><title>Large Official Statute</title></head><body>',
    '<h1>Large Official Statute 2026</h1>',
    '<p>Repeated clause text.</p>',
    `<p>${LARGE_UNIQUE_CLAUSE}</p>`,
    '<p>Repeated clause text.</p>',
  ].join('\n');
  const suffix = '\n</body></html>\n';
  const fillerLine =
    '<p>Recital filler text for external archive boundary testing.</p>\n';
  const needed = Math.max(0, minBytes - prefix.length - suffix.length);
  const repeats = Math.ceil(needed / fillerLine.length);
  return `${prefix}\n${fillerLine.repeat(repeats)}${suffix}`;
}

test('scaffold creates draft/not_reviewed packet from local HTML via --query and passes inspectEvidence', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-scaffold-'));
  try {
    const htmlPath = path.join(dir, 'sample.html');
    const outDir = path.join(dir, 'evidence');
    fs.writeFileSync(htmlPath, SAMPLE_HTML);

    const options = parseScaffoldArgs([
      '--policy-id',
      'us-45q-ira',
      '--document-id',
      'sample-act-2026',
      '--url',
      'https://official.example.org/act-2026',
      '--file',
      htmlPath,
      '--extractor',
      'official-html-v1',
      '--lang',
      'en',
      '--edition',
      '2026',
      '--current-through',
      '2026-11-01',
      '--anchor-id',
      'section-5-2',
      '--locator',
      'Section 5(2)',
      '--query',
      'Section 5(2) specifies a unique credit threshold of 50,000 tonnes per year.',
      '--out-dir',
      outDir,
    ]);

    const { directory, packet, inspection } = await scaffoldEvidence(options);
    assert.equal(directory, path.join(outDir, 'sample-act-2026'));

    const writtenPacket = JSON.parse(
      fs.readFileSync(path.join(directory, 'packet.json'), 'utf8')
    );
    const writtenRaw = fs.readFileSync(path.join(directory, 'source.html'));

    assert.equal(writtenPacket.raw_sha256, digest(writtenRaw));
    assert.equal(writtenPacket.raw_file, 'source.html');
    assert.equal(Object.hasOwn(writtenPacket, 'storage'), false);
    assert.equal(Object.hasOwn(writtenPacket, 'external_uri'), false);
    assert.equal(Object.hasOwn(writtenPacket, 'bytes'), false);
    assert.equal(
      writtenPacket.normalized_sha256,
      digest(normalizeOfficialHtml(writtenRaw, 'official-html-v1'))
    );
    assert.deepEqual(writtenPacket.review, {
      status: 'draft',
      reviewer: null,
      method: 'not_reviewed',
      reviewed_at: null,
    });
    assert.deepEqual(writtenPacket.anchors[0].review, {
      status: 'draft',
      reviewer: null,
      method: 'not_reviewed',
      reviewed_at: null,
    });
    assert.equal(inspection.requires_review, true);
    assert.equal(inspection.anchors[0].state, 'needs_review');
    assert.equal(inspection.anchors[0].usable_as_reviewed_reference, false);

    // Re-inspecting from disk succeeds cleanly
    const reinspected = inspectEvidence(writtenPacket, writtenRaw);
    assert.equal(reinspected.document_id, 'sample-act-2026');
    assert.equal(
      reinspected.anchors[0].exact_quote,
      packet.anchors[0].exact_quote
    );

    // Refuses overwrite unless --overwrite is explicitly passed
    await assert.rejects(scaffoldEvidence(options), {
      code: 'EVIDENCE_EXISTS',
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('scaffold supports --start/--end offsets and rejects missing or ambiguous quotes without writing', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-scaffold-slice-'));
  try {
    const htmlPath = path.join(dir, 'sample.html');
    const outDir = path.join(dir, 'evidence');
    fs.writeFileSync(htmlPath, SAMPLE_HTML);
    const normalized = normalizeOfficialHtml(
      Buffer.from(SAMPLE_HTML),
      'official-html-v1'
    );
    const needle = 'Carbon Capture Act 2026';
    const start = normalized.indexOf(needle);
    const end = start + needle.length;

    const sliceOptions = parseScaffoldArgs([
      '--policy-id',
      'us-45q-ira',
      '--document-id',
      'slice-act-2026',
      '--url',
      'https://official.example.org/slice',
      '--file',
      htmlPath,
      '--anchor-id',
      'title-heading',
      '--locator',
      'Heading',
      '--start',
      String(start),
      '--end',
      String(end),
      '--out-dir',
      outDir,
    ]);
    const { packet } = await scaffoldEvidence(sliceOptions);
    assert.equal(packet.anchors[0].exact_quote, needle);

    // Zero matches fails without creating output directory
    const missingOptions = parseScaffoldArgs([
      '--policy-id',
      'us-45q-ira',
      '--document-id',
      'missing-quote-doc',
      '--url',
      'https://official.example.org/missing',
      '--file',
      htmlPath,
      '--anchor-id',
      'a1',
      '--locator',
      'Section 1',
      '--query',
      'Nonexistent statutory clause',
      '--out-dir',
      outDir,
    ]);
    await assert.rejects(scaffoldEvidence(missingOptions), {
      code: 'ANCHOR_NOT_UNIQUE',
    });
    assert.equal(fs.existsSync(path.join(outDir, 'missing-quote-doc')), false);

    // Multiple matches (>1) fails without creating output directory
    const ambiguousOptions = parseScaffoldArgs([
      '--policy-id',
      'us-45q-ira',
      '--document-id',
      'ambiguous-quote-doc',
      '--url',
      'https://official.example.org/ambiguous',
      '--file',
      htmlPath,
      '--anchor-id',
      'a1',
      '--locator',
      'Section 1',
      '--query',
      'Repeated clause text.',
      '--out-dir',
      outDir,
    ]);
    await assert.rejects(scaffoldEvidence(ambiguousOptions), {
      code: 'ANCHOR_NOT_UNIQUE',
    });
    assert.equal(
      fs.existsSync(path.join(outDir, 'ambiguous-quote-doc')),
      false
    );

    // Ambiguous --start/--end slice also fails
    const ambStart = normalized.indexOf('Repeated clause text.');
    const ambSliceOptions = parseScaffoldArgs([
      '--policy-id',
      'us-45q-ira',
      '--document-id',
      'ambiguous-slice-doc',
      '--url',
      'https://official.example.org/ambiguous-slice',
      '--file',
      htmlPath,
      '--anchor-id',
      'a1',
      '--locator',
      'Section 1',
      '--start',
      String(ambStart),
      '--end',
      String(ambStart + 'Repeated clause text.'.length),
      '--out-dir',
      outDir,
    ]);
    await assert.rejects(scaffoldEvidence(ambSliceOptions), {
      code: 'ANCHOR_NOT_UNIQUE',
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('scaffold fetches over HTTP when --file is omitted and rejects HTTP errors or invalid CLI args', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-scaffold-http-'));
  try {
    const outDir = path.join(dir, 'evidence');
    const options = parseScaffoldArgs([
      '--policy-id',
      'ca-ccus-itc',
      '--document-id',
      'fetched-doc-2026',
      '--url',
      'https://official.example.org/fetched',
      '--anchor-id',
      'clause-1',
      '--locator',
      'Section 1',
      '--query',
      'Section 5(2) specifies a unique credit threshold of 50,000 tonnes per year.',
      '--out-dir',
      outDir,
    ]);
    const { packet } = await scaffoldEvidence(options, {
      fetchImpl: async () =>
        new Response(SAMPLE_HTML, {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
    });
    assert.equal(packet.review.status, 'draft');
    assert.equal(packet.review.method, 'not_reviewed');

    await assert.rejects(
      scaffoldEvidence(
        { ...options, documentId: 'failed-fetch-doc' },
        {
          fetchImpl: async () => new Response('Not found', { status: 404 }),
        }
      ),
      { code: 'FETCH_FAILED' }
    );

    for (const badArgs of [
      [],
      ['--policy-id', 'x', '--review', 'verified'],
      [
        '--policy-id',
        'p',
        '--document-id',
        '../bad',
        '--url',
        'https://example.org',
        '--anchor-id',
        'a',
        '--locator',
        'L',
        '--query',
        'Q',
      ],
      [
        '--policy-id',
        'p',
        '--document-id',
        'd',
        '--url',
        'https://example.org',
        '--anchor-id',
        'a',
        '--locator',
        'L',
        '--query',
        'Q',
        '--start',
        '0',
        '--end',
        '1',
      ],
      [
        '--policy-id',
        'p',
        '--document-id',
        'd',
        '--url',
        'https://example.org',
        '--anchor-id',
        'a',
        '--locator',
        'L',
        '--current-through',
        'not-a-date',
        '--query',
        'Q',
      ],
    ]) {
      assert.throws(() => parseScaffoldArgs(badArgs), {
        code: 'INVALID_ARGUMENT',
      });
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('scaffold supports >512 KiB local HTML into external_archive, enforces git_inline 512 KiB cap, and round-trips through loadEvidencePacket and inspectEvidence', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-scaffold-ext-'));
  try {
    const largeHtml = makeLargeHtml();
    const largeRaw = Buffer.from(largeHtml, 'utf8');
    assert.ok(largeRaw.length > MAX_SOURCE_BYTES);

    const htmlPath = path.join(dir, 'large.html');
    const outDir = path.join(dir, 'evidence');
    fs.writeFileSync(htmlPath, largeRaw);

    // Default git_inline rejects >512 KiB without creating output dir
    const inlineOptions = parseScaffoldArgs([
      '--policy-id',
      'eu-nzia',
      '--document-id',
      'large-inline-rejected',
      '--url',
      'https://eur-lex.europa.eu/eli/reg/2024/1735/oj',
      '--file',
      htmlPath,
      '--anchor-id',
      'art-42-b',
      '--locator',
      'Article 42(b)',
      '--query',
      LARGE_UNIQUE_CLAUSE,
      '--out-dir',
      outDir,
    ]);
    await assert.rejects(scaffoldEvidence(inlineOptions), {
      code: 'SOURCE_TOO_LARGE',
      message: 'The source snapshot exceeds 512 KiB.',
    });
    assert.equal(
      fs.existsSync(path.join(outDir, 'large-inline-rejected')),
      false
    );

    // external_archive succeeds for >512 KiB
    const extOptions = parseScaffoldArgs([
      '--policy-id',
      'eu-nzia',
      '--document-id',
      'large-ext-doc',
      '--url',
      'https://eur-lex.europa.eu/eli/reg/2024/1735/oj',
      '--file',
      htmlPath,
      '--storage',
      'external_archive',
      '--external-uri',
      'https://ARCHIVE.Example.org/snapshots/large-ext-doc.html',
      '--anchor-id',
      'art-42-b',
      '--locator',
      'Article 42(b)',
      '--query',
      LARGE_UNIQUE_CLAUSE,
      '--out-dir',
      outDir,
    ]);
    assert.equal(extOptions.storage, 'external_archive');
    assert.equal(
      extOptions.externalUri,
      'https://archive.example.org/snapshots/large-ext-doc.html'
    );

    const { directory, packet, inspection } =
      await scaffoldEvidence(extOptions);
    assert.equal(directory, path.join(outDir, 'large-ext-doc'));
    assert.equal(fs.existsSync(path.join(directory, 'packet.json')), true);
    assert.equal(fs.existsSync(path.join(directory, 'normalized.txt')), true);
    assert.equal(fs.existsSync(path.join(directory, 'source.html')), false);

    const writtenPacket = JSON.parse(
      fs.readFileSync(path.join(directory, 'packet.json'), 'utf8')
    );
    assert.equal(writtenPacket.storage, 'external_archive');
    assert.equal(
      writtenPacket.external_uri,
      'https://archive.example.org/snapshots/large-ext-doc.html'
    );
    assert.equal(writtenPacket.bytes, largeRaw.length);
    assert.equal(writtenPacket.raw_file, null);
    assert.equal(writtenPacket.raw_sha256, digest(largeRaw));
    assert.equal(writtenPacket.anchors[0].version_sha256, digest(largeRaw));
    assert.deepEqual(writtenPacket.review, {
      status: 'draft',
      reviewer: null,
      method: 'not_reviewed',
      reviewed_at: null,
    });
    assert.deepEqual(writtenPacket.anchors[0].review, {
      status: 'draft',
      reviewer: null,
      method: 'not_reviewed',
      reviewed_at: null,
    });
    assert.equal(inspection.storage, 'external_archive');
    assert.equal(inspection.bytes, largeRaw.length);
    assert.equal(
      inspection.external_uri,
      'https://archive.example.org/snapshots/large-ext-doc.html'
    );
    assert.equal(inspection.requires_review, true);
    assert.equal(inspection.anchors[0].state, 'needs_review');
    assert.equal(inspection.anchors[0].usable_as_reviewed_reference, false);

    // Disk round-trip via loadEvidencePacket + inspectEvidence
    const loaded = loadEvidencePacket(path.join(directory, 'packet.json'));
    assert.equal(loaded.raw, null);
    assert.equal(typeof loaded.normalizedText, 'string');
    const diskInspection = inspectEvidence(loaded.input, loaded.raw, {
      normalizedText: loaded.normalizedText,
    });
    assert.equal(diskInspection.storage, 'external_archive');
    assert.equal(diskInspection.bytes, largeRaw.length);
    assert.equal(
      diskInspection.normalized_text.slice(
        diskInspection.anchors[0].start_offset,
        diskInspection.anchors[0].end_offset
      ),
      LARGE_UNIQUE_CLAUSE
    );

    // Re-verifying >512 KiB external archive with raw bytes succeeds
    const rawInspection = inspectEvidence(packet, largeRaw);
    assert.equal(rawInspection.storage, 'external_archive');
    assert.equal(rawInspection.bytes, largeRaw.length);
    assert.equal(rawInspection.anchors[0].exact_quote, LARGE_UNIQUE_CLAUSE);

    // git_inline inspectEvidence still enforces 512 KiB cap
    const oversizedInlinePacket = {
      ...structuredClone(packet),
      raw_file: 'source.html',
    };
    delete oversizedInlinePacket.storage;
    delete oversizedInlinePacket.external_uri;
    delete oversizedInlinePacket.bytes;
    assert.throws(() => inspectEvidence(oversizedInlinePacket, largeRaw), {
      code: 'SOURCE_TOO_LARGE',
      message: 'The source snapshot exceeds 512 KiB.',
    });

    // Local file > MAX_EXTERNAL_SOURCE_BYTES rejected via statSync before readFileSync
    const hugePath = path.join(dir, 'huge.html');
    fs.writeFileSync(hugePath, '');
    fs.truncateSync(hugePath, MAX_EXTERNAL_SOURCE_BYTES + 1);
    await assert.rejects(
      scaffoldEvidence({
        ...extOptions,
        documentId: 'too-huge-ext-doc',
        file: hugePath,
      }),
      {
        code: 'SOURCE_TOO_LARGE',
        message: 'The source snapshot exceeds 16 MiB.',
      }
    );
    assert.equal(fs.existsSync(path.join(outDir, 'too-huge-ext-doc')), false);

    // CLI stdout summary includes storage, bytes, and external_uri when applicable
    const cliOut = JSON.parse(
      execFileSync(
        process.execPath,
        [
          SCAFFOLD_SCRIPT,
          '--policy-id',
          'eu-nzia',
          '--document-id',
          'cli-ext-summary',
          '--url',
          'https://eur-lex.europa.eu/eli/reg/2024/1735/oj',
          '--file',
          htmlPath,
          '--storage',
          'external_archive',
          '--external-uri',
          'https://archive.example.org/snapshots/cli-ext-summary.html',
          '--anchor-id',
          'art-42-b',
          '--locator',
          'Article 42(b)',
          '--query',
          LARGE_UNIQUE_CLAUSE,
          '--out-dir',
          outDir,
        ],
        { encoding: 'utf8' }
      )
    );
    assert.equal(cliOut.storage, 'external_archive');
    assert.equal(cliOut.bytes, largeRaw.length);
    assert.equal(
      cliOut.external_uri,
      'https://archive.example.org/snapshots/cli-ext-summary.html'
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('scaffold HTTP fetch >512 KiB succeeds for external_archive, fails for git_inline, and enforces MAX_EXTERNAL_SOURCE_BYTES', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-scaffold-ext-http-'));
  try {
    const outDir = path.join(dir, 'evidence');
    const largeHtml = makeLargeHtml();
    const largeRaw = Buffer.from(largeHtml, 'utf8');
    assert.ok(largeRaw.length > MAX_SOURCE_BYTES);

    const extOptions = parseScaffoldArgs([
      '--policy-id',
      'eu-nzia',
      '--document-id',
      'http-large-ext',
      '--url',
      'https://official.example.org/large-statute',
      '--storage',
      'external_archive',
      '--external-uri',
      'https://archive.example.org/http-large-ext.html',
      '--anchor-id',
      'art-42-b',
      '--locator',
      'Article 42(b)',
      '--query',
      LARGE_UNIQUE_CLAUSE,
      '--out-dir',
      outDir,
    ]);

    const { directory, packet } = await scaffoldEvidence(extOptions, {
      fetchImpl: async () =>
        new Response(largeRaw, {
          status: 200,
          headers: {
            'content-type': 'text/html',
            'content-length': String(largeRaw.length),
          },
        }),
    });
    assert.equal(packet.storage, 'external_archive');
    assert.equal(packet.bytes, largeRaw.length);
    assert.equal(fs.existsSync(path.join(directory, 'normalized.txt')), true);
    assert.equal(fs.existsSync(path.join(directory, 'source.html')), false);

    // Same >512 KiB HTTP response fails for git_inline (both via content-length and buffered body)
    const inlineOptions = parseScaffoldArgs([
      '--policy-id',
      'eu-nzia',
      '--document-id',
      'http-large-inline',
      '--url',
      'https://official.example.org/large-statute',
      '--anchor-id',
      'art-42-b',
      '--locator',
      'Article 42(b)',
      '--query',
      LARGE_UNIQUE_CLAUSE,
      '--out-dir',
      outDir,
    ]);
    await assert.rejects(
      scaffoldEvidence(inlineOptions, {
        fetchImpl: async () =>
          new Response(largeRaw, {
            status: 200,
            headers: {
              'content-type': 'text/html',
              'content-length': String(largeRaw.length),
            },
          }),
      }),
      {
        code: 'SOURCE_TOO_LARGE',
        message: 'The source snapshot exceeds 512 KiB.',
      }
    );
    await assert.rejects(
      scaffoldEvidence(inlineOptions, {
        fetchImpl: async () =>
          new Response(largeRaw, {
            status: 200,
            headers: { 'content-type': 'text/html' },
          }),
      }),
      {
        code: 'SOURCE_TOO_LARGE',
        message: 'The source snapshot exceeds 512 KiB.',
      }
    );
    assert.equal(fs.existsSync(path.join(outDir, 'http-large-inline')), false);

    // Rejects content-length > MAX_EXTERNAL_SOURCE_BYTES without reading body or creating dir
    let arrayBufferCalled = false;
    await assert.rejects(
      scaffoldEvidence(
        { ...extOptions, documentId: 'http-too-large-ext' },
        {
          fetchImpl: async () => ({
            ok: true,
            status: 200,
            headers: new Headers({
              'content-length': String(MAX_EXTERNAL_SOURCE_BYTES + 1),
            }),
            async arrayBuffer() {
              arrayBufferCalled = true;
              return new ArrayBuffer(0);
            },
          }),
        }
      ),
      {
        code: 'SOURCE_TOO_LARGE',
        message: 'The source snapshot exceeds 16 MiB.',
      }
    );
    assert.equal(arrayBufferCalled, false);
    assert.equal(fs.existsSync(path.join(outDir, 'http-too-large-ext')), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('scaffold --overwrite cleanly removes stale sibling files when switching git_inline and external_archive', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-scaffold-switch-'));
  try {
    const htmlPath = path.join(dir, 'sample.html');
    const outDir = path.join(dir, 'evidence');
    fs.writeFileSync(htmlPath, SAMPLE_HTML);

    const baseArgs = [
      '--policy-id',
      'us-45q-ira',
      '--document-id',
      'switch-storage-doc',
      '--url',
      'https://official.example.org/switch',
      '--file',
      htmlPath,
      '--anchor-id',
      'section-5-2',
      '--locator',
      'Section 5(2)',
      '--query',
      'Section 5(2) specifies a unique credit threshold of 50,000 tonnes per year.',
      '--out-dir',
      outDir,
    ];

    // 1. Create as git_inline
    const { directory } = await scaffoldEvidence(parseScaffoldArgs(baseArgs));
    assert.equal(fs.existsSync(path.join(directory, 'source.html')), true);
    assert.equal(fs.existsSync(path.join(directory, 'normalized.txt')), false);

    // 2. Overwrite into external_archive -> removes stale source.html
    await scaffoldEvidence(
      parseScaffoldArgs([
        ...baseArgs,
        '--overwrite',
        '--storage',
        'external_archive',
        '--external-uri',
        'https://archive.example.org/switch-storage-doc.html',
      ])
    );
    assert.equal(fs.existsSync(path.join(directory, 'source.html')), false);
    assert.equal(fs.existsSync(path.join(directory, 'normalized.txt')), true);
    const loadedExt = loadEvidencePacket(path.join(directory, 'packet.json'));
    assert.equal(loadedExt.raw, null);
    assert.equal(
      inspectEvidence(loadedExt.input, loadedExt.raw, {
        normalizedText: loadedExt.normalizedText,
      }).storage,
      'external_archive'
    );

    // 3. Overwrite back into git_inline -> removes stale normalized.txt
    await scaffoldEvidence(parseScaffoldArgs([...baseArgs, '--overwrite']));
    assert.equal(fs.existsSync(path.join(directory, 'source.html')), true);
    assert.equal(fs.existsSync(path.join(directory, 'normalized.txt')), false);
    const loadedInline = loadEvidencePacket(
      path.join(directory, 'packet.json')
    );
    assert.ok(Buffer.isBuffer(loadedInline.raw));
    assert.equal(
      inspectEvidence(loadedInline.input, loadedInline.raw).storage,
      'git_inline'
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('scaffold external_archive rejects missing or ambiguous quotes without writing files', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-scaffold-ext-q-'));
  try {
    const htmlPath = path.join(dir, 'sample.html');
    const outDir = path.join(dir, 'evidence');
    fs.writeFileSync(htmlPath, SAMPLE_HTML);

    const missingOptions = parseScaffoldArgs([
      '--policy-id',
      'us-45q-ira',
      '--document-id',
      'ext-missing-quote',
      '--url',
      'https://official.example.org/missing',
      '--file',
      htmlPath,
      '--storage',
      'external_archive',
      '--external-uri',
      'https://archive.example.org/missing.html',
      '--anchor-id',
      'a1',
      '--locator',
      'Section 1',
      '--query',
      'Nonexistent external archive clause',
      '--out-dir',
      outDir,
    ]);
    await assert.rejects(scaffoldEvidence(missingOptions), {
      code: 'ANCHOR_NOT_UNIQUE',
    });
    assert.equal(fs.existsSync(path.join(outDir, 'ext-missing-quote')), false);

    const ambiguousOptions = parseScaffoldArgs([
      '--policy-id',
      'us-45q-ira',
      '--document-id',
      'ext-ambiguous-quote',
      '--url',
      'https://official.example.org/ambiguous',
      '--file',
      htmlPath,
      '--storage',
      'external_archive',
      '--external-uri',
      'https://archive.example.org/ambiguous.html',
      '--anchor-id',
      'a1',
      '--locator',
      'Section 1',
      '--query',
      'Repeated clause text.',
      '--out-dir',
      outDir,
    ]);
    await assert.rejects(scaffoldEvidence(ambiguousOptions), {
      code: 'ANCHOR_NOT_UNIQUE',
    });
    assert.equal(
      fs.existsSync(path.join(outDir, 'ext-ambiguous-quote')),
      false
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI and programmatic validation reject invalid --storage and --external-uri combinations', async () => {
  const baseArgs = [
    '--policy-id',
    'us-45q-ira',
    '--document-id',
    'storage-validation-doc',
    '--url',
    'https://official.example.org/law',
    '--anchor-id',
    'a1',
    '--locator',
    'Section 1',
    '--query',
    'Section 5(2)',
  ];

  for (const extraArgs of [
    ['--storage', 'external_archive'],
    ['--storage', 'external_archive', '--external-uri', ''],
    ['--storage', 'external_archive', '--external-uri', '   '],
    [
      '--storage',
      'external_archive',
      '--external-uri',
      'http://archive.example.org/insecure.html',
    ],
    [
      '--storage',
      'external_archive',
      '--external-uri',
      'file:///tmp/local.html',
    ],
    ['--storage', 'external_archive', '--external-uri', 'not-a-valid-url'],
    ['--storage', 's3_bucket'],
    ['--external-uri', 'https://archive.example.org/orphan.html'],
    [
      '--storage',
      'git_inline',
      '--external-uri',
      'https://archive.example.org/orphan.html',
    ],
    ['--storage', 'git_inline', '--storage', 'external_archive'],
    [
      '--storage',
      'external_archive',
      '--external-uri',
      'https://archive.example.org/a.html',
      '--external-uri',
      'https://archive.example.org/b.html',
    ],
  ]) {
    assert.throws(() => parseScaffoldArgs([...baseArgs, ...extraArgs]), {
      code: 'INVALID_ARGUMENT',
    });
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-scaffold-prog-'));
  try {
    const htmlPath = path.join(dir, 'sample.html');
    const outDir = path.join(dir, 'evidence');
    fs.writeFileSync(htmlPath, SAMPLE_HTML);

    const baseProgrammatic = {
      policyId: 'us-45q-ira',
      documentId: 'prog-validation-doc',
      url: 'https://official.example.org/law',
      file: htmlPath,
      extractor: 'official-html-v1',
      lang: 'en',
      edition: null,
      currentThrough: null,
      publishedAt: null,
      anchorId: 'a1',
      locator: 'Section 1',
      query:
        'Section 5(2) specifies a unique credit threshold of 50,000 tonnes per year.',
      outDir,
      overwrite: false,
    };

    for (const override of [
      { storage: 'external_archive' },
      { storage: 'external_archive', externalUri: null },
      { storage: 'external_archive', externalUri: '   ' },
      {
        storage: 'external_archive',
        externalUri: 'http://archive.example.org/insecure.html',
      },
      {
        storage: 'external_archive',
        externalUri: 'file:///tmp/local.html',
      },
      { storage: 'external_archive', externalUri: 'not-a-url' },
      { storage: 'unsupported_mode' },
      {
        storage: 'git_inline',
        externalUri: 'https://archive.example.org/orphan.html',
      },
      { externalUri: 'https://archive.example.org/orphan.html' },
    ]) {
      await assert.rejects(
        scaffoldEvidence({ ...baseProgrammatic, ...override }),
        { code: 'INVALID_ARGUMENT' }
      );
    }
    assert.equal(
      fs.existsSync(path.join(outDir, 'prog-validation-doc')),
      false
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('normalizeOfficialHtml supports optional maxBytes and fails closed on invalid maxBytes', () => {
  const largeHtml = Buffer.from(makeLargeHtml(), 'utf8');
  assert.ok(largeHtml.length > MAX_SOURCE_BYTES);

  // Default cap remains 512 KiB with exact legacy message
  assert.throws(() => normalizeOfficialHtml(largeHtml, 'official-html-v1'), {
    code: 'SOURCE_TOO_LARGE',
    message: 'The source snapshot exceeds 512 KiB.',
  });

  // Explicit larger maxBytes succeeds for official-html-v1
  const normalizedLarge = normalizeOfficialHtml(largeHtml, 'official-html-v1', {
    maxBytes: MAX_EXTERNAL_SOURCE_BYTES,
  });
  assert.ok(normalizedLarge.includes(LARGE_UNIQUE_CLAUSE));

  // Explicit larger maxBytes also threads through govinfo-usc-html-v1
  const largeGovinfo = Buffer.from(
    [
      '<!-- documentid:26_45Q currentthrough:20250106 -->',
      '<html><body><h3 class="section-head">Section 45Q</h3>',
      `<p>${'A'.repeat(MAX_SOURCE_BYTES + 1024)}</p>`,
      '</body></html>',
    ].join('\n'),
    'utf8'
  );
  assert.throws(() => normalizeOfficialHtml(largeGovinfo), {
    code: 'SOURCE_TOO_LARGE',
    message: 'The source snapshot exceeds 512 KiB.',
  });
  const normalizedGovinfo = normalizeOfficialHtml(
    largeGovinfo,
    'govinfo-usc-html-v1',
    { maxBytes: MAX_EXTERNAL_SOURCE_BYTES }
  );
  assert.ok(normalizedGovinfo.includes('Section 45Q'));

  // Custom byte / MiB limits format cleanly
  const sampleBuf = Buffer.from(SAMPLE_HTML, 'utf8');
  assert.throws(
    () =>
      normalizeOfficialHtml(sampleBuf, 'official-html-v1', { maxBytes: 50 }),
    {
      code: 'SOURCE_TOO_LARGE',
      message: 'The source snapshot exceeds 50 bytes.',
    }
  );
  assert.throws(
    () =>
      normalizeOfficialHtml(Buffer.alloc(1024 * 1024 + 1), 'official-html-v1', {
        maxBytes: 1024 * 1024,
      }),
    {
      code: 'SOURCE_TOO_LARGE',
      message: 'The source snapshot exceeds 1 MiB.',
    }
  );

  // Non-positive or non-integer maxBytes fail closed with INVALID_ARGUMENT
  for (const badMaxBytes of [0, -1, Infinity, -Infinity, NaN, 1.5]) {
    assert.throws(
      () =>
        normalizeOfficialHtml(sampleBuf, 'official-html-v1', {
          maxBytes: badMaxBytes,
        }),
      {
        code: 'INVALID_ARGUMENT',
        message: 'maxBytes must be a positive integer.',
      }
    );
    assert.throws(
      () =>
        normalizeOfficialHtml(largeGovinfo, 'govinfo-usc-html-v1', {
          maxBytes: badMaxBytes,
        }),
      {
        code: 'INVALID_ARGUMENT',
        message: 'maxBytes must be a positive integer.',
      }
    );
  }
});

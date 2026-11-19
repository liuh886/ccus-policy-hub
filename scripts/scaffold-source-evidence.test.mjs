import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  digest,
  inspectEvidence,
  normalizeOfficialHtml,
} from './lib/source-evidence.mjs';
import {
  parseScaffoldArgs,
  scaffoldEvidence,
} from './scaffold-source-evidence.mjs';

const SAMPLE_HTML = [
  '<!DOCTYPE html>',
  '<html><head><title>Official Act</title></head><body>',
  '<h1>Carbon Capture Act 2026</h1>',
  '<p>Repeated clause text.</p>',
  '<p>Section 5(2) specifies a unique credit threshold of 50,000 tonnes per year.</p>',
  '<p>Repeated clause text.</p>',
  '</body></html>',
].join('\n');

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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hash } from './consume-agent-data.mjs';
import {
  DEFAULT_TARGETS_PATH,
  loadPdfTargets,
  parseCaptureArgs,
  resolvePdfInputs,
  captureCatalogPdfs,
} from './capture-catalog-pdfs.mjs';

test('default pdf-targets.json manifest loads and validates both real PDF targets', () => {
  const targets = loadPdfTargets(DEFAULT_TARGETS_PATH);
  assert.equal(targets.length, 2);
  assert.deepEqual(
    targets.map((t) => t.document_id),
    ['uk-energy-act-2023-enacted', 'gccsi-ccus-progress-china-en']
  );
});

test('pdf targets manifest validation rejects duplicate IDs, bad hashes, non-HTTPS URLs, and invalid regex', () => {
  const validTargets = loadPdfTargets(DEFAULT_TARGETS_PATH);
  const baseTarget = structuredClone(validTargets[0]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-pdf-targets-'));
  try {
    const targetFile = path.join(dir, 'targets.json');
    for (const mutate of [
      (t) => [t, structuredClone(t)],
      (t) => [{ ...t, sha256: 'not-a-sha' }],
      (t) => [{ ...t, source_url: 'http://example.org/doc.pdf' }],
      (t) => [{ ...t, printed_pattern: '[unclosed' }],
      (t) => [{ ...t, page: 0 }],
    ]) {
      fs.writeFileSync(
        targetFile,
        JSON.stringify({
          schema_version: '1.0.0',
          targets: mutate(structuredClone(baseTarget)),
        })
      );
      assert.throws(() => loadPdfTargets(targetFile), /Invalid PDF targets/);
    }
    fs.writeFileSync(targetFile, '{not-json');
    assert.throws(() => loadPdfTargets(targetFile), /Unable to read PDF/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('capture CLI parses manifest flags and rejects invalid combinations', () => {
  const parsed = parseCaptureArgs([
    '--targets',
    'scripts/data/discovery/pdf-targets.json',
    '--input-dir',
    'tmp/pdfs',
    '--pdf',
    'uk-energy-act-2023-enacted=tmp/uk.pdf',
    '--output',
    'tmp/out.json',
  ]);
  assert.equal(
    parsed.pdfOverrides.get('uk-energy-act-2023-enacted'),
    path.resolve('tmp/uk.pdf')
  );
  assert.equal(parsed.outputPath, path.resolve('tmp/out.json'));
  assert.equal(parsed.inputDir, path.resolve('tmp/pdfs'));

  for (const badArgs of [
    [],
    ['--output', 'out.json'],
    ['--input-dir', 'pdfs', '--output', 'out.txt'],
    ['--pdf', 'missing-equals'],
    ['--pdf', '=path.pdf'],
    ['--pdf', 'a=1.pdf', '--pdf', 'a=2.pdf'],
    ['--input-dir', 'pdfs', '--unknown'],
  ]) {
    assert.throws(() => parseCaptureArgs(badArgs));
  }
});

test('resolvePdfInputs resolves by document_id, URL basename, and explicit override while failing closed on missing files', () => {
  const targets = loadPdfTargets(DEFAULT_TARGETS_PATH);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-pdf-resolve-'));
  try {
    const ukPath = path.join(dir, 'uk-energy-act-2023-enacted.pdf');
    const gccsiPath = path.join(dir, 'CCUS-Progress-in-China.pdf');
    fs.writeFileSync(ukPath, '%PDF-1.4\n');
    fs.writeFileSync(gccsiPath, '%PDF-1.4\n');

    const resolved = resolvePdfInputs(targets, { inputDir: dir });
    assert.equal(resolved.get('uk-energy-act-2023-enacted'), ukPath);
    assert.equal(resolved.get('gccsi-ccus-progress-china-en'), gccsiPath);

    const overridePath = path.join(dir, 'override.pdf');
    fs.writeFileSync(overridePath, '%PDF-1.4\n');
    const overridden = resolvePdfInputs(targets, {
      inputDir: dir,
      pdfOverrides: new Map([['uk-energy-act-2023-enacted', overridePath]]),
    });
    assert.equal(overridden.get('uk-energy-act-2023-enacted'), overridePath);

    assert.throws(
      () =>
        resolvePdfInputs(targets, {
          inputDir: dir,
          pdfOverrides: new Map([['unknown-doc', overridePath]]),
        }),
      /Unknown PDF target/
    );
    fs.unlinkSync(gccsiPath);
    assert.throws(
      () => resolvePdfInputs(targets, { inputDir: dir }),
      /Missing PDF for gccsi-ccus-progress-china-en/
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('captureCatalogPdfs verifies hashes, page counts, unique quotes, and writes draft metadata', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-pdf-capture-'));
  try {
    const pdfBytes = Buffer.from('%PDF-1.4\nsynthetic-fixture');
    const pdfPath = path.join(dir, 'fixture-doc.pdf');
    fs.writeFileSync(pdfPath, pdfBytes);
    const targetsPath = path.join(dir, 'targets.json');
    const outputPath = path.join(dir, 'captured.json');
    fs.writeFileSync(
      targetsPath,
      JSON.stringify({
        schema_version: '1.0.0',
        targets: [
          {
            document_id: 'fixture-doc',
            sha256: hash(pdfBytes),
            title: { en: 'Fixture PDF', zh: '测试 PDF' },
            publisher: 'example.org',
            source_kind: 'legislation',
            language: 'en',
            edition: '2026',
            source_url: 'https://example.org/fixture-doc.pdf',
            policy_ids: ['us-45q-ira'],
            coverage: 'original_enactment',
            page: 2,
            printed_page: '1',
            locator: 'Section 1',
            quote: 'Unique Section Heading',
            printed_pattern: '^\\s*1\\s+Fixture',
          },
        ],
      })
    );
    const mockRun = (command, args) => {
      if (command === 'pdftotext' && args[0] === '-v')
        return { stdout: '', stderr: 'pdftotext version 24.04.0\n' };
      if (command === 'pdfinfo')
        return { stdout: 'Pages:          5\n', stderr: '' };
      if (command === 'pdftotext' && args.includes('-f'))
        return {
          stdout: '  1  Fixture\n\nUnique Section Heading\nBody text.\n',
          stderr: '',
        };
      if (command === 'pdftotext')
        return { stdout: 'Full text of fixture.', stderr: '' };
      throw new Error(`Unexpected command: ${command}`);
    };
    const { records } = captureCatalogPdfs({
      targetsPath,
      inputDir: dir,
      outputPath,
      runCommand: mockRun,
    });
    assert.equal(records.length, 1);
    assert.equal(records[0].locator.review_status, 'draft');
    assert.equal(records[0].capture.version, '24.04.0');
    const written = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    assert.equal(written.capture_type, 'explicit_private_pdf_metadata_only');
    assert.equal(written.records.length, 1);

    // Negative case: tampered PDF fails hash check
    fs.writeFileSync(pdfPath, Buffer.from('%PDF-1.4\ntampered'));
    assert.throws(
      () =>
        captureCatalogPdfs({
          targetsPath,
          inputDir: dir,
          outputPath,
          runCommand: mockRun,
        }),
      /hash mismatch/
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

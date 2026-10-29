#!/usr/bin/env node
// Independent consumer: standard JSON Schema validation + public bytes only.
// No imports from the site's generators, database, Astro or evidence parser.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const check = (ok, message) => {
  if (!ok) throw new Error(message);
};

export async function consumeAgentData(manifestUrl, readBytes) {
  const read = async (url) => {
    const bytes = await readBytes(String(url));
    check(
      bytes.length <= 1024 * 1024,
      'Resource exceeds the 1 MiB consumer budget.'
    );
    return bytes;
  };
  const json = async (url) => JSON.parse((await read(url)).toString('utf8'));
  const manifest = await json(manifestUrl);
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = async (schemaUrl, value) => {
    const validator = ajv.compile(await json(schemaUrl));
    check(
      validator(value),
      `Public schema rejected resource: ${ajv.errorsText(validator.errors)}`
    );
  };
  await validate(manifest.schemas.manifest, manifest);
  const contextIndexUrl = new URL(manifest.datasets.context.file, manifestUrl);
  const contextIndex = await json(contextIndexUrl);
  check(
    contextIndex.count === contextIndex.records.length,
    'Context count mismatch.'
  );
  const policyIds = new Set();
  let references = 0;
  for (const entry of contextIndex.records) {
    const bytes = await read(new URL(entry.json, contextIndexUrl));
    const md = await read(new URL(entry.markdown, contextIndexUrl));
    check(
      hash(bytes) === entry.sha256_json && hash(md) === entry.sha256_markdown,
      'Context hash mismatch.'
    );
    const bundle = JSON.parse(bytes);
    await validate(manifest.schemas.context, bundle);
    check(
      bundle.id === entry.id && bundle.lang === entry.lang,
      'Context identity mismatch.'
    );
    const ids = new Set(bundle.sources.map((source) => source.id));
    for (const record of bundle.identity.records)
      policyIds.add(record.policy_id);
    for (const record of bundle.legal_context.records) {
      for (const ref of [
        ...record.source_refs,
        ...record.analysis.flatMap((a) => a.source_refs),
      ]) {
        check(ids.has(ref), `Unresolved source reference: ${ref}`);
        references++;
      }
    }
    for (const source of bundle.sources)
      check(
        md.toString().includes(`[${source.id}]: <${source.url}>`),
        'Markdown source definition missing.'
      );
  }
  const indexUrl = new URL(manifest.datasets.source_evidence.file, manifestUrl);
  const index = await json(indexUrl);
  check(index.count === index.records.length, 'Evidence count mismatch.');
  let reviewedAnchors = 0;
  for (const entry of index.records) {
    const bytes = await read(new URL(entry.file, indexUrl));
    check(hash(bytes) === entry.sha256, 'Evidence record hash mismatch.');
    const record = JSON.parse(bytes);
    await validate(manifest.schemas.source_evidence, record);
    check(
      record.document_id === entry.document_id &&
        record.policy_id === entry.policy_id,
      'Evidence identity mismatch.'
    );
    check(
      policyIds.has(record.policy_id),
      'Evidence policy is absent from context records.'
    );
    const raw = await read(new URL(record.raw_file, indexUrl));
    const text = await read(new URL(record.normalized_file, indexUrl));
    check(
      hash(raw) === record.raw_sha256 &&
        hash(text) === record.normalized_sha256,
      'Evidence source hash mismatch.'
    );
    for (const anchor of record.anchors) {
      check(
        anchor.version_sha256 === record.raw_sha256,
        'Anchor version mismatch.'
      );
      check(
        text.toString('utf8').slice(anchor.start_offset, anchor.end_offset) ===
          anchor.exact_quote,
        'Anchor quote mismatch.'
      );
      check(anchor.end_offset > anchor.start_offset, 'Invalid anchor range.');
      if (anchor.usable_as_reviewed_reference) reviewedAnchors++;
    }
  }
  return {
    context_bundles: contextIndex.count,
    source_documents: index.count,
    resolved_references: references,
    reviewed_anchors: reviewedAnchors,
    human_review_pending: reviewedAnchors === 0,
    source_currentness_verified: false,
  };
}

async function main() {
  const args = process.argv.slice(2);
  check(
    args.length === 2 && args[0] === '--root',
    'Usage: --root <public-or-dist-directory>'
  );
  const root = fs.realpathSync(args[1]);
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'data/manifest.json'), 'utf8')
  );
  const base = new URL(manifest.base_url.replace(/\/$/, '') + '/');
  const reader = (url) => {
    const parsed = new URL(url);
    check(
      parsed.origin === base.origin &&
        parsed.pathname.startsWith(base.pathname),
      'Resource is outside the publication base.'
    );
    const relative = decodeURIComponent(
      parsed.pathname.slice(base.pathname.length)
    );
    const target = fs.realpathSync(path.resolve(root, relative));
    check(
      target.startsWith(root + path.sep),
      'Resource escapes the publication directory.'
    );
    return fs.readFileSync(target);
  };
  console.log(
    JSON.stringify(
      await consumeAgentData(new URL('data/manifest.json', base), reader),
      null,
      2
    )
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    process.stderr.write(
      JSON.stringify({
        error: { code: 'DATA_CONSUMPTION_FAILED', message: error.message },
      }) + '\n'
    );
    process.exitCode = 1;
  });

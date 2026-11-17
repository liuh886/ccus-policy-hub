#!/usr/bin/env node
// Standalone consumer: standard validators and public bytes, no site runtime.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export const hash = (bytes) =>
  crypto.createHash('sha256').update(bytes).digest('hex');
export class ConsumptionError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
export function check(ok, message, code = 'CONTRACT_VIOLATION') {
  if (!ok) throw new ConsumptionError(code, message);
}
export function publicClient(readBytes) {
  const cache = new Map(),
    validators = new Map();
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const read = async (value) => {
    const url = String(value);
    if (!cache.has(url))
      cache.set(
        url,
        Promise.resolve(readBytes(url)).then((bytes) => {
          check(
            bytes.length <= 1024 * 1024,
            'Resource exceeds the 1 MiB consumer budget.'
          );
          return Buffer.from(bytes);
        })
      );
    return cache.get(url);
  };
  const json = async (url) => JSON.parse((await read(url)).toString('utf8'));
  const validate = async (url, value) => {
    if (!validators.has(String(url)))
      validators.set(String(url), ajv.compile(await json(url)));
    const validator = validators.get(String(url));
    check(
      validator(value),
      `Public schema rejected resource: ${ajv.errorsText(validator.errors)}`
    );
  };
  return { read, json, validate };
}
export async function consumeContextData(
  manifestUrl,
  { read, json, validate }
) {
  const manifest = await json(manifestUrl);
  check(
    manifest.datasets?.context &&
      manifest.schemas?.context &&
      manifest.schemas?.manifest,
    'Context dataset is not advertised by this publication.',
    'DATASET_NOT_AVAILABLE'
  );
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
  check(
    manifest.datasets.context.count === contextIndex.count,
    'Manifest context count mismatch.'
  );
  return {
    context_bundles: contextIndex.count,
    resolved_references: references,
    policy_ids: [...policyIds].sort(),
  };
}
export async function consumeAgentData(manifestUrl, readBytes) {
  return consumeContextData(manifestUrl, publicClient(readBytes));
}

export function parseConsumerArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const key = {
      '--root': 'root',
      '--manifest-url': 'manifestUrl',
      '--expect-commit': 'expectedCommit',
    }[args[i]];
    check(
      key && args[i + 1] && !args[i + 1].startsWith('--'),
      'Usage: --root <directory> | --manifest-url <URL> [--expect-commit <40-character SHA>]',
      'INVALID_ARGUMENT'
    );
    check(
      options[key] === undefined,
      'Duplicate consumer option.',
      'INVALID_ARGUMENT'
    );
    options[key] = args[++i];
  }
  check(
    Boolean(options.root) !== Boolean(options.manifestUrl),
    'Select exactly one transport.',
    'INVALID_ARGUMENT'
  );
  if (options.expectedCommit)
    check(
      /^[a-f0-9]{40}$/.test(options.expectedCommit),
      'Expected commit must be a full Git SHA.',
      'INVALID_ARGUMENT'
    );
  return options;
}

export function httpReader(
  manifestUrl,
  { timeoutMs = 15000, maxBytes = 1024 * 1024 } = {}
) {
  const manifest = new URL(manifestUrl);
  check(
    ['https:', 'http:'].includes(manifest.protocol) &&
      !manifest.username &&
      !manifest.password,
    'Use an HTTP(S) manifest URL without credentials.',
    'INVALID_ARGUMENT'
  );
  const base = new URL('../', manifest);
  return async (value) => {
    const url = new URL(value);
    check(
      url.origin === base.origin &&
        url.pathname.startsWith(base.pathname) &&
        !url.username &&
        !url.password,
      'Resource is outside the publication base.',
      'PUBLICATION_BOUNDARY'
    );
    const response = await fetch(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
    check(
      response.ok,
      `HTTP ${response.status}: ${url.pathname}`,
      'HTTP_STATUS'
    );
    const type = response.headers.get('content-type') || '';
    if (url.pathname.endsWith('.json'))
      check(
        /^application\/json(?:;|$)/i.test(type),
        'Expected JSON content type.',
        'CONTENT_TYPE'
      );
    if (url.pathname.endsWith('.txt'))
      check(
        /^text\/plain(?:;|$)/i.test(type),
        'Archived text must be served as text/plain.',
        'CONTENT_TYPE'
      );
    check(
      Number(response.headers.get('content-length') || 0) <= maxBytes,
      'HTTP resource exceeds the byte budget.',
      'RESOURCE_TOO_LARGE'
    );
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > maxBytes)
        throw new ConsumptionError(
          'RESOURCE_TOO_LARGE',
          'HTTP resource exceeds the byte budget.'
        );
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  };
}

export async function verifyRelease(manifestUrl, read, expectedCommit) {
  const bytes = await read(String(manifestUrl));
  const manifest = JSON.parse(bytes);
  check(
    manifest.publication?.file,
    'No publication metadata pointer.',
    'RELEASE_UNAVAILABLE'
  );
  const release = JSON.parse(
    await read(new URL(manifest.publication.file, manifestUrl).href)
  );
  check(
    release.commit === expectedCommit,
    'Published commit differs from expected release.',
    'RELEASE_MISMATCH'
  );
  check(
    release.manifest_sha256 === hash(bytes),
    'Published manifest differs from the release fingerprint.',
    'RELEASE_MISMATCH'
  );
  const releaseUrl = new URL(manifest.publication.file, manifestUrl);
  const resources = new Map(
    Object.entries(release.resources || {}).map(([relative, digest]) => [
      new URL(relative, releaseUrl).href,
      digest,
    ])
  );
  const required = [
    manifest.datasets.context.file,
    manifest.schemas.context,
    manifest.schemas.manifest,
  ];
  if (manifest.datasets.source_evidence)
    required.push(
      manifest.datasets.source_evidence.file,
      manifest.schemas.source_evidence
    );
  if (manifest.datasets.discovery_catalog)
    required.push(
      manifest.datasets.discovery_catalog.file,
      manifest.schemas.discovery_catalog
    );
  for (const value of required) {
    const url = new URL(value, manifestUrl).href;
    check(
      resources.has(url) && resources.get(url) === hash(await read(url)),
      'Published index or schema differs from release fingerprint.',
      'RELEASE_MISMATCH'
    );
  }
  return { verified: true, commit: release.commit };
}

export async function runConsumerCli(
  consume = consumeAgentData,
  args = process.argv.slice(2)
) {
  const options = parseConsumerArgs(args);
  let manifestUrl, reader;
  if (options.root) {
    const root = fs.realpathSync(options.root);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, 'data/manifest.json'), 'utf8')
    );
    const base = new URL(manifest.base_url.replace(/\/$/, '') + '/');
    manifestUrl = new URL('data/manifest.json', base);
    reader = (value) => {
      const parsed = new URL(value);
      check(
        parsed.origin === base.origin &&
          parsed.pathname.startsWith(base.pathname),
        'Resource is outside the publication base.'
      );
      const target = fs.realpathSync(
        path.resolve(
          root,
          decodeURIComponent(parsed.pathname.slice(base.pathname.length))
        )
      );
      check(
        target.startsWith(root + path.sep),
        'Resource escapes the publication directory.'
      );
      return fs.readFileSync(target);
    };
  } else {
    manifestUrl = new URL(options.manifestUrl);
    reader = httpReader(manifestUrl);
  }
  reader = publicClient(reader).read;
  const release = options.expectedCommit
    ? await verifyRelease(manifestUrl, reader, options.expectedCommit)
    : { verified: false, reason: 'not_requested' };
  const result = await consume(manifestUrl, reader);
  console.log(
    JSON.stringify(
      { ...result, transport: options.root ? 'filesystem' : 'http', release },
      null,
      2
    )
  );
}
export function consumerFailure(error) {
  process.stderr.write(
    JSON.stringify({
      error: {
        code: error.code || 'DATA_CONSUMPTION_FAILED',
        message: error.message,
      },
    }) + '\n'
  );
  process.exitCode = 1;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  runConsumerCli().catch(consumerFailure);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function releaseMetadata(commit, manifestBytes, resources = {}) {
  if (!/^[a-f0-9]{40}$/.test(commit))
    throw new Error('A full Git commit SHA is required.');
  return {
    schema_version: '1.0.0',
    commit,
    manifest_sha256: crypto
      .createHash('sha256')
      .update(manifestBytes)
      .digest('hex'),
    resources,
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
  const manifest = fs.readFileSync(path.join(ROOT, 'dist/data/manifest.json'));
  const parsed = JSON.parse(manifest);
  const urls = [
    parsed.datasets.context.file,
    parsed.schemas.context,
    parsed.schemas.manifest,
  ];
  if (parsed.datasets.source_evidence)
    urls.push(
      parsed.datasets.source_evidence.file,
      parsed.schemas.source_evidence
    );
  if (parsed.datasets.discovery_catalog)
    urls.push(
      parsed.datasets.discovery_catalog.file,
      parsed.schemas.discovery_catalog
    );
  const prefix = new URL('data/', parsed.base_url.replace(/\/$/, '') + '/');
  const resources = {};
  for (const value of urls) {
    const url = new URL(value);
    if (
      url.origin !== prefix.origin ||
      !url.pathname.startsWith(prefix.pathname)
    )
      throw new Error('Release resource outside data publication.');
    const relative = url.pathname.slice(prefix.pathname.length);
    resources[relative] = crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(ROOT, 'dist/data', relative)))
      .digest('hex');
  }
  fs.writeFileSync(
    path.join(ROOT, 'dist/data/release.json'),
    JSON.stringify(releaseMetadata(commit, manifest, resources), null, 2) + '\n'
  );
}

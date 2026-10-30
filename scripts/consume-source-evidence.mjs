#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  publicClient,
  consumeContextData,
  check,
  hash,
  runConsumerCli,
  consumerFailure,
} from './consume-agent-data.mjs';

// Shared validation for a single selected source: catalog readers need not load
// every context bundle or every other source before resolving one reference.
export async function consumeEvidenceRecord(
  indexUrl,
  entry,
  client,
  { policyIds, schemaUrl }
) {
  const { read, validate } = client;
  const bytes = await read(new URL(entry.file, indexUrl));
  check(hash(bytes) === entry.sha256, 'Evidence record hash mismatch.');
  const record = JSON.parse(bytes);
  await validate(schemaUrl, record);
  check(
    record.document_id === entry.document_id &&
      record.policy_id === entry.policy_id,
    'Evidence identity mismatch.'
  );
  check(
    policyIds.has(record.policy_id),
    'Evidence policy is absent from policy records.'
  );
  const raw = await read(new URL(record.raw_file, indexUrl));
  const text = await read(new URL(record.normalized_file, indexUrl));
  check(
    hash(raw) === record.raw_sha256 && hash(text) === record.normalized_sha256,
    'Evidence source hash mismatch.'
  );
  let reviewedAnchors = 0;
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
  return { record, reviewedAnchors };
}

export async function consumeSourceEvidence(manifestUrl, readBytes) {
  const client = publicClient(readBytes);
  const base = await consumeContextData(manifestUrl, client);
  const { json } = client;
  const manifest = await json(manifestUrl);
  check(
    manifest.datasets?.source_evidence && manifest.schemas?.source_evidence,
    'Source evidence is not advertised by this publication.',
    'DATASET_NOT_AVAILABLE'
  );
  const policyIds = new Set(base.policy_ids);
  const indexUrl = new URL(manifest.datasets.source_evidence.file, manifestUrl);
  const index = await json(indexUrl);
  check(index.count === index.records.length, 'Evidence count mismatch.');
  let reviewedAnchors = 0;
  for (const entry of index.records) {
    reviewedAnchors += (
      await consumeEvidenceRecord(indexUrl, entry, client, {
        policyIds,
        schemaUrl: manifest.schemas.source_evidence,
      })
    ).reviewedAnchors;
  }
  return {
    ...base,
    source_documents: index.count,
    reviewed_anchors: reviewedAnchors,
    human_review_pending: reviewedAnchors === 0,
    source_currentness_verified: false,
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  runConsumerCli(consumeSourceEvidence).catch(consumerFailure);

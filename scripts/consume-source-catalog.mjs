#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  publicClient,
  check,
  hash,
  runConsumerCli,
  consumerFailure,
} from './consume-agent-data.mjs';
import { consumeEvidenceRecord } from './consume-source-evidence.mjs';

const human = (review) =>
  review?.status === 'verified' &&
  review.method === 'human' &&
  Boolean(review.reviewer?.trim()) &&
  /^\d{4}-\d{2}-\d{2}$/.test(review.reviewed_at || '');

export async function consumeSourceCatalog(
  manifestUrl,
  readBytes,
  { documentIds } = {}
) {
  const client = publicClient(readBytes);
  const manifest = await client.json(manifestUrl);
  const pointer = manifest.datasets?.discovery_catalog;
  check(
    pointer && manifest.schemas?.discovery_catalog,
    'Source catalog is not advertised.',
    'DATASET_NOT_AVAILABLE'
  );
  const catalogUrl = new URL(pointer.file, manifestUrl);
  const bytes = await client.read(catalogUrl);
  check(
    hash(bytes) === pointer.sha256,
    'Catalog fingerprint mismatch.',
    'CATALOG_HASH_MISMATCH'
  );
  const catalog = JSON.parse(bytes);
  await client.validate(
    new URL(manifest.schemas.discovery_catalog, manifestUrl),
    catalog
  );
  check(
    catalog.count === catalog.records.length && catalog.count === pointer.count,
    'Catalog count mismatch.'
  );
  check(
    catalog.source_db_sha256 === manifest.source_db_sha256,
    'Catalog policy snapshot mismatch.',
    'POLICY_SNAPSHOT_MISMATCH'
  );
  const policies = await client.json(
    new URL(manifest.datasets.policies.file, manifestUrl)
  );
  check(
    Array.isArray(policies.records) &&
      policies.count === policies.records.length,
    'Policy inventory count mismatch.'
  );
  const policyIds = new Set(policies.records.map((p) => p.id));
  check(policyIds.size === policies.count, 'Duplicate policy identity.');
  const evidenceIndexUrl = new URL(
    manifest.datasets.source_evidence.file,
    manifestUrl
  );
  const evidenceIndex = await client.json(evidenceIndexUrl);
  check(
    evidenceIndex.count === evidenceIndex.records.length,
    'Evidence index count mismatch.'
  );
  const available = new Set(catalog.records.map((r) => r.document_id));
  check(available.size === catalog.count, 'Duplicate document identity.');
  check(
    documentIds === undefined ||
      (Array.isArray(documentIds) &&
        documentIds.every((id) => available.has(id))),
    'Requested catalog document does not exist.',
    'INVALID_ARGUMENT'
  );
  const receipts = [];
  for (const record of catalog.records) {
    check(
      record.policy_links.every((link) => policyIds.has(link.policy_id)),
      'Orphan catalog policy link.'
    );
    if (documentIds && !documentIds.includes(record.document_id)) continue;
    const locatorIds = new Set();
    for (const locator of record.locators) {
      check(!locatorIds.has(locator.id), 'Duplicate locator identity.');
      locatorIds.add(locator.id);
      check(
        locator.version_sha256 === record.raw_sha256,
        'Locator refers to another source version.',
        'LOCATOR_VERSION_MISMATCH'
      );
      check(
        (record.access === 'public_frozen_text') === Boolean(locator.evidence),
        'Source access and evidence pointer disagree.'
      );
      const reasons = [
        'CLAIM_SUPPORT_NOT_REVIEWED',
        'CURRENTNESS_NOT_VERIFIED',
      ];
      let sourceCurrentThrough = null;
      let sourceChecked = false,
        reviewed = false;
      if (locator.evidence) {
        check(
          locator.kind === 'html_quote' && locator.physical_page === null,
          'Inconsistent HTML locator.'
        );
        const reference = locator.evidence;
        const advertised = evidenceIndex.records.find(
          (e) => e.document_id === record.document_id
        );
        const recordUrl = new URL(reference.file, catalogUrl);
        check(
          advertised &&
            new URL(advertised.file, evidenceIndexUrl).href ===
              recordUrl.href &&
            advertised.sha256 === reference.sha256,
          'Evidence reference is not in the advertised index.'
        );
        const { record: source } = await consumeEvidenceRecord(
          evidenceIndexUrl,
          advertised,
          client,
          { policyIds, schemaUrl: manifest.schemas.source_evidence }
        );
        sourceCurrentThrough = source.source_current_through;
        check(
          source.document_id === record.document_id &&
            source.raw_sha256 === record.raw_sha256 &&
            source.edition === record.edition &&
            source.source_url === record.source_url,
          'Catalog and evidence identify different document versions.',
          'SOURCE_IDENTITY_MISMATCH'
        );
        const anchor = source.anchors.find((a) => a.id === reference.anchor_id);
        check(anchor, 'Catalog anchor is absent.', 'LOCATOR_NOT_FOUND');
        check(
          source.review.status === record.identity_review_status &&
            anchor.review.status === locator.review_status,
          'Catalog and evidence reviews disagree.',
          'REVIEW_STATE_MISMATCH'
        );
        reviewed = human(source.review) && human(anchor.review);
        check(
          anchor.usable_as_reviewed_reference === reviewed,
          'Review flags are not supported by scoped human records.',
          'REVIEW_STATE_MISMATCH'
        );
        // Shared source validator checked only this selected raw/text/anchor set.
        sourceChecked = true;
      } else {
        check(
          locator.kind === 'pdf_page' &&
            locator.physical_page > 0 &&
            locator.printed_page,
          'A PDF locator needs physical and printed page labels.'
        );
        reasons.push('ORIGINAL_BYTES_NOT_PUBLICLY_RESOLVED');
      }
      if (!reviewed) reasons.push('IDENTITY_AND_LOCATOR_REVIEW_PENDING');
      if (record.edition === null) reasons.push('EDITION_UNKNOWN');
      receipts.push({
        document_id: record.document_id,
        raw_sha256: record.raw_sha256,
        locator_id: locator.id,
        source_kind: record.source_kind,
        reference: {
          title: record.title.en,
          edition: record.edition,
          official_url: record.source_url,
          locator: locator.description,
          physical_page: locator.physical_page,
          printed_page: locator.printed_page,
          coverage: record.coverage,
          source_current_through: sourceCurrentThrough,
        },
        source_bytes_and_anchor_checked: sourceChecked,
        reference_status:
          reviewed && sourceChecked
            ? 'reviewed_historical_locator'
            : 'candidate_only',
        claim_support_review: 'not_performed',
        currentness_verified: false,
        reasons,
      });
    }
  }
  return {
    catalog_records: catalog.count,
    catalog_sha256: hash(bytes),
    reviewed_catalog_references: receipts.filter(
      (r) => r.reference_status !== 'candidate_only'
    ).length,
    semantic_knowledge_extraction: 'not_performed',
    receipts,
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  runConsumerCli(consumeSourceCatalog).catch(consumerFailure);

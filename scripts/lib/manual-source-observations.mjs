import fs from 'node:fs';
import path from 'node:path';
import { parseCsv, sha256 } from './source-readiness.mjs';

// Private inputs are inspected only at capture time; committed output excludes
// file IDs, paths, URLs and source text. Transfer roles are not legal approval.
export function captureManualObservations(bytes, primaryRoot, supportingRoot) {
  const rows = parseCsv(bytes.toString('utf8'));
  const inspect = (row) => {
    if (
      !new Set([
        'new_nonhomepage_source_candidate',
        'supporting_or_registry_only',
        'supporting_official_publisher_page_only',
        'supporting_material_only',
        'rejected_non_document',
        'retrieval_failed',
      ]).has(row.archive_class)
    )
      throw new Error('Unknown manual archive class requires explicit review.');
    const candidate = row.archive_class === 'new_nonhomepage_source_candidate';
    const saved =
      row.download_status === 'saved_candidate' &&
      !['rejected_non_document', 'retrieval_failed'].includes(
        row.archive_class
      );
    let integrity = 'not_available';
    if (saved) {
      if (
        !/^[a-f0-9]{64}$/.test(row.sha256) ||
        !row.drive_file_id ||
        !Number.isSafeInteger(Number(row.file_size_bytes)) ||
        Number(row.file_size_bytes) <= 0
      )
        throw new Error('Saved source lacks transfer identity or full hash.');
      const root = candidate ? primaryRoot : supportingRoot;
      const prefix = `${row.policy_id}__${row.sha256.slice(0, 14)}.`;
      const matches = fs
        .readdirSync(root)
        .filter((name) => name.startsWith(prefix));
      if (matches.length !== 1)
        throw new Error('Saved source needs one local byte file.');
      const file = path.join(root, matches[0]);
      if (path.dirname(fs.realpathSync(file)) !== fs.realpathSync(root))
        throw new Error('Source file escapes private archive directory.');
      const raw = fs.readFileSync(file);
      if (
        sha256(raw) !== row.sha256 ||
        raw.length !== Number(row.file_size_bytes)
      )
        throw new Error('Manual source hash or byte length mismatch.');
      integrity = 'pass';
    }
    return {
      policy_id: row.policy_id,
      inventory_sha256: row.canonical_db_sha256,
      batch: row.batch,
      download_status: row.download_status,
      archive_class: row.archive_class,
      source_role: row.source_role,
      edition: row.edition || 'unknown',
      reported_sha256: row.sha256 || null,
      reported_bytes: saved ? Number(row.file_size_bytes) : null,
      local_byte_integrity: integrity,
      instrument_identity: 'not_reviewed',
    };
  };
  return {
    schema_version: '1.0.0',
    observation_type: 'manual_transfer_with_local_byte_checks',
    provenance: {
      manifest_sha256: sha256(bytes),
      private_file_ids_redacted: true,
    },
    rows: rows.map(inspect),
  };
}

export function reconcileManualObservations(
  manual,
  policies,
  inventorySha,
  baseline
) {
  if (!manual) return null;
  const ids = new Set(policies.map((p) => p.id));
  const baselineIds = new Set(
    baseline
      .filter((p) => p.archive.state === 'raw_candidate_archived')
      .map((p) => p.policy_id)
  );
  const candidateIds = new Set(),
    supportingIds = new Set(),
    blobs = new Set();
  const attempts = new Set();
  for (const row of manual.rows) {
    if (!ids.has(row.policy_id))
      throw new Error('Orphan manual acquisition policy ID.');
    if (row.inventory_sha256 !== inventorySha)
      throw new Error(
        'Manual acquisition inventory hash mismatch; recapture required.'
      );
    const attempt = JSON.stringify(row);
    if (attempts.has(attempt))
      throw new Error('Duplicate manual acquisition observation.');
    attempts.add(attempt);
    if (
      row.download_status !== 'saved_candidate' ||
      ['rejected_non_document', 'retrieval_failed'].includes(row.archive_class)
    )
      continue;
    if (
      row.local_byte_integrity !== 'pass' ||
      !/^[a-f0-9]{64}$/.test(row.reported_sha256 || '')
    )
      throw new Error('Saved manual source has not passed local byte checks.');
    blobs.add(row.reported_sha256);
    if (row.archive_class === 'new_nonhomepage_source_candidate')
      candidateIds.add(row.policy_id);
    else supportingIds.add(row.policy_id);
  }
  const union = new Set([...baselineIds, ...candidateIds]);
  return {
    provenance: manual.provenance,
    transfer_attempts: manual.rows.length,
    locally_hash_checked_unique_blobs: blobs.size,
    manual_candidate_policy_ids: [...candidateIds].sort(),
    supporting_only_policy_ids: [...supportingIds]
      .filter((id) => !candidateIds.has(id))
      .sort(),
    added_candidate_policy_ids: [...candidateIds]
      .filter((id) => !baselineIds.has(id))
      .sort(),
    cumulative_candidate_policy_ids: [...union].sort(),
    policies_without_raw_candidate: [...ids]
      .filter((id) => !union.has(id))
      .sort(),
    legal_identity_review: 'not_reviewed',
    current_drive_presence: 'not_rechecked',
  };
}

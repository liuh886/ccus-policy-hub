import crypto from 'node:crypto';

export const sha256 = (bytes) =>
  crypto.createHash('sha256').update(bytes).digest('hex');

export function parseVerifiedBaseline(
  rawText,
  { expectedInventorySha, expectedFileSha }
) {
  const normalizedText = rawText.replace(/\r\n/g, '\n');
  if (
    expectedFileSha &&
    sha256(Buffer.from(normalizedText, 'utf8')) !== expectedFileSha
  )
    throw new Error('Inventory URL baseline file SHA-256 mismatch.');
  const doc = JSON.parse(normalizedText);
  if (
    !doc ||
    doc.inventory_sha256 !== expectedInventorySha ||
    !Array.isArray(doc.rows) ||
    doc.rows.length !== doc.policy_count
  )
    throw new Error('Invalid inventory URL baseline structure.');
  if (sha256(Buffer.from(JSON.stringify(doc.rows), 'utf8')) !== doc.rows_sha256)
    throw new Error('Inventory URL baseline rows SHA-256 mismatch.');
  const urlsById = new Map();
  for (const row of doc.rows) {
    if (!row?.policy_id || urlsById.has(row.policy_id))
      throw new Error('Duplicate or missing baseline policy ID.');
    urlsById.set(row.policy_id, row.url ?? null);
  }
  return {
    inventory_sha256: doc.inventory_sha256,
    rows_sha256: doc.rows_sha256,
    file_sha256: expectedFileSha || null,
    policy_count: urlsById.size,
    urlsById,
  };
}

export function normalizeBaselineMap(baselines) {
  const map = new Map();
  if (!baselines) return map;
  const entries =
    baselines instanceof Map ? baselines.entries() : Object.entries(baselines);
  for (const [sha, value] of entries) {
    if (value instanceof Map) {
      map.set(sha, {
        urlsById: new Map(value),
        metadata: {
          inventory_sha256: sha,
          policy_count: value.size,
          rows_sha256: null,
          file_sha256: null,
        },
      });
      continue;
    }
    if (value?.urlsById instanceof Map) {
      map.set(sha, {
        urlsById: value.urlsById,
        metadata: {
          inventory_sha256: value.inventory_sha256 || sha,
          policy_count: value.urlsById.size,
          rows_sha256: value.rows_sha256 || null,
          file_sha256: value.file_sha256 || null,
        },
      });
      continue;
    }
    if (Array.isArray(value?.rows)) {
      if (
        value.rows_sha256 &&
        sha256(Buffer.from(JSON.stringify(value.rows), 'utf8')) !==
          value.rows_sha256
      )
        throw new Error('Inventory URL baseline rows SHA-256 mismatch.');
      const urlsById = new Map(
        value.rows.map((row) => [row.policy_id, row.url ?? null])
      );
      map.set(sha, {
        urlsById,
        metadata: {
          inventory_sha256: value.inventory_sha256 || sha,
          policy_count: urlsById.size,
          rows_sha256: value.rows_sha256 || null,
          file_sha256: value.file_sha256 || null,
        },
      });
    }
  }
  return map;
}

export function resolvePolicyBinding({
  policy,
  capturedInventorySha,
  currentInventorySha,
  baselineMap,
}) {
  if (!capturedInventorySha)
    return {
      bound: false,
      mode: 'inventory_mismatch',
      reason: 'ARCHIVE_INVENTORY_MISMATCH',
    };
  if (capturedInventorySha === currentInventorySha)
    return { bound: true, mode: 'exact_inventory_sha256', reason: null };
  const baseline = baselineMap?.get(capturedInventorySha);
  if (!baseline)
    return {
      bound: false,
      mode: 'inventory_mismatch',
      reason: 'ARCHIVE_INVENTORY_MISMATCH',
    };
  if (!baseline.urlsById.has(policy.id))
    return {
      bound: false,
      mode: 'policy_added_since_capture',
      reason: 'ARCHIVE_OBSERVATION_UNAVAILABLE',
    };
  if (baseline.urlsById.get(policy.id) === (policy.url ?? null))
    return { bound: true, mode: 'policy_url_match', reason: null };
  return {
    bound: false,
    mode: 'url_changed_since_capture',
    reason: 'ARCHIVE_URL_CHANGED_SINCE_CAPTURE',
  };
}
export function parseCsv(text) {
  const rows = [];
  let row = [],
    field = '',
    quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (quoted) throw new Error('Unterminated CSV quote.');
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows.shift() || [];
  if (new Set(headers).size !== headers.length)
    throw new Error('Duplicate CSV headers.');
  return rows.map((values) => {
    if (values.length !== headers.length)
      throw new Error('CSV row width differs from headers.');
    return Object.fromEntries(headers.map((key, i) => [key, values[i]]));
  });
}

export function captureObservations(auditBytes, backlogBytes) {
  const audit = parseCsv(auditBytes.toString('utf8')),
    backlog = parseCsv(backlogBytes.toString('utf8'));
  const unique = (rows) => {
    const ids = rows.map((row) => row.policy_id);
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length)
      throw new Error('Observation must contain each policy ID once.');
  };
  unique(audit);
  unique(backlog);
  const byId = new Map(backlog.map((row) => [row.policy_id, row]));
  if (
    audit.length !== backlog.length ||
    audit.some((row) => !byId.has(row.policy_id))
  )
    throw new Error('Audit and backlog IDs disagree.');
  return {
    schema_version: '1.0.0',
    observation_type: 'v4_transfer_and_research_only',
    provenance: {
      audit_sha256: sha256(auditBytes),
      backlog_sha256: sha256(backlogBytes),
      private_file_ids_redacted: true,
    },
    rows: audit
      .map((row) => {
        const research = byId.get(row.policy_id);
        if (
          !/^[a-f0-9]{64}$/.test(row.inventory_sha256) ||
          row.inventory_sha256 !== research.inventory_sha256
        )
          throw new Error('Observation inventory hashes disagree.');
        return {
          policy_id: row.policy_id,
          inventory_sha256: row.inventory_sha256,
          observed_at: row.collected_at || null,
          status: row.status,
          http_status: row.http_status || null,
          url_scope: row.url_scope || 'unknown',
          format: row.format || null,
          reported_sha256: row.sha256 || null,
          source_edition: row.source_edition || null,
          archive_state: research.archive_state,
          has_private_file: Boolean(research.archived_source_file_id),
          source_candidate_count: Number(research.source_candidate_count || 0),
          instrument_review: 'not_reviewed',
        };
      })
      .sort((a, b) => a.policy_id.localeCompare(b.policy_id)),
  };
}

const reviewed = (value) =>
  value?.status === 'verified' &&
  value.method === 'human' &&
  Boolean(value.reviewer?.trim()) &&
  /^\d{4}-\d{2}-\d{2}$/.test(value.reviewed_at || '');
function sourceUrl(value) {
  try {
    const url = new URL(value);
    return {
      present: true,
      reference: value,
      protocol: url.protocol,
      scope: ['/', '/en', '/en/', '/index.html', '/index.htm'].includes(
        url.pathname
      )
        ? 'homepage_like'
        : 'unknown',
      primary_document_identified: 'unknown',
    };
  } catch {
    return {
      present: Boolean(value),
      reference: value || null,
      protocol: 'unknown',
      scope: 'unknown',
      primary_document_identified: 'unknown',
    };
  }
}
function packetState({ data, raw, normalized }) {
  const gaps = [];
  const rawOk = Boolean(
    raw &&
    /^[a-f0-9]{64}$/.test(data.raw_sha256 || '') &&
    sha256(raw) === data.raw_sha256
  );
  if (!raw) gaps.push('ORIGINAL_BYTES_UNAVAILABLE');
  else if (!rawOk) gaps.push('RAW_HASH_MISMATCH');
  const snippet = raw?.subarray(0, 65536).toString('utf8') || '';
  const errorPage =
    /<(?:html|title)\b/i.test(snippet) &&
    /(?:<title[^>]*>[^<]*(?:page not found|access denied|sign in|error)|captcha|<input[^>]*type=["']password)/i.test(
      snippet
    );
  if (errorPage) gaps.push('ERROR_OR_LOGIN_BODY');
  const textOk = Boolean(
    normalized && sha256(normalized) === data.normalized_sha256
  );
  if (!textOk) gaps.push('NORMALIZED_TEXT_NOT_REVALIDATED');
  let signedAnchors = 0,
    validAnchors = 0;
  for (const anchor of data.anchors || []) {
    if (!reviewed(data.review) || !reviewed(anchor.review)) continue;
    signedAnchors++;
    const text = normalized?.toString('utf8') || '';
    if (
      rawOk &&
      !errorPage &&
      textOk &&
      anchor.version_sha256 === data.raw_sha256 &&
      Number.isInteger(anchor.start_offset) &&
      anchor.end_offset > anchor.start_offset &&
      anchor.offset_unit === 'utf16_code_units' &&
      text.slice(anchor.start_offset, anchor.end_offset) === anchor.exact_quote
    )
      validAnchors++;
  }
  if (!reviewed(data.review)) gaps.push('HUMAN_DOCUMENT_REVIEW_PENDING');
  if ((data.anchors || []).length && !validAnchors)
    gaps.push('HUMAN_LOCATOR_REVIEW_PENDING');
  gaps.push('PRIMARY_INSTRUMENT_IDENTITY_NOT_REVIEWED', 'CURRENTNESS_UNKNOWN');
  return {
    document_id: data.document_id,
    raw_sha256: data.raw_sha256 || null,
    raw_integrity: !raw ? 'not_available' : rawOk ? 'pass' : 'mismatch',
    content_validity: errorPage ? 'rejected_error_or_login' : 'not_reviewed',
    public_redistribution_permission: 'unknown',
    edition: data.edition || 'unknown',
    source_current_through: data.source_current_through || null,
    coverage: data.coverage || 'not_established',
    extractor_version: data.extractor_version || 'unknown',
    locator_candidates: (data.anchors || []).length,
    human_review_records: signedAnchors,
    validated_human_reviewed_anchors: validAnchors,
    currentness: 'unknown',
    gaps,
    regression:
      reviewed(data.review) &&
      (!rawOk || errorPage || signedAnchors > validAnchors),
  };
}

export function buildReadiness({
  policies,
  inventorySha,
  observations = null,
  packets = [],
  asOf,
  baselines = null,
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf))
    throw new Error('Explicit as-of date required.');
  const ids = new Set(policies.map((p) => p.id));
  if (ids.size !== policies.length)
    throw new Error('Duplicate canonical policy ID.');
  const baselineMap = normalizeBaselineMap(baselines);
  const observed = new Map();
  for (const row of observations?.rows || []) {
    if (!ids.has(row.policy_id) || observed.has(row.policy_id))
      throw new Error('Unknown or duplicate observation policy ID.');
    observed.set(row.policy_id, row);
  }
  const documentIds = new Set(),
    versions = new Set(),
    perPolicy = new Map(),
    regressions = [],
    urlChangedPolicyIds = [],
    v4SupersededCandidateIds = [];
  const bindingCounts = {
    exact_inventory_sha256: 0,
    policy_url_match: 0,
    url_changed_since_capture: 0,
    policy_added_since_capture: 0,
    inventory_mismatch: 0,
    unbound: 0,
  };
  for (const packet of packets) {
    const linked = packet.data.policy_ids || [packet.data.policy_id];
    if (
      !Array.isArray(linked) ||
      !linked.length ||
      linked.some((id) => !ids.has(id))
    )
      throw new Error('Orphan evidence packet.');
    if (!packet.data.document_id) throw new Error('Missing document identity.');
    const state = packetState(packet);
    documentIds.add(state.document_id);
    if (state.raw_integrity === 'pass')
      versions.add(
        `${state.document_id}:${state.raw_sha256}:${state.extractor_version}`
      );
    if (state.regression)
      regressions.push({
        document_id: state.document_id,
        reason: 'Previously human-reviewed evidence could not be revalidated',
      });
    for (const id of linked) {
      if (!perPolicy.has(id)) perPolicy.set(id, []);
      perPolicy.get(id).push(state);
    }
  }
  const rows = policies
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((policy) => {
      const docs = perPolicy.get(policy.id) || [];
      const input = observed.get(policy.id);
      const binding = input
        ? resolvePolicyBinding({
            policy,
            capturedInventorySha: input.inventory_sha256,
            currentInventorySha: inventorySha,
            baselineMap,
          })
        : {
            bound: false,
            mode: 'unbound',
            reason: 'ARCHIVE_OBSERVATION_UNAVAILABLE',
          };
      bindingCounts[binding.mode] = (bindingCounts[binding.mode] || 0) + 1;
      const observation = binding.bound ? input : null;
      const gaps = [...new Set(docs.flatMap((d) => d.gaps))];
      if (!docs.length)
        gaps.push(
          'NO_GIT_FROZEN_ORIGINAL',
          'PRIMARY_INSTRUMENT_IDENTITY_NOT_REVIEWED',
          'CURRENTNESS_UNKNOWN'
        );
      if (
        input &&
        !binding.bound &&
        binding.reason &&
        binding.reason !== 'ARCHIVE_OBSERVATION_UNAVAILABLE'
      )
        gaps.push(binding.reason);
      if (!observation) gaps.push('ARCHIVE_OBSERVATION_UNAVAILABLE');
      if (binding.mode === 'url_changed_since_capture') {
        urlChangedPolicyIds.push(policy.id);
        if (input?.archive_state === 'raw_candidate_archived')
          v4SupersededCandidateIds.push(policy.id);
      }
      const url = sourceUrl(policy.url);
      const archiveState = observation?.archive_state || 'unknown';
      if (
        archiveState === 'raw_homepage_only' ||
        observation?.status === 'source_too_broad'
      )
        gaps.push('SOURCE_TOO_BROAD');
      if (
        observation &&
        [
          'not_found',
          'access_blocked',
          'blocked_html',
          'network_error',
          'http_202_not_document',
          'non_https_source',
        ].includes(observation.status)
      )
        gaps.push(observation.status.toUpperCase());
      const priority =
        gaps.includes('SOURCE_TOO_BROAD') ||
        ['not_found', 'non_https_source'].includes(observation?.status) ||
        !url.present ||
        url.scope === 'homepage_like'
          ? 'P0'
          : archiveState === 'raw_candidate_archived'
            ? 'P2'
            : 'P1';
      return {
        policy_id: policy.id,
        country: policy.country,
        policy_review_status: policy.review_status,
        source_url: url,
        document_kind: 'unknown',
        archive: {
          binding_mode: binding.mode,
          state: archiveState,
          transfer_status: observation?.status || 'unknown',
          observed_at: observation?.observed_at || null,
          http_status: observation?.http_status || null,
          has_private_file: observation?.has_private_file ?? null,
          reported_content_sha256: observation?.reported_sha256 || null,
          recorded_edition: observation?.source_edition || 'unknown',
          source_url_scope: observation?.url_scope || 'unknown',
          local_original_integrity: 'not_checked',
          content_identity: 'not_reviewed',
        },
        documents: docs.map(({ regression, ...document }) => document),
        evidence_level: 'record_summary',
        currentness: 'unknown',
        priority,
        gaps: [...new Set(gaps)].sort(),
      };
    });
  const uniqueStates = new Map();
  for (const values of perPolicy.values())
    for (const value of values)
      uniqueStates.set(
        `${value.document_id}:${value.raw_sha256}:${value.extractor_version}`,
        value
      );
  return {
    schema_version: '1.0.0',
    as_of: asOf,
    inventory_sha256: inventorySha,
    inputs: {
      evidence_packet_manifests: packets
        .map((packet) => ({
          document_id: packet.data.document_id,
          manifest_sha256: packet.manifest_sha256 || null,
        }))
        .sort((a, b) => a.document_id.localeCompare(b.document_id)),
      archive_observation_provenance: observations?.provenance || null,
      archive_binding: bindingCounts,
      inventory_url_baselines: [...baselineMap.entries()]
        .map(([sha, entry]) => ({
          inventory_sha256: sha,
          policy_count: entry.urlsById.size,
          rows_sha256: entry.metadata?.rows_sha256 || null,
          file_sha256: entry.metadata?.file_sha256 || null,
        }))
        .sort((a, b) => a.inventory_sha256.localeCompare(b.inventory_sha256)),
      network_checked: false,
      sqlite_written: false,
      private_originals_redistributed: false,
    },
    totals: {
      policy_records: rows.length,
      url_present: rows.filter((p) => p.source_url.present).length,
      archive_rows_bound_to_current_inventory: rows.filter(
        (p) => p.archive.state !== 'unknown'
      ).length,
      archive_rows_quarantined_url_changed: urlChangedPolicyIds.length,
      observed_private_raw_candidates: rows.filter(
        (p) => p.archive.state === 'raw_candidate_archived'
      ).length,
      observed_private_homepage_only: rows.filter(
        (p) => p.archive.state === 'raw_homepage_only'
      ).length,
      git_document_identities_recorded: documentIds.size,
      git_byte_versions_validated: versions.size,
      human_locator_review_records: [...uniqueStates.values()].reduce(
        (n, s) => n + s.human_review_records,
        0
      ),
      validated_human_reviewed_anchors: [...uniqueStates.values()].reduce(
        (n, s) => n + s.validated_human_reviewed_anchors,
        0
      ),
      primary_instrument_identity_reviewed_policies: 0,
    },
    limitations: [
      'Transfer states and nonempty URLs are not verified primary-document coverage.',
      'Document kind and current legal applicability remain unknown without explicit scoped review.',
      'Private file IDs and original content are excluded. A missing local packet does not prove there is no private archive.',
    ],
    superseded_url_candidates: {
      policy_ids: [...v4SupersededCandidateIds].sort(),
      v4_policy_ids: [...v4SupersededCandidateIds].sort(),
      manual_policy_ids: [],
      url_changed_quarantined_policy_ids: [...urlChangedPolicyIds].sort(),
    },
    triage: rows
      .filter((row) => row.priority !== 'P2')
      .map((row) => ({
        policy_id: row.policy_id,
        priority: row.priority,
        blockers: row.gaps,
      }))
      .sort(
        (a, b) =>
          a.priority.localeCompare(b.priority) ||
          a.policy_id.localeCompare(b.policy_id)
      ),
    regressions,
    policies: rows,
  };
}

export function renderReadiness(report) {
  const supersededIds = report.superseded_url_candidates?.policy_ids || [];
  const quarantinedCount =
    report.totals.archive_rows_quarantined_url_changed || 0;
  return (
    `# Policy original-source readiness\n\nGenerated read-only as of ${report.as_of}; SQLite SHA-256: ${report.inventory_sha256}.\nNo network verification or factual review date update was performed.\n\n` +
    Object.entries(report.totals)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n') +
    `\n\nPrivate transfer observations are not verified document identities. Zero accepted primary identities here is a verification baseline, not proof that official sources do not exist.\n\n` +
    (report.manual_acquisition
      ? `Cumulative reconciliation adds ${report.manual_acquisition.added_candidate_policy_ids.length} current-URL-aligned policy candidates from ${report.manual_acquisition.locally_hash_checked_unique_blobs} locally hash-checked manual blobs. Supporting/rejected materials are excluded from policy coverage. Current Drive presence and legal identity were not rechecked. The table and triage below retain the current-URL-bound baseline observations; cumulative policy-ID lists are in the JSON report.\n\n`
      : '') +
    (quarantinedCount
      ? `URL-change quarantine excludes ${quarantinedCount} policies whose canonical URL changed since the 2026-10-30 capture (\`ARCHIVE_URL_CHANGED_SINCE_CAPTURE\`), including ${supersededIds.length} superseded prior-URL candidates (${supersededIds.join(', ')}).\n\n`
      : '') +
    `| Policy ID | Record review | Private archive observation | Priority | Evidence gaps |\n| --- | --- | --- | --- | --- |\n` +
    report.policies
      .map(
        (row) =>
          `| ${row.policy_id} | ${row.policy_review_status || 'unknown'} | ${row.archive.state} | ${row.priority} | ${row.gaps.join(', ')} |`
      )
      .join('\n') +
    '\n'
  );
}

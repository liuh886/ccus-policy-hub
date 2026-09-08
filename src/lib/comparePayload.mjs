/**
 * comparePayload.mjs
 *
 * T3 page-weight contract: the compare page embeds its working data in
 * `data-*` attributes for client-side scripts. Full collection records
 * (~5.8 MB) are far more than the client reads, so the workspace projects
 * each record down to the exact fields consumed by
 * governanceComparisonClient.mjs / governanceWorkspaceVisuals.mjs /
 * governanceBenchmarking.mjs:
 *
 * - policy: id + country/status (filter) + analysis (scores + evidence) +
 *   year/title/source (display + citation fallback)
 * - facility: country/status/capacities (deployment metrics only)
 * - profile: country id + regulatory matrix
 *
 * The `{ id, data }` envelope is preserved so client code is untouched.
 * Field lists are frozen and locked by scripts/page-payload.test.mjs —
 * adding a field here grows every compare page, do it deliberately.
 */

export const COMPARE_POLICY_FIELDS = Object.freeze([
  'country',
  'status',
  'analysis',
  'year',
  'title',
  'source',
]);

export const COMPARE_FACILITY_FIELDS = Object.freeze([
  'country',
  'status',
  'estimatedCapacity',
  'announcedCapacityMin',
  'announcedCapacityMax',
]);

const pick = (data, fields) =>
  Object.fromEntries(
    fields
      .filter((field) => data?.[field] !== undefined)
      .map((field) => [field, data[field]])
  );

export function toComparePolicy(entry = {}) {
  return { id: entry?.id, data: pick(entry?.data, COMPARE_POLICY_FIELDS) };
}

export function toCompareFacility(entry = {}) {
  return { id: entry?.id, data: pick(entry?.data, COMPARE_FACILITY_FIELDS) };
}

export function toCompareProfile(entry = {}) {
  const data = entry?.data ?? {};
  return {
    id: entry?.id,
    data: {
      ...(data?.id !== undefined ? { id: data.id } : {}),
      ...(data?.regulatory !== undefined
        ? { regulatory: data.regulatory }
        : {}),
    },
  };
}

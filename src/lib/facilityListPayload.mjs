/**
 * facilityListPayload.mjs
 *
 * T3 page-weight contract: the facilities directory embeds one compact
 * record per facility so the client can filter, sort and paginate over the
 * FULL dataset instead of only the server-rendered page slice. Before this
 * payload existed the dropdown/map covered all facilities but the card grid
 * (48 per page) was filtered in isolation, so e.g. selecting Indonesia only
 * surfaced the handful of Indonesian facilities that happened to sit on the
 * current page.
 *
 * Fields are frozen and locked by scripts/page-payload.test.mjs — adding a
 * field grows every directory page, do it deliberately.
 */

export const FACILITY_LIST_FIELDS = Object.freeze([
  'id',
  'name',
  'country',
  'region',
  'sector',
  'type',
  'status',
  'estimatedCapacity',
  'announcedCapacityMax',
  'announcement',
  'hub',
  'partners',
  'operator',
  'phase',
  'precision',
]);

export function toFacilityListItem(entry = {}) {
  const data = entry?.data ?? {};
  return {
    id: entry?.id ?? null,
    name: data.name ?? null,
    country: data.country ?? null,
    region: data.region ?? null,
    sector: data.sector ?? null,
    type: data.type ?? null,
    status: data.status ?? null,
    estimatedCapacity: data.estimatedCapacity ?? null,
    announcedCapacityMax: data.announcedCapacityMax ?? null,
    announcement: data.announcement ?? null,
    hub: data.hub ?? null,
    partners: Array.isArray(data.partners) ? data.partners.join(' ') : '',
    operator: data.operator ?? null,
    phase: data.phase ?? null,
    precision: data.precision ?? null,
  };
}

/**
 * mapPayload.mjs
 *
 * T3 page-weight contract: the facilities page embeds one record per
 * facility for Leaflet. The client (FacilityMap.astro#getMapPayload) reads
 * exactly these fields — nothing else may ride along. Locked by
 * scripts/page-payload.test.mjs.
 *
 * Measured 2026-09-14 (dist build): 1,110 records = ~221 KB inline
 * (~199 B/record; 0 non-renderable records, coordinates already ≤9 chars,
 * all 8 fields consumed by popups/filters). ~12.5x smaller than
 * public/data/facilities.json (2.8 MB, untouched public interface).
 * Per-country lazy shards were evaluated and rejected: ~50 KB gzipped
 * saving does not justify fetch complexity on a static page.
 */

export const MAP_PAYLOAD_FIELDS = Object.freeze([
  'id',
  'name',
  'coordinates',
  'precision',
  'status',
  'estimatedCapacity',
  'announcedCapacityMax',
  'type',
]);

export function toMapFacility(record = {}) {
  return Object.fromEntries(
    MAP_PAYLOAD_FIELDS.map((field) => [field, record?.[field] ?? null])
  );
}

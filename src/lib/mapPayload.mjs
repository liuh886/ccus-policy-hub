/**
 * mapPayload.mjs
 *
 * T3 page-weight contract: the facilities page embeds one record per
 * facility for Leaflet. The client (FacilityMap.astro#getMapPayload) reads
 * exactly these fields — nothing else may ride along. Locked by
 * scripts/page-payload.test.mjs.
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

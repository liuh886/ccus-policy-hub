/**
 * facilityListQuery.mjs
 *
 * Pure filter / sort / paginate / stats helpers for the facilities
 * directory. Kept dependency-free so both the browser bundle and Node unit
 * tests can use them, and so the "full dataset" contract is regression
 * guarded (see facilityListQuery.test.mjs): the directory must filter over
 * every facility, not just the currently rendered page.
 */

export function facilityCapacity(item) {
  return (
    Number(item?.estimatedCapacity) || Number(item?.announcedCapacityMax) || 0
  );
}

export function facilityYear(item) {
  const year = parseInt(String(item?.announcement ?? ''), 10);
  return Number.isFinite(year) ? year : 9999;
}

function searchHaystack(item) {
  return [
    item?.name,
    item?.hub,
    item?.partners,
    item?.operator,
    item?.country,
    item?.region,
  ].map((value) => String(value ?? '').toLowerCase());
}

export function filterFacilities(items, filters = {}) {
  const query = String(filters.q ?? '')
    .trim()
    .toLowerCase();
  const country = filters.country || '';
  const status = filters.status || '';
  const sector = filters.sector || '';
  const type = filters.type || '';

  return (items ?? []).filter((item) => {
    const matchesSearch =
      !query || searchHaystack(item).some((value) => value.includes(query));

    return (
      matchesSearch &&
      (!country || item?.country === country) &&
      (!status || item?.status === status) &&
      (!sector || item?.sector === sector) &&
      (!type || item?.type === type)
    );
  });
}

export function sortFacilityItems(items, sortValue = 'default') {
  if (sortValue === 'capacity-desc') {
    return [...items].sort((a, b) => facilityCapacity(b) - facilityCapacity(a));
  }
  if (sortValue === 'year-asc') {
    return [...items].sort((a, b) => facilityYear(a) - facilityYear(b));
  }
  return items;
}

export function paginateFacilities(items, page, pageSize) {
  const size = Math.max(1, Number(pageSize) || 1);
  const total = Math.max(1, Math.ceil((items?.length ?? 0) / size));
  const safePage = Math.min(Math.max(1, Number(page) || 1), total);
  const start = (safePage - 1) * size;
  return {
    page: safePage,
    total,
    items: (items ?? []).slice(start, start + size),
  };
}

export function computeFacilityStats(items) {
  let count = 0;
  let capacity = 0;
  let operational = 0;
  let operationalCap = 0;
  let constructionCap = 0;

  for (const item of items ?? []) {
    const itemCapacity = facilityCapacity(item);
    count += 1;
    capacity += itemCapacity;

    if (item?.status === '运行中' || item?.status === 'Operational') {
      operational += 1;
      operationalCap += itemCapacity;
    }
    if (item?.status === '建设中' || item?.status === 'Under construction') {
      constructionCap += itemCapacity;
    }
  }

  return { count, capacity, operational, operationalCap, constructionCap };
}

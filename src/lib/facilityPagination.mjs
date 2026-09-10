/**
 * Shared pagination for the facilities directory (zh + en).
 * Page 1 lives at /facilities/ (and /en/facilities/); pages 2..N live at
 * /facilities/page/2 .. N. The /page/ prefix is deliberate: facility ids
 * are numeric and collide with bare /2../24 paths used by [...page] routes.
 */

export const FACILITIES_PAGE_SIZE = 48;

export function sortFacilities(entries) {
  return [...entries].sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true })
  );
}

export function facilitiesPageCount(total) {
  return Math.max(1, Math.ceil(total / FACILITIES_PAGE_SIZE));
}

export function facilitiesPageSlice(sorted, page) {
  const start = (page - 1) * FACILITIES_PAGE_SIZE;
  return sorted.slice(start, start + FACILITIES_PAGE_SIZE);
}

export function facilitiesPageUrls(base, page, total) {
  return {
    prevUrl:
      page === 2
        ? `${base}/`
        : page > 2
          ? `${base}/page/${page - 1}`
          : undefined,
    nextUrl: page < total ? `${base}/page/${page + 1}` : undefined,
  };
}

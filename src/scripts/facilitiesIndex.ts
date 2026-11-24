import { renderFacilityCardHtml } from '../lib/facilityCard.mjs';
import {
  computeFacilityStats,
  filterFacilities,
  paginateFacilities,
  sortFacilityItems,
} from '../lib/facilityListQuery.mjs';
import { fetchCachedJson } from '../lib/cachedJsonFetch.ts';
import { t as translateUi, makePair } from '../i18n/ui.ts';
import type { UiKey } from '../i18n/ui.ts';

export interface FacilityListItem {
  id: string | number | null;
  name: string | null;
  country: string | null;
  region: string | null;
  sector: string | null;
  type: string | null;
  status: string | null;
  estimatedCapacity: number | null;
  announcedCapacityMax: number | null;
  announcement: string | null;
  hub: string | null;
  partners: string;
  operator: string | null;
  phase: string | null;
  precision: string | null;
}

export interface FacilityFilterState {
  q: string;
  country: string;
  status: string;
  sector: string;
  type: string;
  sort: string;
  page: number;
}

type FacilityQueryFields = Pick<
  FacilityFilterState,
  'q' | 'country' | 'status' | 'sector' | 'type' | 'sort'
>;

let abortCurrent: AbortController | null = null;

export function readFacilityFilterState(
  search: string,
  currentPage: number
): FacilityFilterState {
  const params = new URLSearchParams(search);
  const parsedPage = Number(currentPage);
  const page =
    Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1;

  return {
    q: params.get('q') || '',
    country: params.get('country') || '',
    status: params.get('status') || '',
    sector: params.get('sector') || '',
    type: params.get('type') || '',
    sort: params.get('sort') || 'default',
    page,
  };
}

export function hasActiveFacilityQuery(state: FacilityQueryFields): boolean {
  return Boolean(
    state.q ||
    state.country ||
    state.status ||
    state.sector ||
    state.type ||
    state.sort !== 'default'
  );
}

export function buildFacilityListUrl({
  siteBase,
  listPath,
  state,
  page,
}: {
  siteBase: string;
  listPath: string;
  state: FacilityQueryFields;
  page: number;
}): string {
  const search = new URLSearchParams();
  if (state.q) search.set('q', state.q);
  if (state.country) search.set('country', state.country);
  if (state.status) search.set('status', state.status);
  if (state.sector) search.set('sector', state.sector);
  if (state.type) search.set('type', state.type);
  if (state.sort && state.sort !== 'default') search.set('sort', state.sort);

  const query = search.toString();
  const cleanBase = siteBase.replace(/\/+$/, '');
  const cleanListPath = listPath.replace(/\/+$/, '');
  const path =
    page <= 1
      ? `${cleanBase}${cleanListPath}/`
      : `${cleanBase}${cleanListPath}/page/${page}/`;
  return `${path}${query ? `?${query}` : ''}`;
}

export function renderFacilityPaginationHtml({
  page,
  total,
  tp,
}: {
  page: number;
  total: number;
  tp: (zh: string, en: string) => string;
}): string {
  if (total <= 1) {
    return '';
  }

  const buttonClass =
    'px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-blue-500 transition-colors text-sm font-medium cursor-pointer';
  const disabledClass =
    'px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-lg text-slate-300 text-sm cursor-not-allowed';

  const prev = `<button type="button" data-page="${page - 1}" class="${page > 1 ? buttonClass : disabledClass}" ${page > 1 ? '' : 'disabled'}>&larr; ${tp('上一页', 'Previous')}</button>`;
  const next = `<button type="button" data-page="${page + 1}" class="${page < total ? buttonClass : disabledClass}" ${page < total ? '' : 'disabled'}>${tp('下一页', 'Next')} &rarr;</button>`;
  const label = `<span class="text-sm font-bold text-slate-500">${tp(`第 ${page} 页 / 共 ${total} 页`, `Page ${page} of ${total}`)}</span>`;

  return `<nav class="flex justify-center items-center gap-4 mt-12">${prev}${label}${next}</nav>`;
}

async function loadListItems(listUrl: string): Promise<FacilityListItem[]> {
  const parsed = await fetchCachedJson<unknown>(listUrl);
  if (!Array.isArray(parsed)) {
    throw new Error('Facility list payload is not an array.');
  }
  return parsed as FacilityListItem[];
}

export function setupFacilityFiltering(): void {
  const grid = document.getElementById('facility-grid') as HTMLElement | null;
  if (!grid) return;
  if (
    grid.dataset.facilityBound === '1' &&
    abortCurrent &&
    !abortCurrent.signal.aborted
  ) {
    return;
  }

  abortCurrent?.abort();
  const controller = new AbortController();
  abortCurrent = controller;
  const { signal } = controller;
  grid.dataset.facilityBound = '1';

  const searchInput = document.getElementById(
    'search-input'
  ) as HTMLInputElement | null;
  const countryFilter = document.getElementById(
    'country-filter'
  ) as HTMLSelectElement | null;
  const statusFilter = document.getElementById(
    'status-filter'
  ) as HTMLSelectElement | null;
  const sectorFilter = document.getElementById(
    'sector-filter'
  ) as HTMLSelectElement | null;
  const typeFilter = document.getElementById(
    'type-filter'
  ) as HTMLSelectElement | null;
  const sortSelect = document.getElementById(
    'sort-select'
  ) as HTMLSelectElement | null;
  const noResults = document.getElementById('no-results');
  const paginationHost = document.getElementById('facility-pagination');

  const statCount = document.getElementById('stat-count');
  const statCapacity = document.getElementById('stat-capacity');
  const statOperational = document.getElementById('stat-operational');
  const statOperationalCap = document.getElementById('stat-operational-cap');
  const statConstructionCap = document.getElementById('stat-construction-cap');

  const pageSize = Number(grid.dataset.pageSize) || 48;
  const siteBase = grid.dataset.siteBase || '';
  const listPath = grid.dataset.listPath || '/facilities';
  const lang = grid.dataset.lang === 'en' ? 'en' : 'zh';
  const listUrl =
    grid.dataset.listUrl || `${siteBase}/api/facilities-list.${lang}.json`;
  const t = (key: UiKey) => translateUi(lang, key);
  const tp = makePair(lang);
  const cardCtx = { base: siteBase, lang, t, tp };

  const state = readFacilityFilterState(
    window.location.search,
    Number(grid.dataset.currentPage) || 1
  );

  const hasActiveQuery = hasActiveFacilityQuery(state);

  const applyStateToControls = () => {
    if (searchInput) searchInput.value = state.q;
    if (countryFilter) countryFilter.value = state.country;
    if (statusFilter) statusFilter.value = state.status;
    if (sectorFilter) sectorFilter.value = state.sector;
    if (typeFilter) typeFilter.value = state.type;
    if (sortSelect) sortSelect.value = state.sort;
  };

  const syncUrl = (page: number) => {
    const url = buildFacilityListUrl({ siteBase, listPath, state, page });
    window.history.replaceState(window.history.state, '', url);
  };

  const renderPagination = (
    page: number,
    total: number,
    allItems: FacilityListItem[]
  ) => {
    if (!paginationHost) return;
    const html = renderFacilityPaginationHtml({ page, total, tp });
    paginationHost.innerHTML = html;
    if (!html) return;

    paginationHost
      .querySelectorAll<HTMLButtonElement>('button[data-page]')
      .forEach((button) => {
        button.addEventListener(
          'click',
          () => {
            const target = Number(button.dataset.page);
            if (!Number.isFinite(target) || target < 1 || target > total) {
              return;
            }
            state.page = target;
            render(allItems);
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
          },
          { signal }
        );
      });
  };

  const render = (allItems: FacilityListItem[]) => {
    const filtered = filterFacilities(allItems, state);
    const sorted = sortFacilityItems(filtered, state.sort);
    const paged = paginateFacilities(sorted, state.page, pageSize);
    state.page = paged.page;

    grid.innerHTML = paged.items
      .map(
        (item: FacilityListItem) =>
          `<div class="facility-item">${renderFacilityCardHtml(item, cardCtx)}</div>`
      )
      .join('');

    const stats = computeFacilityStats(filtered);
    if (statCount) statCount.textContent = stats.count.toString();
    if (statCapacity) statCapacity.textContent = stats.capacity.toFixed(1);
    if (statOperational)
      statOperational.textContent = stats.operational.toString();
    if (statOperationalCap)
      statOperationalCap.textContent = stats.operationalCap.toFixed(1);
    if (statConstructionCap)
      statConstructionCap.textContent = stats.constructionCap.toFixed(1);

    if (noResults)
      noResults.style.display = stats.count === 0 ? 'block' : 'none';

    renderPagination(paged.page, paged.total, allItems);
    syncUrl(paged.page);
  };

  let latestRequestId = 0;

  const triggerLoadAndRender = async () => {
    const requestId = ++latestRequestId;
    try {
      const items = await loadListItems(listUrl);
      if (signal.aborted || requestId !== latestRequestId) return;
      render(items);
    } catch (error) {
      if (!signal.aborted) {
        console.warn(
          'Facility list payload could not be loaded; keeping SSR cards.',
          error
        );
      }
    }
  };

  const prefetchList = () => {
    if (signal.aborted) return;
    loadListItems(listUrl).catch((error) => {
      if (!signal.aborted) {
        console.warn('Facility list prefetch failed.', error);
      }
    });
  };

  const onFilterChange = () => {
    state.q = searchInput?.value ?? '';
    state.country = countryFilter?.value ?? '';
    state.status = statusFilter?.value ?? '';
    state.sector = sectorFilter?.value ?? '';
    state.type = typeFilter?.value ?? '';
    state.sort = sortSelect?.value || 'default';
    state.page = 1;
    void triggerLoadAndRender();
  };

  applyStateToControls();

  const controls = [
    searchInput,
    countryFilter,
    statusFilter,
    sectorFilter,
    typeFilter,
    sortSelect,
  ].filter((el): el is HTMLInputElement | HTMLSelectElement => Boolean(el));

  controls.forEach((el) => {
    el.addEventListener('input', onFilterChange, { signal });
    el.addEventListener('change', onFilterChange, { signal });
    el.addEventListener('focusin', prefetchList, { once: true, signal });
    el.addEventListener('pointerdown', prefetchList, { once: true, signal });
  });

  if (hasActiveQuery) {
    void triggerLoadAndRender();
  } else if ('requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(() => prefetchList(), {
      timeout: 2000,
    });
    signal.addEventListener('abort', () => window.cancelIdleCallback(idleId), {
      once: true,
    });
  } else {
    const timerId = globalThis.setTimeout(prefetchList, 800);
    signal.addEventListener('abort', () => globalThis.clearTimeout(timerId), {
      once: true,
    });
  }
}

export function mountFacilitiesIndex(): void {
  if (typeof document === 'undefined') return;
  const globalListState = globalThis as {
    __ccusFacilitiesIndexEventsBound?: boolean;
  };
  if (!globalListState.__ccusFacilitiesIndexEventsBound) {
    document.addEventListener('astro:before-swap', () => {
      abortCurrent?.abort();
      abortCurrent = null;
    });
    document.addEventListener('astro:page-load', setupFacilityFiltering);
    globalListState.__ccusFacilitiesIndexEventsBound = true;
  }
  setupFacilityFiltering();
}

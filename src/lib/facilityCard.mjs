/**
 * facilityCard.mjs
 *
 * Single source of truth for the facility card markup. Both the server
 * (FacilityCard.astro via `set:html`) and the client-side directory filter
 * (FacilitiesIndex.astro) render through this function, so a card looks
 * identical whether it arrives server-rendered or is re-rendered after a
 * filter/sort/pagination change.
 *
 * No Astro imports: pure string output, safe to bundle for the browser and
 * to unit test in Node. The caller injects `base`, `lang`, `t` and `tp`
 * (positional pair) so i18n stays in one place.
 */

const STATUS_COLORS = Object.freeze({
  运行中: 'bg-emerald-500',
  Operational: 'bg-emerald-500',
  计划中: 'bg-blue-500',
  Planned: 'bg-blue-500',
  开发中: 'bg-blue-400',
  'Under Development': 'bg-blue-400',
  'Under construction': 'bg-amber-500',
  建设中: 'bg-amber-500',
});

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) => HTML_ENTITIES[char] || char
  );
}

export function facilityCardViewModel(item = {}) {
  const estimatedCapacity = Number(item?.estimatedCapacity) || 0;
  const announcedCapacityMax = Number(item?.announcedCapacityMax) || 0;
  return {
    name: item?.name ?? '',
    country: item?.country ?? '',
    region: item?.region ?? '',
    type: item?.type ?? '',
    status: item?.status ?? '',
    sector: item?.sector ?? '',
    precision: item?.precision ?? '',
    phase: item?.phase ?? '',
    displayCapacity: estimatedCapacity || announcedCapacityMax || 0,
    isAnnounced: announcedCapacityMax > 0 && !estimatedCapacity,
  };
}

export function renderFacilityCardHtml(item, ctx = {}) {
  const { base = '', lang = 'zh', t = (key) => key, tp = (zh) => zh } = ctx;
  const isEn = lang === 'en';
  const vm = facilityCardViewModel(item);
  const detailHref = `${base}/${isEn ? 'en/facilities' : 'facilities'}/${item?.id ?? ''}/`;
  const statusColor = STATUS_COLORS[vm.status] || 'bg-slate-400';
  const locationLabel = t('facility.card.location');
  const capacityLabel = t('facility.card.capacity');
  const typeLabel = t('facility.card.type');
  const industryLabel = t('facility.card.industry');
  const viewLabel = tp('查看 ', 'View ');

  const phaseBadge = vm.phase
    ? `<span class="rounded-md bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">${escapeHtml(vm.phase)}</span>`
    : '';

  const approximateIcon =
    vm.precision === 'approximate'
      ? `<span class="shrink-0 text-amber-600 dark:text-amber-400" title="${escapeHtml(locationLabel)}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4"></path><path d="M12 17h.01"></path><path d="m3.34 19 8.66-15 8.66 15H3.34Z"></path></svg></span>`
      : '';

  const regionRow = vm.region
    ? `<span aria-hidden="true" class="text-slate-300 dark:text-slate-700">/</span><span class="truncate">${escapeHtml(vm.region)}</span>`
    : '';

  const announcedDot = vm.isAnnounced
    ? `<span class="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Announced Value"></span>`
    : '';

  return `<div class="group relative h-full">
  <article class="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-teal-500/60 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
    <div class="mb-5 flex items-start justify-between gap-3">
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <span class="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <span class="h-2 w-2 rounded-full ${statusColor}"></span>
          ${escapeHtml(vm.status)}
        </span>
        ${phaseBadge}
      </div>
      ${approximateIcon}
    </div>

    <h3 class="mb-2 line-clamp-2 text-xl font-bold leading-snug text-slate-900 transition-colors group-hover:text-teal-700 dark:text-white dark:group-hover:text-teal-300">
      <a href="${detailHref}">${escapeHtml(vm.name)}</a>
    </h3>

    <div class="mb-5 flex min-h-5 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <span class="font-semibold text-slate-700 dark:text-slate-300">${escapeHtml(vm.country)}</span>
      ${regionRow}
    </div>

    <div class="mb-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 dark:border-slate-800">
      <div>
        <div class="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
          ${escapeHtml(capacityLabel)}
          ${announcedDot}
        </div>
        <div class="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
          ${vm.displayCapacity}
          <span class="ml-1 text-[10px] font-semibold text-slate-400">Mtpa</span>
        </div>
      </div>
      <div>
        <div class="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
          ${escapeHtml(typeLabel)}
        </div>
        <div class="truncate text-xs font-semibold text-teal-700 dark:text-teal-300">
          ${escapeHtml(vm.type)}
        </div>
      </div>
    </div>

    <div class="mt-auto flex items-end justify-between gap-4">
      <div class="min-w-0">
        <div class="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
          ${escapeHtml(industryLabel)}
        </div>
        <div class="mt-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
          ${escapeHtml(vm.sector || 'General')}
        </div>
      </div>
      <a href="${detailHref}" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition-all group-hover:border-teal-700 group-hover:bg-teal-700 group-hover:text-white dark:border-slate-700 dark:bg-slate-800" aria-label="${escapeHtml(viewLabel + vm.name)}">
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="m9 18 6-6-6-6"></path>
        </svg>
      </a>
    </div>
  </article>
</div>`;
}

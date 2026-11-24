import type * as Leaflet from 'leaflet';
import { t as translateUi } from '../i18n/ui.ts';
import type { UiKey } from '../i18n/ui.ts';
import { fetchCachedJson } from '../lib/cachedJsonFetch.ts';
import { hasRenderableCoordinates } from '../lib/dataIndexCore.mjs';
import { escapeHtml } from '../lib/html.mjs';

export interface MapFacility {
  id: string | number;
  name: string;
  coordinates: [number, number] | null;
  precision: string;
  status: string;
  estimatedCapacity: number | null;
  announcedCapacityMax: number | null;
  type: string;
}

export type MarkerStatusCategory =
  | 'operational'
  | 'construction'
  | 'planned'
  | 'inactive';

let activeMapObserver: IntersectionObserver | null = null;

export function classifyFacilityMarkerStatus(status: string): {
  color: string;
  category: MarkerStatusCategory;
} {
  if (status === '运行中' || status === 'Operational') {
    return { color: '#10b981', category: 'operational' };
  }
  if (status === '建设中' || status === 'Under construction') {
    return { color: '#f97316', category: 'construction' };
  }
  if (status === '计划中' || status === 'Planned') {
    return { color: '#3b82f6', category: 'planned' };
  }
  return { color: '#94a3b8', category: 'inactive' };
}

export function markerVisualStyle(precision: string): {
  opacity: number;
  borderWidth: string;
} {
  const opacity =
    precision === 'exact' ? 1.0 : precision === 'state' ? 0.7 : 0.4;
  const borderWidth = precision === 'exact' ? '2.5px' : '1.5px';
  return { opacity, borderWidth };
}

export function getEsriTileUrl(dark: boolean): string {
  return dark
    ? 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    : 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
}

export function renderMapErrorHtml(
  title: string,
  note: string,
  actionLabel: string,
  actionHref: string
): string {
  const safeTitle = escapeHtml(title);
  const safeNote = escapeHtml(note);
  const safeActionLabel = escapeHtml(actionLabel);
  const safeActionHref = escapeHtml(actionHref);
  return `
      <div class="flex flex-col items-center justify-center h-full min-h-[320px] gap-3 text-center p-8">
        <div class="text-2xl" aria-hidden="true">⚠️</div>
        <p class="font-bold text-slate-900 dark:text-white">${safeTitle}</p>
        ${safeNote ? `<p class="text-sm text-slate-500 dark:text-slate-400">${safeNote}</p>` : ''}
        <a
          href="${safeActionHref}"
          class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500 transition-colors"
        >
          ${safeActionLabel}
        </a>
      </div>`;
}

export function renderFacilityPopupHtml(
  facility: MapFacility,
  opts: { directoryHref: string; t: (key: UiKey) => string }
): string {
  const { directoryHref, t } = opts;
  const displayCap =
    facility.estimatedCapacity || facility.announcedCapacityMax || 0;
  const safeName = escapeHtml(facility.name);
  const safeType = escapeHtml(facility.type);
  const safeStatus = escapeHtml(facility.status);
  const safeId = encodeURIComponent(String(facility.id));
  const safeDirectoryHref = escapeHtml(directoryHref);

  const safePrecision = escapeHtml(facility.precision);
  const precisionValue =
    safePrecision === 'exact'
      ? t('map.popup.precision.exact')
      : safePrecision === 'state'
        ? t('map.popup.precision.state')
        : t('map.popup.precision.country');
  const precisionLabel = escapeHtml(
    `${t('map.popup.precision.label')}: ${precisionValue}`
  );
  const detailsLabel = escapeHtml(t('map.popup.details'));

  return `
        <div class="p-1 min-w-[180px]">
          <div class="flex justify-between items-start mb-1">
            <div class="text-[9px] font-black text-blue-600 uppercase">${safeType}</div>
            <div class="text-[8px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded">${precisionLabel}</div>
          </div>
          <div class="text-sm font-black text-slate-900 dark:text-white mb-2">${safeName}</div>
          <div class="text-xs font-bold text-slate-500">${displayCap} Mtpa | ${safeStatus}</div>
          <a href="${safeDirectoryHref}${safeId}/" class="block mt-3 text-center py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase rounded-lg transition-transform hover:scale-[1.02]">${detailsLabel}</a>
        </div>
      `;
}

export async function initFacilityMap(): Promise<void> {
  const mapShell = document.querySelector(
    '.facility-map-container'
  ) as HTMLElement | null;
  const mapNode = document.getElementById('map');
  if (
    !mapShell ||
    !mapNode ||
    mapNode.dataset.mapReady === '1' ||
    mapNode.dataset.mapLoading === '1'
  ) {
    return;
  }

  mapNode.dataset.mapLoading = '1';

  const mapDiv = mapNode as HTMLElement & { _leaflet_id?: unknown };
  if (mapDiv._leaflet_id && !mapNode.dataset.mapReady) {
    delete mapDiv._leaflet_id;
    mapNode.innerHTML = '';
  }

  const lang = mapShell.dataset.lang === 'en' ? 'en' : 'zh';
  const isEn = lang === 'en';
  const siteBase = (mapShell.dataset.siteBase || '').replace(/\/$/, '');
  const mapUrl =
    mapShell.dataset.mapUrl || `${siteBase}/api/facilities-map.${lang}.json`;
  const directoryHref = `${siteBase}/${isEn ? 'en/facilities' : 'facilities'}/`;
  const t = (key: UiKey) => translateUi(lang, key);

  try {
    const payloadPromise = fetchCachedJson<unknown>(mapUrl)
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error('Facility map payload is not an array.');
        }
        return { ok: true as const, items: data as MapFacility[] };
      })
      .catch((parseError) => {
        console.warn(
          'Facility map payload could not be loaded; rendering an error state.',
          parseError
        );
        return { ok: false as const, items: [] as MapFacility[] };
      });

    const [leafletModule, payloadResult] = await Promise.all([
      import('leaflet'),
      payloadPromise,
    ]);

    if (!document.body.contains(mapNode)) return;

    if (!payloadResult.ok) {
      mapShell.innerHTML = renderMapErrorHtml(
        t('map.error.title'),
        t('map.error.note'),
        t('map.error.action'),
        directoryHref
      );
      return;
    }

    const mapFacilities = payloadResult.items;
    const L = leafletModule.default;
    (window as unknown as { L: typeof L }).L = L;

    try {
      await import('leaflet.markercluster');
    } catch (pluginError) {
      console.warn(
        'Leaflet markercluster failed to load; falling back to plain markers.',
        pluginError
      );
    }

    const map = L.map(mapNode, {
      center: [30, 10],
      zoom: 3,
      zoomControl: false,
      preferCanvas: true,
    });

    L.control.zoom({ position: 'topleft' }).addTo(map);

    const isDark = document.documentElement.classList.contains('dark');
    let currentTileLayer = L.tileLayer(getEsriTileUrl(isDark), {
      maxZoom: 16,
      minZoom: 2,
      attribution:
        'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, FAO, NOAA, USGS',
    }).addTo(map);

    const handleThemeChange = (event: Event) => {
      const customEv = event as CustomEvent<{ resolved: string }>;
      const nextDark = customEv?.detail?.resolved
        ? customEv.detail.resolved === 'dark'
        : document.documentElement.classList.contains('dark');
      const nextUrl = getEsriTileUrl(nextDark);
      map.removeLayer(currentTileLayer);
      currentTileLayer = L.tileLayer(nextUrl, {
        maxZoom: 16,
        minZoom: 2,
        attribution:
          'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, FAO, NOAA, USGS',
      }).addTo(map);
    };

    const winWithHandler = window as unknown as {
      __ccusMapThemeHandler?: EventListener;
    };
    if (winWithHandler.__ccusMapThemeHandler) {
      window.removeEventListener(
        'ccus:themechange',
        winWithHandler.__ccusMapThemeHandler
      );
    }
    winWithHandler.__ccusMapThemeHandler = handleThemeChange as EventListener;
    window.addEventListener('ccus:themechange', handleThemeChange);

    document.addEventListener(
      'astro:before-swap',
      () => {
        window.removeEventListener('ccus:themechange', handleThemeChange);
        delete winWithHandler.__ccusMapThemeHandler;
        map.remove();
      },
      { once: true }
    );

    const markers: Leaflet.MarkerClusterGroup | Leaflet.LayerGroup =
      typeof L.markerClusterGroup === 'function'
        ? L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 40,
            spiderfyOnMaxZoom: true,
            chunkedLoading: true,
            chunkDelay: 40,
            chunkInterval: 200,
            iconCreateFunction: (cluster) =>
              L.divIcon({
                html: `<div class="facility-map-cluster">${cluster.getChildCount()}</div>`,
                className: 'custom-cluster-icon',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              }),
          })
        : L.layerGroup();

    const addMarkers = (
      group: Leaflet.MarkerClusterGroup | Leaflet.LayerGroup,
      items: Leaflet.Marker[]
    ) => {
      if ('addLayers' in group) group.addLayers(items);
      else items.forEach((m) => group.addLayer(m));
    };
    const removeMarkers = (
      group: Leaflet.MarkerClusterGroup | Leaflet.LayerGroup,
      items: Leaflet.Marker[]
    ) => {
      if ('removeLayers' in group) group.removeLayers(items);
      else items.forEach((m) => group.removeLayer(m));
    };

    const filterState: Record<MarkerStatusCategory, boolean> = {
      operational: true,
      construction: true,
      planned: true,
      inactive: true,
    };

    const allMarkers: Leaflet.Marker[] = [];
    const markerBounds: Leaflet.LatLngTuple[] = [];
    const categoryToMarkers: Record<MarkerStatusCategory, Leaflet.Marker[]> = {
      operational: [],
      construction: [],
      planned: [],
      inactive: [],
    };

    mapFacilities.forEach((facility) => {
      const { coordinates, precision, status } = facility;
      if (
        !Array.isArray(coordinates) ||
        !hasRenderableCoordinates(coordinates)
      ) {
        return;
      }

      const { color, category } = classifyFacilityMarkerStatus(status);
      const { opacity, borderWidth } = markerVisualStyle(precision);
      const lat = Number(coordinates[0]);
      const lng = Number(coordinates[1]);
      const latLng: Leaflet.LatLngTuple = [lat, lng];

      const marker = L.marker(latLng, {
        icon: L.divIcon({
          html: `<div class="facility-map-marker" style="background-color: ${color}; opacity: ${opacity}; border: ${borderWidth} solid #fff;"></div>`,
          className: 'custom-marker',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
      });

      marker.bindPopup(renderFacilityPopupHtml(facility, { directoryHref, t }));

      allMarkers.push(marker);
      categoryToMarkers[category].push(marker);
      markerBounds.push(latLng);
    });

    addMarkers(markers, allMarkers);

    // Filter Logic (scoped to mapShell)
    mapShell.querySelectorAll<HTMLElement>('.legend-item').forEach((button) => {
      button.addEventListener('click', () => {
        const category = (button.dataset.filter || '') as MarkerStatusCategory;
        if (!(category in filterState)) return;
        filterState[category] = !filterState[category];

        // UI Feedback
        button.classList.toggle('disabled', !filterState[category]);

        // Marker Update
        const targetMarkers = categoryToMarkers[category] || [];
        if (filterState[category]) {
          addMarkers(markers, targetMarkers);
        } else {
          removeMarkers(markers, targetMarkers);
        }
      });
    });

    map.addLayer(markers);
    requestAnimationFrame(() => {
      map.invalidateSize();
      if (markerBounds.length > 0) {
        map.fitBounds(markerBounds, {
          padding: [32, 32],
          maxZoom: 6,
        });
      }
    });
    mapNode.dataset.mapReady = '1';
  } catch (error) {
    console.error('Map Init Error:', error);
    mapNode.dataset.mapReady = '';
    mapShell.innerHTML = renderMapErrorHtml(
      t('map.error.fail'),
      '',
      t('map.error.action'),
      directoryHref
    );
  } finally {
    mapNode.dataset.mapLoading = '';
    const loader = document.getElementById('map-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => (loader.style.display = 'none'), 500);
    }
  }
}

export function setupFacilityMap(): void {
  const mapShell = document.querySelector('.facility-map-container');
  if (!mapShell || mapShell.getAttribute('data-map-observed') === '1') {
    return;
  }

  mapShell.setAttribute('data-map-observed', '1');

  const start = () => {
    void initFacilityMap();
  };

  if (!('IntersectionObserver' in window)) {
    start();
    return;
  }

  activeMapObserver?.disconnect();
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        if (activeMapObserver === observer) activeMapObserver = null;
        start();
      }
    },
    { rootMargin: '200px 0px' }
  );
  activeMapObserver = observer;
  observer.observe(mapShell);
}

export function mountFacilityMap(): void {
  if (typeof document === 'undefined') return;
  const globalMapState = globalThis as {
    __ccusFacilityMapEventsBound?: boolean;
  };
  if (!globalMapState.__ccusFacilityMapEventsBound) {
    document.addEventListener('astro:before-swap', () => {
      activeMapObserver?.disconnect();
      activeMapObserver = null;
    });
    document.addEventListener('astro:page-load', setupFacilityMap);
    globalMapState.__ccusFacilityMapEventsBound = true;
  }
  setupFacilityMap();
}

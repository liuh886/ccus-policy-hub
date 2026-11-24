// Bundled from npm (versioned in package.json) instead of an unversioned CDN
// tag. Chart stays in module scope — no window globals; View Transitions
// lifecycle cleanup runs via destroyCapacityTrend.
import {
  Chart,
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { t as translateUi } from '../i18n/ui.ts';
import type { UiKey } from '../i18n/ui.ts';
import { escapeHtml } from '../lib/html.mjs';

Chart.register(
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export interface CapacityPoint {
  year: number;
  operational: number;
  pipeline: number;
}

export interface CapacitySeries {
  operational: number[];
  pipeline: number[];
}

export function combineCapacitySeries(
  allSeries: CapacityPoint[],
  typeSeries: Record<string, CapacityPoint[]>,
  selectedTypes: string[],
  totalTypeCount: number
): CapacitySeries {
  if (selectedTypes.length === totalTypeCount) {
    return {
      operational: allSeries.map((point) => Number(point.operational || 0)),
      pipeline: allSeries.map((point) => Number(point.pipeline || 0)),
    };
  }

  const operational = allSeries.map(() => 0);
  const pipeline = allSeries.map(() => 0);

  for (const typeId of selectedTypes) {
    const points = typeSeries[typeId] || [];
    points.forEach((point, index) => {
      if (index < operational.length) {
        operational[index] += Number(point.operational || 0);
        pipeline[index] += Number(point.pipeline || 0);
      }
    });
  }

  return { operational, pipeline };
}

export function clampYearRange(
  min: number,
  max: number,
  moved: 'min' | 'max' | null
): { min: number; max: number } {
  let nextMin = min;
  let nextMax = max;

  if (nextMin >= nextMax) {
    if (moved === 'min') {
      nextMin = nextMax - 1;
    } else {
      nextMax = nextMin + 1;
    }
  }

  return { min: nextMin, max: nextMax };
}

export function computeSliderTrackPercent(
  min: number,
  max: number,
  startYear: number,
  endYear: number
): { leftPercent: number; widthPercent: number } {
  const span = endYear - startYear;
  if (span <= 0) {
    return { leftPercent: 0, widthPercent: 0 };
  }
  const clampPct = (value: number) => Math.min(100, Math.max(0, value));
  const leftPercent = clampPct(((min - startYear) / span) * 100);
  const rightPercent = clampPct(((max - startYear) / span) * 100);
  return {
    leftPercent,
    widthPercent: Math.max(0, rightPercent - leftPercent),
  };
}

export function resolveYearIndex(labels: number[], year: number): number {
  const index = labels.findIndex((label) => Number(label) === Number(year));
  return index >= 0 ? index : labels.length - 1;
}

export function renderCapacityErrorHtml(opts: {
  title: string;
  note: string;
  actionLabel: string;
  facilitiesHref: string;
}): string {
  const safeTitle = escapeHtml(opts.title);
  const safeNote = escapeHtml(opts.note);
  const safeActionLabel = escapeHtml(opts.actionLabel);
  const safeHref = escapeHtml(opts.facilitiesHref);
  return `
        <div class="flex flex-col items-center justify-center h-full min-h-[280px] gap-3 text-center p-8">
          <div class="text-2xl" aria-hidden="true">⚠️</div>
          <p class="font-bold text-slate-900 dark:text-white">
            ${safeTitle}
          </p>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            ${safeNote}
          </p>
          <a
            href="${safeHref}"
            class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500 transition-colors"
          >
            ${safeActionLabel}
          </a>
        </div>`;
}

export function initCapacityTrend(): void {
  const canvas = document.getElementById(
    'capacityChart'
  ) as HTMLCanvasElement | null;
  if (!canvas) return;
  // Both window.load and astro:page-load can fire on the initial visit.
  // Replacing an existing chart leaves filter listeners pointing at a
  // destroyed instance, so initialise each live canvas only once.
  if (Chart.getChart(canvas)) return;

  const root = canvas.closest('[data-capacity-trend]') || document;
  const minSlider = root.querySelector(
    '#minYearSlider'
  ) as HTMLInputElement | null;
  const maxSlider = root.querySelector(
    '#maxYearSlider'
  ) as HTMLInputElement | null;
  const trackHighlight = root.querySelector(
    '#sliderTrackHighlight'
  ) as HTMLElement | null;
  const yearMinVal = root.querySelector('#yearMinVal') as HTMLElement | null;
  const yearMaxVal = root.querySelector('#yearMaxVal') as HTMLElement | null;
  const subtitleMaxYear = root.querySelector(
    '[data-capacity-subtitle-max]'
  ) as HTMLElement | null;
  const totalValue = root.querySelector(
    '[data-capacity-total]'
  ) as HTMLElement | null;
  const totalYear = root.querySelector(
    '[data-capacity-total-year]'
  ) as HTMLElement | null;
  const typeCheckboxes = Array.from(
    root.querySelectorAll('[data-capacity-type]')
  ) as HTMLInputElement[];

  try {
    const allSeries = JSON.parse(
      canvas.dataset.values || '[]'
    ) as CapacityPoint[];
    const typeSeries = JSON.parse(canvas.dataset.typeSeries || '{}') as Record<
      string,
      CapacityPoint[]
    >;
    if (allSeries.length === 0) return;

    const labels = allSeries.map((point) => point.year);
    const defaultMinYear = Number(canvas.dataset.defaultMinYear || 1990);
    const defaultMaxYear = Number(canvas.dataset.defaultMaxYear || 2030);
    const startYear = Number(canvas.dataset.startYear || 1970);
    const endYear = Number(canvas.dataset.endYear || 2040);
    const yearSuffix = canvas.dataset.yearSuffix || ' Est.';

    const selectedTypeIds = () =>
      typeCheckboxes
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);

    const combineSelectedSeries = () =>
      combineCapacitySeries(
        allSeries,
        typeSeries,
        selectedTypeIds(),
        typeCheckboxes.length
      );

    const currentMaxYear = () =>
      maxSlider ? Number.parseInt(maxSlider.value, 10) : defaultMaxYear;

    const updateTotalDisplay = (series: CapacitySeries, maxYear?: number) => {
      const activeYear = maxYear || currentMaxYear();
      const activePipeline =
        series.pipeline[resolveYearIndex(labels, activeYear)] || 0;
      const formattedTotal = Number(activePipeline).toFixed(1);

      if (totalValue) totalValue.textContent = formattedTotal;
      if (totalYear) totalYear.textContent = `(${activeYear}${yearSuffix})`;
      if (subtitleMaxYear) subtitleMaxYear.textContent = String(activeYear);

      if (root instanceof HTMLElement) {
        root.dataset.capacityTotal = formattedTotal;
        root.dataset.capacityYear = String(activeYear);
      }
      root.dispatchEvent(
        new CustomEvent<{ total: number; year: number }>(
          'ccus:capacity-summary-change',
          {
            bubbles: true,
            detail: {
              total: Number(formattedTotal),
              year: activeYear,
            },
          }
        )
      );
    };

    const initialSeries = combineSelectedSeries();
    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: canvas.dataset.labelOp,
            data: initialSeries.operational,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 4,
            pointRadius: 0,
            pointHoverRadius: 6,
            spanGaps: false,
          },
          {
            label: canvas.dataset.labelPipe,
            data: initialSeries.pipeline,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            fill: true,
            tension: 0.3,
            borderWidth: 4,
            pointRadius: 0,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: { boxWidth: 12, usePointStyle: true, font: { size: 10 } },
          },
          tooltip: {
            padding: 10,
            backgroundColor: '#0f172a',
            callbacks: {
              label(context) {
                const value = Number(context.parsed.y || 0).toFixed(1);
                return `${context.dataset.label}: ${value} Mtpa`;
              },
            },
          },
        },
        scales: {
          x: {
            min: defaultMinYear,
            max: defaultMaxYear,
            grid: { display: false },
            ticks: { font: { size: 10 }, color: '#94a3b8', maxTicksLimit: 10 },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: {
              font: { size: 10 },
              color: '#94a3b8',
              callback(value: string | number) {
                return Number(value).toFixed(0);
              },
            },
          },
        },
      },
    });

    const updateFilteredSeries = () => {
      const nextSeries = combineSelectedSeries();
      chart.data.datasets[0].data = nextSeries.operational;
      chart.data.datasets[1].data = nextSeries.pipeline;
      updateTotalDisplay(nextSeries);
      chart.update();
    };

    const activateRangeThumb = (target: EventTarget | null) => {
      if (!minSlider || !maxSlider) return;
      minSlider.style.zIndex = target === minSlider ? '34' : '31';
      maxSlider.style.zIndex = target === maxSlider ? '34' : '32';
    };

    const updateSliderUI = (event?: Event) => {
      if (!minSlider || !maxSlider) return;

      const rawMin = Number.parseInt(minSlider.value, 10);
      const rawMax = Number.parseInt(maxSlider.value, 10);
      const moved: 'min' | 'max' | null =
        event?.target === minSlider
          ? 'min'
          : event?.target === maxSlider
            ? 'max'
            : null;
      const { min, max } = clampYearRange(rawMin, rawMax, moved);

      if (min !== rawMin) minSlider.value = String(min);
      if (max !== rawMax) maxSlider.value = String(max);

      const { leftPercent, widthPercent } = computeSliderTrackPercent(
        min,
        max,
        startYear,
        endYear
      );

      if (trackHighlight) {
        trackHighlight.style.left = `${leftPercent}%`;
        trackHighlight.style.width = `${widthPercent}%`;
      }

      if (yearMinVal) yearMinVal.textContent = String(min);
      if (yearMaxVal) yearMaxVal.textContent = String(max);

      activateRangeThumb(event?.target ?? null);

      const scales = chart.options.scales;
      if (scales?.x) {
        scales.x.min = min;
        scales.x.max = max;
      }
      updateTotalDisplay(combineSelectedSeries(), max);
      chart.update('none');
    };

    typeCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', updateFilteredSeries);
    });

    if (minSlider && maxSlider) {
      const handleThumbPointerDown = (event: PointerEvent) => {
        activateRangeThumb(event.target);
      };
      minSlider.addEventListener('pointerdown', handleThumbPointerDown);
      maxSlider.addEventListener('pointerdown', handleThumbPointerDown);
      minSlider.addEventListener('input', updateSliderUI);
      maxSlider.addEventListener('input', updateSliderUI);
      minSlider.addEventListener('focus', updateSliderUI);
      maxSlider.addEventListener('focus', updateSliderUI);
      updateSliderUI();
    } else {
      updateTotalDisplay(initialSeries, defaultMaxYear);
    }
  } catch (error) {
    console.error('Failed to init capacity chart:', error);
    const shell = document.getElementById('capacityChartShell');
    if (shell) {
      const base = (canvas.dataset.base || '').replace(/\/$/, '');
      const isEn = document.documentElement.lang === 'en';
      const t = (key: UiKey) => translateUi(isEn ? 'en' : 'zh', key);
      shell.innerHTML = renderCapacityErrorHtml({
        title: canvas.dataset.errorTitle || t('capacity.error.title'),
        note: canvas.dataset.errorNote || '',
        actionLabel: canvas.dataset.errorAction || t('capacity.error.action'),
        facilitiesHref: `${base}/${isEn ? 'en/facilities' : 'facilities'}/`,
      });
    }
  }
}

export function destroyCapacityTrend(): void {
  const canvas = document.getElementById(
    'capacityChart'
  ) as HTMLCanvasElement | null;
  if (canvas) Chart.getChart(canvas)?.destroy();
}

export function mountCapacityTrend(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const globalTrendState = globalThis as {
    __ccusCapacityTrendEventsBound?: boolean;
  };
  if (!globalTrendState.__ccusCapacityTrendEventsBound) {
    document.addEventListener('astro:page-load', initCapacityTrend);
    document.addEventListener('astro:before-swap', destroyCapacityTrend);
    globalTrendState.__ccusCapacityTrendEventsBound = true;
  }
  if (document.readyState === 'complete') {
    initCapacityTrend();
  } else {
    window.addEventListener('load', initCapacityTrend, { once: true });
  }
}

import {
  Chart as ChartJs,
  RadarController,
  ScatterController,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJs.register(
  RadarController,
  ScatterController,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

import {
  GOVERNANCE_DIMENSIONS,
  classifyGovernanceDeployment,
} from './governanceBenchmarking.mjs';
import {
  isPendingRegulatory,
  makeCountryComparator,
  rankByGovernance,
} from './comparePresentation.mjs';
import { governanceVisualsCopy as copy } from './governanceCopy.mjs';
import { escapeHtml } from './html.mjs';

const DEFAULT_HEATMAP_SORT = Object.freeze({ key: 'governance', dir: 'desc' });

function createInitialWorkspaceState() {
  return {
    profileChart: null,
    deploymentChart: null,
    selectedCountryKey: null,
    activeProfileView: null,
    currentState: null,
    heatmapSort: { ...DEFAULT_HEATMAP_SORT },
  };
}

export function preferredProfileView(countryCount) {
  return Number(countryCount) <= 3 ? 'radar' : 'heatmap';
}

export function heatmapOpacity(score) {
  const normalized = Math.min(100, Math.max(0, Number(score || 0)));
  return Number((0.08 + normalized * 0.0072).toFixed(3));
}

export function governanceAxisMinimum(countrySystems = [], benchmarks = {}) {
  const values = [
    Number(benchmarks.governance),
    ...countrySystems.map((country) => Number(country?.governance?.index)),
  ].filter(Number.isFinite);
  if (!values.length) return 30;
  const lowest = Math.min(...values);
  // Keep the axis floor close to the data so high-scoring comparisons do not
  // collapse into a single band at the top of the plot.
  if (lowest >= 70) return 70;
  if (lowest >= 50) return 50;
  if (lowest >= 30) return 30;
  return Math.max(0, Math.floor(lowest / 10) * 10);
}

const countryKey = (country) =>
  String(country.canonicalCountry || country.country);

const dimensionLabel = (text, dimension) => {
  const index = GOVERNANCE_DIMENSIONS.indexOf(dimension);
  return text.dimensionLabels[index] || dimension;
};

const matrixXOf = (country) =>
  Number(
    country?.deployment?.matrixX ?? country?.deployment?.committedCapacity ?? 0
  );

const quadrantLabel = (text, country, benchmarks) => {
  const quadrant = classifyGovernanceDeployment(
    country.governance.index,
    matrixXOf(country),
    benchmarks
  );
  return { quadrant, label: text.quadrant[quadrant] || quadrant };
};

const updateBenchmarkLabels = (benchmarks) => {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('[data-governance-benchmark]').forEach((node) => {
    node.textContent = Number(benchmarks.governance || 0).toFixed(1);
  });
  document.querySelectorAll('[data-deployment-benchmark]').forEach((node) => {
    node.textContent = `${Number(benchmarks.deployment || 0).toFixed(1)} Mtpa`;
  });
};

const formatCompact = (value) => Number(value || 0).toFixed(1);

/**
 * The governance axis is data-driven and may start above 0 so high scorers do
 * not collapse into a band at the top. Whenever the floor is non-zero the
 * plot is truncated, so surface that explicitly instead of silently rescaling.
 */
const updateAxisNote = (governanceMin, text) => {
  if (typeof document === 'undefined') return;
  const note = document.querySelector('[data-axis-note]');
  if (!note) return;
  const floor = Number(governanceMin || 0);
  if (floor > 0 && text.axisNote) {
    note.textContent = String(text.axisNote).replace('{min}', String(floor));
    note.classList.remove('is-hidden');
  } else {
    note.textContent = '';
    note.classList.add('is-hidden');
  }
};

const regulatoryClarityOf = (country, text) =>
  (text.regKeys || []).filter(
    ([, key]) => !isPendingRegulatory(country.regulatory?.[key])
  ).length;

const sortValueOf = (country, key, benchmarks, text) => {
  const dimensionIndex = GOVERNANCE_DIMENSIONS.indexOf(key);
  if (dimensionIndex >= 0) {
    return Number(country.governance.scores[dimensionIndex] || 0);
  }
  switch (key) {
    case 'policies':
      return Number(country.governance.policyCount || 0);
    case 'committed':
      return Number(country.deployment.committedCapacity || 0);
    case 'planned':
      return Number(country.deployment.plannedCapacity || 0);
    case 'regulatory':
      return regulatoryClarityOf(country, text);
    case 'quadrant':
      return quadrantLabel(text, country, benchmarks).label;
    default:
      return Number(country.governance.index || 0);
  }
};

const evidenceForCountry = (country, dimension, text, lang) => {
  const ui = copy[lang] || copy.zh;
  const selectedDimension = dimension || country.governance.strongestDimension;
  const profile = country.governance.dimensions[selectedDimension];
  const score = Number(profile?.score || 0);
  const contributors = profile?.contributors || [];

  const items = contributors.length
    ? contributors
        .map((policy) => {
          const analysis = policy.data.analysis?.[selectedDimension] || {};
          const evidence = analysis.evidence || ui.evidenceMissing;
          const citation = analysis.citation || policy.data.source || '';
          const verified = policy?.data?.reviewStatus === 'verified';
          const badge = `<span class="governance-evidence-badge ${verified ? 'is-verified' : 'is-draft'}">${escapeHtml(verified ? ui.verifiedBadge : ui.draftBadge)}</span>`;
          return `<article class="governance-evidence-item"><h3>${escapeHtml(policy.data.title || policy.id)} ${badge}</h3><p><strong>${ui.scoreEvidence}:</strong> ${escapeHtml(evidence)}</p>${citation ? `<p><strong>${ui.citation}:</strong> ${escapeHtml(citation)}</p>` : ''}<a href="${ui.policyPath}${encodeURIComponent(String(policy.id))}/">${ui.openPolicy}</a></article>`;
        })
        .join('')
    : `<p class="governance-evidence-empty">${ui.evidenceMissing}</p>`;

  return `<div class="governance-evidence-country"><strong>${escapeHtml(country.displayCountry)}</strong><span>${escapeHtml(dimensionLabel(text, selectedDimension))} · ${score.toFixed(0)}/100</span></div>${items}`;
};

const matrixBackdropPlugin = {
  id: 'governanceQuadrants',
  beforeDraw(chart, _args, options) {
    const { chartArea, ctx, scales } = chart;
    if (!chartArea || !options?.benchmarks) return;
    const splitX = scales.x.getPixelForValue(options.benchmarks.deployment);
    const splitY = scales.y.getPixelForValue(options.benchmarks.governance);
    const { left, right, top, bottom } = chartArea;

    ctx.save();
    ctx.fillStyle = 'rgba(8,59,102,0.045)';
    ctx.fillRect(
      left,
      top,
      Math.max(0, splitX - left),
      Math.max(0, splitY - top)
    );
    ctx.fillStyle = 'rgba(11,143,135,0.075)';
    ctx.fillRect(
      splitX,
      top,
      Math.max(0, right - splitX),
      Math.max(0, splitY - top)
    );
    ctx.fillStyle = 'rgba(100,116,139,0.04)';
    ctx.fillRect(
      left,
      splitY,
      Math.max(0, splitX - left),
      Math.max(0, bottom - splitY)
    );
    ctx.fillStyle = 'rgba(245,158,11,0.055)';
    ctx.fillRect(
      splitX,
      splitY,
      Math.max(0, right - splitX),
      Math.max(0, bottom - splitY)
    );

    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgba(71,85,105,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(splitX, top);
    ctx.lineTo(splitX, bottom);
    ctx.moveTo(left, splitY);
    ctx.lineTo(right, splitY);
    ctx.stroke();

    const labels = options.labels || {};
    ctx.setLineDash([]);
    ctx.fillStyle = document.documentElement.classList.contains('dark')
      ? 'rgba(226,232,240,0.58)'
      : 'rgba(51,65,85,0.62)';
    ctx.font = '700 10px Inter, sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(labels['policy-led'] || '', left + 10, top + 10);
    ctx.textAlign = 'right';
    ctx.fillText(labels['integrated-leaders'] || '', right - 10, top + 10);
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    ctx.fillText(labels['foundation-building'] || '', left + 10, bottom - 10);
    ctx.textAlign = 'right';
    ctx.fillText(labels['deployment-led'] || '', right - 10, bottom - 10);
    ctx.restore();
  },
  afterDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    const occupied = [];
    const offsets = [
      [12, -10],
      [12, 10],
      [-12, -10],
      [-12, 10],
      [0, -18],
    ];
    const overlaps = (left, right, top, bottom) =>
      occupied.some(
        (box) =>
          left < box.right &&
          right > box.left &&
          top < box.bottom &&
          bottom > box.top
      );

    ctx.save();
    ctx.font = '700 10px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    chart.data.datasets.forEach((dataset, index) => {
      const meta = chart.getDatasetMeta(index);
      const point = meta.data[0];
      if (!point) return;
      const label = String(dataset.label || '');
      const width = ctx.measureText(label).width;
      let placement = offsets[0];

      for (const candidate of offsets) {
        const [dx, dy] = candidate;
        const align = dx < 0 ? 'right' : dx > 0 ? 'left' : 'center';
        const x = point.x + dx;
        const left =
          align === 'right'
            ? x - width
            : align === 'center'
              ? x - width / 2
              : x;
        const right = left + width;
        const top = point.y + dy - 7;
        const bottom = point.y + dy + 7;
        const inside =
          left >= chartArea.left &&
          right <= chartArea.right &&
          top >= chartArea.top &&
          bottom <= chartArea.bottom;
        if (inside && !overlaps(left, right, top, bottom)) {
          placement = candidate;
          break;
        }
      }

      const [dx, dy] = placement;
      const align = dx < 0 ? 'right' : dx > 0 ? 'left' : 'center';
      const x = point.x + dx;
      const y = point.y + dy;
      const left =
        align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
      occupied.push({ left, right: left + width, top: y - 7, bottom: y + 7 });

      if (dy !== 0) {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x + dx * 0.72, point.y + dy * 0.72);
        ctx.strokeStyle = dataset.backgroundColor || '#64748b';
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.textAlign = align;
      ctx.fillStyle = document.documentElement.classList.contains('dark')
        ? '#cbd5e1'
        : '#334155';
      ctx.fillText(label, x, y);
    });
    ctx.restore();
  },
};

export function createGovernanceWorkspaceVisuals({ Chart = ChartJs } = {}) {
  // Sortable profile matrix, chart handles, selection, view toggle and active
  // data snapshot are scoped to this instance so View Transitions / clear()
  // can cleanly reset every field without leaking module-level state.
  let state = createInitialWorkspaceState();

  const orderCountries = (countrySystems, benchmarks, text) => {
    const rankMap = new Map(
      rankByGovernance(countrySystems).map((entry) => [
        countryKey(entry.country),
        entry.rank,
      ])
    );
    const ordered = [...countrySystems].sort(
      makeCountryComparator(
        (country) =>
          sortValueOf(country, state.heatmapSort.key, benchmarks, text),
        state.heatmapSort.dir
      )
    );
    return { ordered, rankMap };
  };

  const renderEvidence = (country, dimension) => {
    if (!state.currentState || !country || typeof document === 'undefined') {
      return;
    }
    const container = document.querySelector(
      '#governance-evidence-panel [data-evidence-content]'
    );
    if (!container) return;
    container.innerHTML = evidenceForCountry(
      country,
      dimension,
      state.currentState.text,
      state.currentState.lang
    );
  };

  const resetEvidence = () => {
    if (!state.currentState || typeof document === 'undefined') return;
    const container = document.querySelector(
      '#governance-evidence-panel [data-evidence-content]'
    );
    if (!container) return;
    const ui = copy[state.currentState.lang] || copy.zh;
    container.innerHTML = `<p class="governance-evidence-empty">${escapeHtml(ui.evidencePrompt)}</p>`;
  };

  const applyCrossSelection = () => {
    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-country-key]').forEach((node) => {
        const matches = node.dataset.countryKey === state.selectedCountryKey;
        node.classList.toggle(
          'is-selected',
          Boolean(state.selectedCountryKey && matches)
        );
        node.classList.toggle(
          'is-dimmed',
          Boolean(state.selectedCountryKey && !matches)
        );
      });
    }

    if (state.profileChart) {
      state.profileChart.data.datasets.forEach((dataset) => {
        const matches = dataset.countryKey === state.selectedCountryKey;
        dataset.borderWidth = state.selectedCountryKey
          ? matches
            ? 4
            : 1.5
          : 2.5;
        dataset.pointRadius = state.selectedCountryKey
          ? matches
            ? 5
            : 2
          : 3.5;
      });
      state.profileChart.update('none');
    }

    if (state.deploymentChart) {
      state.deploymentChart.data.datasets.forEach((dataset) => {
        const matches = dataset.countryKey === state.selectedCountryKey;
        dataset.pointRadius = state.selectedCountryKey ? (matches ? 11 : 5) : 8;
        dataset.pointHoverRadius = state.selectedCountryKey
          ? matches
            ? 13
            : 8
          : 11;
      });
      state.deploymentChart.update('none');
    }
  };

  function selectCountry(key, dimension) {
    if (!state.currentState) return;
    const nextKey = key || null;
    const shouldClear = state.selectedCountryKey === nextKey && !dimension;
    state.selectedCountryKey = shouldClear ? null : nextKey;
    const country = state.currentState.countrySystems.find(
      (item) => countryKey(item) === state.selectedCountryKey
    );
    if (country) renderEvidence(country, dimension);
    else resetEvidence();
    applyCrossSelection();
  }

  const renderRadarSummary = (countrySystems, benchmarks, text) => {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('governance-radar-summary');
    if (!container) return;
    const regTotal = (text.regKeys || []).length;
    const { ordered, rankMap } = orderCountries(
      countrySystems,
      benchmarks,
      text
    );
    container.innerHTML = ordered
      .map((country) => {
        const rank = rankMap.get(countryKey(country)) || 1;
        const clarity = regulatoryClarityOf(country, text);
        const { label: quadrant } = quadrantLabel(text, country, benchmarks);
        const rankBadge = `<span class="governance-rank-badge" aria-label="${escapeHtml(text.rankLabel)} #${rank}">#${rank}</span>`;
        return `<div class="radar-summary-row" data-country-key="${escapeHtml(countryKey(country))}"><span class="radar-summary-country"><i style="background-color:${country.color.border}"></i>${escapeHtml(country.displayCountry)}${rankBadge}</span><span><strong>${Number(country.governance.index).toFixed(1)}</strong>/100</span><span>${escapeHtml(text.colPolicies)} ${country.governance.policyCount}</span><span>${escapeHtml(text.colCommitted)} ${formatCompact(country.deployment.committedCapacity)}</span><span>${escapeHtml(text.colPlanned)} ${formatCompact(country.deployment.plannedCapacity)}</span><span>${escapeHtml(text.colRegulatory)} ${clarity}/${regTotal}</span><span class="radar-summary-quadrant">${escapeHtml(quadrant)}</span></div>`;
      })
      .join('');
  };

  const renderHeatmap = (countrySystems, benchmarks, text) => {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('governance-heatmap');
    if (!container) return;
    const shortLabels = text.dimensionShortLabels || text.dimensionLabels;

    const sortHeading = (label, key, ariaLabel, className = '') => {
      const active = state.heatmapSort.key === key;
      const ariaSort = active
        ? state.heatmapSort.dir === 'asc'
          ? 'ascending'
          : 'descending'
        : 'none';
      const caret = active ? (state.heatmapSort.dir === 'asc' ? '▲' : '▼') : '';
      return `<th scope="col" class="governance-heatmap-sortable ${className}" aria-sort="${ariaSort}"><button type="button" class="governance-heatmap-sort" data-sort="${key}" title="${escapeHtml(ariaLabel)}">${escapeHtml(label)}<span class="governance-sort-caret" aria-hidden="true">${caret}</span></button></th>`;
    };

    const headings = text.dimensionLabels
      .map((label, index) =>
        sortHeading(
          shortLabels[index] || label,
          GOVERNANCE_DIMENSIONS[index],
          label
        )
      )
      .join('');
    const summaryHeadings = [
      [text.colGovernance, 'governance'],
      [text.colPolicies, 'policies'],
      [text.colCommitted, 'committed'],
      [text.colPlanned, 'planned'],
      [text.colRegulatory, 'regulatory'],
      [text.colQuadrant, 'quadrant'],
    ]
      .map(([label, key]) =>
        sortHeading(label, key, label, 'governance-heatmap-summary-head')
      )
      .join('');

    const { ordered, rankMap } = orderCountries(
      countrySystems,
      benchmarks,
      text
    );
    const rows = ordered
      .map((country) => {
        const key = countryKey(country);
        const rank = rankMap.get(key) || 1;
        const rankBadge = `<span class="governance-rank-badge" aria-label="${escapeHtml(text.rankLabel)} #${rank}">#${rank}</span>`;
        const cells = GOVERNANCE_DIMENSIONS.map((dimension, index) => {
          const score = country.governance.scores[index] || 0;
          return `<td><button type="button" class="governance-heatmap-cell" data-country-key="${escapeHtml(key)}" data-evidence-country="${escapeHtml(key)}" data-evidence-dimension="${dimension}" style="background:rgba(11,143,135,${heatmapOpacity(score)})" aria-label="${escapeHtml(country.displayCountry)} ${escapeHtml(text.dimensionLabels[index])} ${Number(score).toFixed(0)}"><span>${Number(score).toFixed(0)}</span></button></td>`;
        }).join('');
        const clarity = regulatoryClarityOf(country, text);
        const { label: quadrant } = quadrantLabel(text, country, benchmarks);
        const summary = `<td class="governance-heatmap-index">${Number(country.governance.index).toFixed(1)}</td><td class="governance-heatmap-stat">${country.governance.policyCount}</td><td class="governance-heatmap-stat">${formatCompact(country.deployment.committedCapacity)}</td><td class="governance-heatmap-stat">${formatCompact(country.deployment.plannedCapacity)}</td><td class="governance-heatmap-stat">${clarity}/${(text.regKeys || []).length}</td><td class="governance-heatmap-quadrant">${escapeHtml(quadrant)}</td>`;
        return `<tr data-country-key="${escapeHtml(key)}"><th scope="row" class="governance-heatmap-country"><button type="button" class="governance-heatmap-country-button" data-evidence-country="${escapeHtml(key)}" aria-label="${escapeHtml(country.displayCountry)}">${escapeHtml(country.displayCountry)}</button>${rankBadge}</th>${cells}${summary}</tr>`;
      })
      .join('');

    container.innerHTML = `<table class="governance-heatmap-table"><thead><tr><th scope="col"></th>${headings}${summaryHeadings}</tr></thead><tbody>${rows}</tbody></table>`;

    container.querySelectorAll('[data-evidence-country]').forEach((button) => {
      button.addEventListener('click', () => {
        selectCountry(
          button.dataset.evidenceCountry,
          button.dataset.evidenceDimension
        );
      });
    });
    container.querySelectorAll('[data-sort]').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.sort;
        if (!key) return;
        state.heatmapSort = {
          key,
          dir:
            state.heatmapSort.key === key && state.heatmapSort.dir === 'desc'
              ? 'asc'
              : 'desc',
        };
        if (!state.currentState) return;
        renderHeatmap(
          state.currentState.countrySystems,
          state.currentState.benchmarks,
          state.currentState.text
        );
        renderRadarSummary(
          state.currentState.countrySystems,
          state.currentState.benchmarks,
          state.currentState.text
        );
      });
    });
  };

  const renderRadar = (countrySystems, benchmarks, text) => {
    if (typeof document === 'undefined') return;
    const canvas = document.getElementById('compare-radar-canvas');
    if (!canvas) return;
    (state.profileChart ?? Chart.getChart(canvas))?.destroy();

    state.profileChart = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: text.dimensionLabels,
        datasets: countrySystems.map((country) => ({
          label: country.displayCountry,
          countryKey: countryKey(country),
          data: country.governance.scores,
          borderColor: country.color.border,
          backgroundColor: country.color.bg,
          borderWidth: 2.5,
          pointRadius: 3.5,
          pointHoverRadius: 6,
          fill: true,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: true },
        onClick(_event, elements) {
          const element = elements[0];
          if (!element) return;
          const country = countrySystems[element.datasetIndex];
          const dimension = GOVERNANCE_DIMENSIONS[element.index];
          selectCountry(countryKey(country), dimension);
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, usePointStyle: true, font: { size: 10 } },
          },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.dataset.label}: ${Number(context.raw || 0).toFixed(0)}/100`;
              },
            },
          },
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { display: false, stepSize: 20 },
            grid: { color: 'rgba(100,116,139,0.16)' },
            angleLines: { color: 'rgba(100,116,139,0.16)' },
            pointLabels: { color: '#526570', font: { size: 10, weight: 650 } },
          },
        },
      },
    });

    renderRadarSummary(countrySystems, benchmarks, text);
  };

  const renderDeploymentMatrix = (
    countrySystems,
    benchmarks,
    text,
    includePlanned = false
  ) => {
    if (typeof document === 'undefined') return;
    const canvas = document.getElementById('maturity-matrix-canvas');
    if (!canvas) return;
    (state.deploymentChart ?? Chart.getChart(canvas))?.destroy();

    const maxCapacity = Math.max(
      Number(benchmarks.deployment || 0) * 1.35,
      ...countrySystems.map((country) => matrixXOf(country)),
      1
    );
    const governanceMin = governanceAxisMinimum(countrySystems, benchmarks);
    updateAxisNote(governanceMin, text);

    state.deploymentChart = new Chart(canvas, {
      type: 'scatter',
      plugins: [matrixBackdropPlugin],
      data: {
        datasets: countrySystems.map((country) => {
          const { quadrant } = quadrantLabel(text, country, benchmarks);
          return {
            label: country.displayCountry,
            countryKey: countryKey(country),
            data: [
              {
                x: matrixXOf(country),
                y: country.governance.index,
                quadrant,
                policyCount: country.governance.policyCount,
              },
            ],
            backgroundColor: country.color.border,
            borderColor: '#ffffff',
            borderWidth: 2,
            pointRadius: 8,
            pointHoverRadius: 11,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 48, top: 12 } },
        interaction: { mode: 'nearest', intersect: true },
        onClick(_event, elements) {
          const element = elements[0];
          if (!element) return;
          selectCountry(countryKey(countrySystems[element.datasetIndex]));
        },
        plugins: {
          governanceQuadrants: { benchmarks, labels: text.quadrant },
          legend: { display: false },
          tooltip: {
            callbacks: {
              title(items) {
                return items[0]?.dataset?.label || '';
              },
              label(context) {
                const point = context.raw || {};
                return [
                  text.quadrant[point.quadrant] || point.quadrant,
                  `${text.governance}: ${Number(point.y || 0).toFixed(1)}/100`,
                  `${text.deployment}: ${Number(point.x || 0).toFixed(1)} Mtpa`,
                  `${text.policyCount}: ${point.policyCount}${text.items}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            min: 0,
            suggestedMax: Math.ceil(maxCapacity * 1.15),
            title: {
              display: true,
              text: includePlanned ? text.xAxisPlanned : text.xAxis,
              font: { size: 10, weight: 700 },
            },
            grid: { color: 'rgba(148,163,184,0.12)' },
            ticks: { callback: (value) => Number(value).toFixed(0) },
          },
          y: {
            min: governanceMin,
            max: 100,
            title: {
              display: true,
              text: text.yAxis,
              font: { size: 10, weight: 700 },
            },
            grid: { color: 'rgba(148,163,184,0.12)' },
            ticks: { stepSize: 10 },
          },
        },
      },
    });
  };

  const setProfileView = (view) => {
    state.activeProfileView = view;
    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-profile-view]').forEach((button) => {
        button.classList.toggle(
          'is-active',
          button.dataset.profileView === view
        );
        button.setAttribute(
          'aria-pressed',
          String(button.dataset.profileView === view)
        );
      });
      document.querySelectorAll('[data-profile-visual]').forEach((panel) => {
        panel.classList.toggle('hidden', panel.dataset.profileVisual !== view);
      });
    }
    if (view === 'radar') state.profileChart?.resize();
  };

  const bindProfileViewControls = () => {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-profile-view]').forEach((button) => {
      button.onclick = () => setProfileView(button.dataset.profileView);
    });
  };

  const setMobilePanel = (panelName) => {
    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-governance-tab]').forEach((button) => {
        const active = button.dataset.governanceTab === panelName;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
      });
      document.querySelectorAll('[data-governance-panel]').forEach((panel) => {
        panel.classList.toggle(
          'is-mobile-active',
          panel.dataset.governancePanel === panelName
        );
      });
    }
    if (panelName === 'profile') state.profileChart?.resize();
    if (panelName === 'deployment') state.deploymentChart?.resize();
  };

  const bindMobileTabs = () => {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-governance-tab]').forEach((button) => {
      button.onclick = () => setMobilePanel(button.dataset.governanceTab);
    });
    setMobilePanel('profile');
  };

  function clear() {
    state.profileChart?.destroy();
    state.deploymentChart?.destroy();
    state = createInitialWorkspaceState();
    if (typeof document === 'undefined') return;
    const heatmap = document.getElementById('governance-heatmap');
    const radarSummary = document.getElementById('governance-radar-summary');
    if (heatmap) heatmap.innerHTML = '';
    if (radarSummary) radarSummary.innerHTML = '';
    document.querySelector('[data-benchmark-chip]')?.classList.add('is-hidden');
    const axisNote = document.querySelector('[data-axis-note]');
    if (axisNote) {
      axisNote.textContent = '';
      axisNote.classList.add('is-hidden');
    }
  }

  function render({
    countrySystems,
    benchmarks,
    text,
    lang = 'zh',
    includePlanned = false,
  }) {
    state.currentState = { countrySystems, benchmarks, text, lang };
    if (
      state.selectedCountryKey &&
      !countrySystems.some(
        (country) => countryKey(country) === state.selectedCountryKey
      )
    ) {
      state.selectedCountryKey = null;
    }

    renderRadar(countrySystems, benchmarks, text);
    renderHeatmap(countrySystems, benchmarks, text);
    renderDeploymentMatrix(countrySystems, benchmarks, text, includePlanned);
    updateBenchmarkLabels(benchmarks);
    if (typeof document !== 'undefined') {
      document
        .querySelector('[data-benchmark-chip]')
        ?.classList.remove('is-hidden');
    }

    bindProfileViewControls();
    bindMobileTabs();
    setProfileView(
      state.activeProfileView || preferredProfileView(countrySystems.length)
    );

    if (state.selectedCountryKey) {
      const country = countrySystems.find(
        (item) => countryKey(item) === state.selectedCountryKey
      );
      if (country) renderEvidence(country);
    }
    applyCrossSelection();
  }

  function getState() {
    return Object.freeze({
      profileChart: state.profileChart,
      deploymentChart: state.deploymentChart,
      selectedCountryKey: state.selectedCountryKey,
      activeProfileView: state.activeProfileView,
      currentState: state.currentState,
      heatmapSort: Object.freeze({ ...state.heatmapSort }),
    });
  }

  return { render, clear, getState };
}

const defaultWorkspace = createGovernanceWorkspaceVisuals();

export function clearGovernanceAnalytics() {
  return defaultWorkspace.clear();
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:before-swap', clearGovernanceAnalytics);
}

export function renderGovernanceAnalytics(options) {
  return defaultWorkspace.render(options);
}

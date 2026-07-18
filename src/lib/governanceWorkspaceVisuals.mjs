import Chart from 'chart.js/auto';

import {
  GOVERNANCE_DIMENSIONS,
  classifyGovernanceDeployment,
} from './governanceBenchmarking.mjs';

let profileChart = null;
let deploymentChart = null;
let selectedCountryKey = null;
let activeProfileView = null;
let currentState = null;

export function preferredProfileView(countryCount) {
  return Number(countryCount) <= 3 ? 'radar' : 'heatmap';
}

export function heatmapOpacity(score) {
  const normalized = Math.min(100, Math.max(0, Number(score || 0)));
  return Number((0.08 + normalized * 0.0072).toFixed(3));
}

const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] || character
  );

const copy = {
  zh: {
    governance: '治理能力',
    deployment: '已承诺项目记录规模',
    activePolicies: '现行政策',
    strongest: '优势维度',
    weakest: '主要短板',
    balanced: '治理结构',
    balancedGood: '较均衡',
    balancedUneven: '差异较大',
    scoreEvidence: '评分依据',
    sourcePolicy: '贡献政策',
    evidenceMissing: '该记录暂未提供结构化评分依据。',
    citation: '证据来源',
    openPolicy: '查看政策记录',
    policyPath: '/ccus-policy-hub/policy/',
  },
  en: {
    governance: 'Governance capability',
    deployment: 'Committed project-record scale',
    activePolicies: 'Active policies',
    strongest: 'Leading dimension',
    weakest: 'Main gap',
    balanced: 'Profile balance',
    balancedGood: 'Relatively balanced',
    balancedUneven: 'Uneven',
    scoreEvidence: 'Scoring evidence',
    sourcePolicy: 'Contributing policy',
    evidenceMissing:
      'No structured scoring evidence is available for this record.',
    citation: 'Evidence source',
    openPolicy: 'Open policy record',
    policyPath: '/ccus-policy-hub/en/policy/',
  },
};

const countryKey = (country) =>
  String(country.canonicalCountry || country.country);

const dimensionLabel = (text, dimension) => {
  const index = GOVERNANCE_DIMENSIONS.indexOf(dimension);
  return text.dimensionLabels[index] || dimension;
};

const quadrantLabel = (text, country, benchmarks) => {
  const quadrant = classifyGovernanceDeployment(
    country.governance.index,
    country.deployment.committedCapacity,
    benchmarks
  );
  return { quadrant, label: text.quadrant[quadrant] || quadrant };
};

const updateBenchmarkLabels = (benchmarks) => {
  document.querySelectorAll('[data-governance-benchmark]').forEach((node) => {
    node.textContent = Number(benchmarks.governance || 0).toFixed(1);
  });
  document.querySelectorAll('[data-deployment-benchmark]').forEach((node) => {
    node.textContent = `${Number(benchmarks.deployment || 0).toFixed(1)} Mtpa`;
  });
};

const renderHeatmap = (countrySystems, text) => {
  const container = document.getElementById('governance-heatmap');
  if (!container) return;

  const headings = text.dimensionLabels
    .map((label) => `<th scope="col">${escapeHtml(label)}</th>`)
    .join('');
  const rows = countrySystems
    .map((country) => {
      const key = countryKey(country);
      const cells = GOVERNANCE_DIMENSIONS.map((dimension, index) => {
        const score = country.governance.scores[index] || 0;
        return `<td><button type="button" class="governance-heatmap-cell" data-country-key="${escapeHtml(key)}" data-evidence-country="${escapeHtml(key)}" data-evidence-dimension="${dimension}" style="background:rgba(11,143,135,${heatmapOpacity(score)})" aria-label="${escapeHtml(country.displayCountry)} ${escapeHtml(text.dimensionLabels[index])} ${Number(score).toFixed(0)}"><span>${Number(score).toFixed(0)}</span></button></td>`;
      }).join('');
      return `<tr data-country-key="${escapeHtml(key)}"><th scope="row" class="governance-heatmap-country">${escapeHtml(country.displayCountry)}</th>${cells}</tr>`;
    })
    .join('');

  container.innerHTML = `<table class="governance-heatmap-table"><thead><tr><th scope="col"></th>${headings}</tr></thead><tbody>${rows}</tbody></table>`;

  container.querySelectorAll('[data-evidence-country]').forEach((button) => {
    button.addEventListener('click', () => {
      selectCountry(
        button.dataset.evidenceCountry,
        button.dataset.evidenceDimension
      );
    });
  });
};

const renderInsights = (countrySystems, benchmarks, text, lang) => {
  const container = document.getElementById('governance-insights');
  if (!container) return;
  const ui = copy[lang] || copy.zh;

  container.innerHTML = countrySystems
    .map((country) => {
      const key = countryKey(country);
      const { label } = quadrantLabel(text, country, benchmarks);
      const strongest = dimensionLabel(
        text,
        country.governance.strongestDimension
      );
      const weakest = dimensionLabel(text, country.governance.weakestDimension);
      const balance =
        country.governance.spread <= 25 ? ui.balancedGood : ui.balancedUneven;
      return `<button type="button" class="governance-insight-card" data-country-key="${escapeHtml(key)}" data-select-country="${escapeHtml(key)}"><div class="governance-insight-heading"><strong>${escapeHtml(country.displayCountry)}</strong><span>${escapeHtml(label)}</span></div><div class="governance-insight-metrics"><div><strong>${Number(country.governance.index).toFixed(1)}/100</strong>${ui.governance}</div><div><strong>${Number(country.deployment.committedCapacity).toFixed(1)} Mtpa</strong>${ui.deployment}</div><div><strong>${escapeHtml(strongest)}</strong>${ui.strongest}</div><div><strong>${escapeHtml(weakest)}</strong>${ui.weakest}</div><div><strong>${escapeHtml(balance)}</strong>${ui.balanced}</div><div><strong>${country.governance.policyCount}</strong>${ui.activePolicies}</div></div></button>`;
    })
    .join('');

  container.querySelectorAll('[data-select-country]').forEach((button) => {
    button.addEventListener('click', () => {
      selectCountry(button.dataset.selectCountry);
    });
  });
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
          return `<article class="governance-evidence-item"><h3>${escapeHtml(policy.data.title || policy.id)}</h3><p><strong>${ui.scoreEvidence}:</strong> ${escapeHtml(evidence)}</p>${citation ? `<p><strong>${ui.citation}:</strong> ${escapeHtml(citation)}</p>` : ''}<a href="${ui.policyPath}${encodeURIComponent(String(policy.id))}/">${ui.openPolicy}</a></article>`;
        })
        .join('')
    : `<p class="governance-evidence-empty">${ui.evidenceMissing}</p>`;

  return `<div class="governance-evidence-country"><strong>${escapeHtml(country.displayCountry)}</strong><span>${escapeHtml(dimensionLabel(text, selectedDimension))} · ${score.toFixed(0)}/100</span></div>${items}`;
};

const renderEvidence = (country, dimension) => {
  if (!currentState || !country) return;
  const container = document.querySelector(
    '#governance-evidence-panel [data-evidence-content]'
  );
  if (!container) return;
  container.innerHTML = evidenceForCountry(
    country,
    dimension,
    currentState.text,
    currentState.lang
  );
};

const applyCrossSelection = () => {
  document.querySelectorAll('[data-country-key]').forEach((node) => {
    const matches = node.dataset.countryKey === selectedCountryKey;
    node.classList.toggle(
      'is-selected',
      Boolean(selectedCountryKey && matches)
    );
    node.classList.toggle('is-dimmed', Boolean(selectedCountryKey && !matches));
  });

  if (profileChart) {
    profileChart.data.datasets.forEach((dataset) => {
      const matches = dataset.countryKey === selectedCountryKey;
      dataset.borderWidth = selectedCountryKey ? (matches ? 4 : 1.5) : 2.5;
      dataset.pointRadius = selectedCountryKey ? (matches ? 5 : 2) : 3.5;
    });
    profileChart.update('none');
  }

  if (deploymentChart) {
    deploymentChart.data.datasets.forEach((dataset) => {
      const matches = dataset.countryKey === selectedCountryKey;
      dataset.pointRadius = selectedCountryKey ? (matches ? 11 : 5) : 8;
      dataset.pointHoverRadius = selectedCountryKey ? (matches ? 13 : 8) : 11;
    });
    deploymentChart.update('none');
  }
};

function selectCountry(key, dimension) {
  if (!currentState) return;
  selectedCountryKey = key || null;
  const country = currentState.countrySystems.find(
    (item) => countryKey(item) === selectedCountryKey
  );
  if (country) renderEvidence(country, dimension);
  applyCrossSelection();
}

const renderRadar = (countrySystems, text) => {
  const canvas = document.getElementById('compare-radar-canvas');
  if (!canvas) return;
  profileChart?.destroy();

  profileChart = new Chart(canvas, {
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
      onClick(event, elements) {
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
    ctx.restore();
  },
  afterDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.font = '700 10px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    chart.data.datasets.forEach((dataset, index) => {
      const meta = chart.getDatasetMeta(index);
      const point = meta.data[0];
      if (!point) return;
      const label = String(dataset.label || '');
      const width = ctx.measureText(label).width;
      let x = point.x + 11;
      let align = 'left';
      if (x + width > chartArea.right) {
        x = point.x - 11;
        align = 'right';
      }
      ctx.textAlign = align;
      ctx.fillStyle = dataset.backgroundColor || '#334155';
      ctx.fillText(label, x, point.y);
    });
    ctx.restore();
  },
};

const renderDeploymentMatrix = (countrySystems, benchmarks, text) => {
  const canvas = document.getElementById('maturity-matrix-canvas');
  if (!canvas) return;
  deploymentChart?.destroy();

  const maxCapacity = Math.max(
    Number(benchmarks.deployment || 0) * 1.35,
    ...countrySystems.map((country) => country.deployment.committedCapacity),
    1
  );

  deploymentChart = new Chart(canvas, {
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
              x: country.deployment.committedCapacity,
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
        governanceQuadrants: { benchmarks },
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
            text: text.xAxis,
            font: { size: 10, weight: 700 },
          },
          grid: { color: 'rgba(148,163,184,0.12)' },
          ticks: { callback: (value) => Number(value).toFixed(0) },
        },
        y: {
          min: 0,
          max: 100,
          title: {
            display: true,
            text: text.yAxis,
            font: { size: 10, weight: 700 },
          },
          grid: { color: 'rgba(148,163,184,0.12)' },
          ticks: { stepSize: 20 },
        },
      },
    },
  });
};

const setProfileView = (view) => {
  activeProfileView = view;
  document.querySelectorAll('[data-profile-view]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.profileView === view);
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.profileView === view)
    );
  });
  document.querySelectorAll('[data-profile-visual]').forEach((panel) => {
    panel.classList.toggle('hidden', panel.dataset.profileVisual !== view);
  });
  if (view === 'radar') profileChart?.resize();
};

const bindProfileViewControls = () => {
  document.querySelectorAll('[data-profile-view]').forEach((button) => {
    button.onclick = () => setProfileView(button.dataset.profileView);
  });
};

const setMobilePanel = (panelName) => {
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
  if (panelName === 'profile') profileChart?.resize();
  if (panelName === 'deployment') deploymentChart?.resize();
};

const bindMobileTabs = () => {
  document.querySelectorAll('[data-governance-tab]').forEach((button) => {
    button.onclick = () => setMobilePanel(button.dataset.governanceTab);
  });
  setMobilePanel('profile');
};

export function clearGovernanceAnalytics() {
  profileChart?.destroy();
  deploymentChart?.destroy();
  profileChart = null;
  deploymentChart = null;
  currentState = null;
  selectedCountryKey = null;
  const heatmap = document.getElementById('governance-heatmap');
  const insights = document.getElementById('governance-insights');
  if (heatmap) heatmap.innerHTML = '';
  if (insights) insights.innerHTML = '';
}

export function renderGovernanceAnalytics({
  countrySystems,
  benchmarks,
  text,
  lang = 'zh',
}) {
  currentState = { countrySystems, benchmarks, text, lang };
  if (
    selectedCountryKey &&
    !countrySystems.some(
      (country) => countryKey(country) === selectedCountryKey
    )
  ) {
    selectedCountryKey = null;
  }

  renderRadar(countrySystems, text);
  renderHeatmap(countrySystems, text);
  renderDeploymentMatrix(countrySystems, benchmarks, text);
  renderInsights(countrySystems, benchmarks, text, lang);
  updateBenchmarkLabels(benchmarks);

  bindProfileViewControls();
  bindMobileTabs();
  setProfileView(
    activeProfileView || preferredProfileView(countrySystems.length)
  );

  if (selectedCountryKey) {
    const country = countrySystems.find(
      (item) => countryKey(item) === selectedCountryKey
    );
    if (country) renderEvidence(country);
  }
  applyCrossSelection();
}

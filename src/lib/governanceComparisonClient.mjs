import {
  GOVERNANCE_DIMENSIONS,
  calculateDeploymentMetrics,
  calculateGlobalBenchmarks,
  calculateGovernanceCapability,
  isActivePolicy,
} from './governanceBenchmarking.mjs';
import { facilityCapacity } from './capacityMetrics.mjs';
import {
  governanceClientCopy as copy,
  governanceComparisonCopy as pageCopy,
  governanceVisualsCopy as visualCopy,
} from './governanceCopy.mjs';
import {
  COMPARE_PRESETS,
  DEFAULT_COMPARE_COUNTRIES,
  MAX_COMPARE_COUNTRIES,
  countriesToQuery,
  countryKeyOf,
  queryToCountries,
} from './comparePresets.mjs';
import {
  TIMELINE_OPEN_THRESHOLD,
  buildTimelineGroups,
  isPendingRegulatory,
  localizeLegalWeight,
  splitContributors,
} from './comparePresentation.mjs';
import {
  clearGovernanceAnalytics,
  renderGovernanceAnalytics,
  selectGovernanceCountry,
} from './governanceWorkspaceVisuals.mjs';

const colors = [
  { border: 'rgb(37, 99, 235)', bg: 'rgba(37, 99, 235, 0.1)' },
  { border: 'rgb(16, 185, 129)', bg: 'rgba(16, 185, 129, 0.1)' },
  { border: 'rgb(245, 158, 11)', bg: 'rgba(245, 158, 11, 0.1)' },
  { border: 'rgb(139, 92, 246)', bg: 'rgba(139, 92, 246, 0.1)' },
  { border: 'rgb(236, 72, 153)', bg: 'rgba(236, 72, 153, 0.1)' },
  { border: 'rgb(14, 165, 183)', bg: 'rgba(14, 165, 183, 0.1)' },
];

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

const formatCapacity = (value) => Number(value || 0).toFixed(1);

const readCompareList = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('compare-list') || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const countryDisplayName = (canonical, countryMap, lang) => {
  if (lang === 'en') return countryMap[canonical]?.en || canonical;
  return countryMap[canonical]?.zh || canonical;
};

const getData = (id, key) => {
  const node = document.getElementById(id);
  if (!node) return key === 'countries' ? {} : [];
  try {
    if (
      node.tagName === 'SCRIPT' ||
      (node.textContent && node.textContent.trim())
    ) {
      return JSON.parse(
        node.textContent || (key === 'countries' ? '{}' : '[]')
      );
    }
    return JSON.parse(node.dataset[key] || (key === 'countries' ? '{}' : '[]'));
  } catch {
    return key === 'countries' ? {} : [];
  }
};

const readWeightState = () => {
  const weights = {};
  let present = false;
  for (const dimension of GOVERNANCE_DIMENSIONS) {
    const slider = document.getElementById(`weight-${dimension}`);
    if (slider) {
      present = true;
      weights[dimension] = Number(slider.value) || 0;
    }
  }
  return present ? weights : null;
};

// Shareable weight scenarios: `?weights=30,20,20,15,15` in
// GOVERNANCE_DIMENSIONS order. Invalid payloads fall back to equal weights.
const readWeightsFromUrl = (params) => {
  const raw = String(params.get('weights') || '').trim();
  if (!raw) return null;
  const values = raw.split(',').map((token) => Number(token.trim()));
  if (values.length !== GOVERNANCE_DIMENSIONS.length) return null;
  if (!values.every((value) => Number.isFinite(value) && value >= 0)) {
    return null;
  }
  if (values.reduce((sum, value) => sum + value, 0) <= 0) return null;
  return Object.fromEntries(
    GOVERNANCE_DIMENSIONS.map((dimension, position) => [
      dimension,
      values[position],
    ])
  );
};

const applyWeightsToSliders = (weights) => {
  if (!weights) return false;
  let applied = false;
  for (const dimension of GOVERNANCE_DIMENSIONS) {
    const slider = document.getElementById(`weight-${dimension}`);
    if (slider && Number.isFinite(Number(weights[dimension]))) {
      slider.value = String(
        Math.min(100, Math.max(0, Number(weights[dimension])))
      );
      applied = true;
    }
  }
  return applied;
};

// Persist the explorable view state (weights + planned toggle) next to
// `countries` so a copied URL reproduces the exact scenario. Defaults are
// omitted to keep shared links short.
const syncViewParamsToUrl = () => {
  const url = new URL(window.location.href);
  const weights = readWeightState();
  if (weights) {
    const values = GOVERNANCE_DIMENSIONS.map(
      (dimension) => Number(weights[dimension]) || 0
    );
    const uniform = values.every((value) => value === values[0]);
    if (uniform) url.searchParams.delete('weights');
    else url.searchParams.set('weights', values.join(','));
  }
  if (readIncludePlanned()) url.searchParams.set('planned', '1');
  else url.searchParams.delete('planned');
  window.history.replaceState(null, '', url.toString());
};

const readIncludePlanned = () =>
  document.getElementById('include-planned')?.checked === true;

const buildCountrySystem = ({
  canonical,
  policies,
  facilities,
  countryMap,
  profiles,
  lang,
  index,
  weights,
  includePlanned,
}) => {
  const governance = calculateGovernanceCapability(policies, weights);
  const deployment = calculateDeploymentMetrics(facilities);
  deployment.matrixX = includePlanned
    ? deployment.committedCapacity + deployment.plannedCapacity
    : deployment.committedCapacity;
  const peakAnalysis = Object.fromEntries(
    GOVERNANCE_DIMENSIONS.map((dimension) => [
      dimension,
      governance.dimensions[dimension].score,
    ])
  );
  const profile = profiles.find(
    (item) => countryKeyOf(item?.data?.id, countryMap) === canonical
  );
  const regulatory = profile?.data?.regulatory || {};

  return {
    country: canonical,
    canonicalCountry: canonical,
    displayCountry: countryDisplayName(canonical, countryMap, lang),
    color: colors[index % colors.length],
    governance,
    deployment,
    peakAnalysis,
    contributors: governance.contributors,
    policyList: policies,
    facilityList: facilities,
    regulatory,
  };
};

const buildGlobalSystems = (
  allPolicies,
  allFacilities,
  countryMap,
  weights,
  includePlanned
) => {
  const countries = [
    ...new Set(
      allPolicies
        .filter(isActivePolicy)
        .map((policy) => countryKeyOf(policy?.data?.country, countryMap))
        .filter(Boolean)
    ),
  ];

  return countries.map((canonical, index) =>
    buildCountrySystem({
      canonical,
      policies: allPolicies.filter(
        (policy) =>
          countryKeyOf(policy?.data?.country, countryMap) === canonical &&
          isActivePolicy(policy)
      ),
      facilities: allFacilities.filter(
        (facility) =>
          countryKeyOf(facility?.data?.country, countryMap) === canonical
      ),
      countryMap,
      profiles: [],
      lang: 'en',
      index,
      weights,
      includePlanned,
    })
  );
};

const regulatoryClarity = (regulatory, regKeys) =>
  regKeys.filter(([, key]) => !isPendingRegulatory(regulatory?.[key])).length;

const renderScorecard = (countrySystems, benchmarks, text, lang) => {
  const section = document.getElementById('scorecard-section');
  const head = document.getElementById('scorecard-head');
  const body = document.getElementById('scorecard-body');
  const insights = document.getElementById('insight-list');
  if (!section || !body) return;
  section.classList.remove('hidden');

  if (head) {
    head.innerHTML = `<tr><th scope="col">${escapeHtml(text.colCountry)}</th><th scope="col">${escapeHtml(text.colGovernance)}</th><th scope="col">${escapeHtml(text.colProfile)}</th><th scope="col">${escapeHtml(text.colPolicies)}</th><th scope="col">${escapeHtml(text.colCommitted)}</th><th scope="col">${escapeHtml(text.colPlanned)}</th><th scope="col">${escapeHtml(text.colRegulatory)}</th><th scope="col">${escapeHtml(text.colQuadrant)}</th></tr>`;
  }

  if (insights) {
    insights.innerHTML = countrySystems
      .map((country) => {
        const diff = country.governance.index - benchmarks.governance;
        const sign = diff >= 0 ? '+' : '−';
        const strongest =
          text.dimensionLabels[
            GOVERNANCE_DIMENSIONS.indexOf(country.governance.strongestDimension)
          ];
        const weakest =
          text.dimensionLabels[
            GOVERNANCE_DIMENSIONS.indexOf(country.governance.weakestDimension)
          ];
        const quadrant =
          text.quadrant[
            classifyQuadrant(country, benchmarks) || 'foundation-building'
          ];
        return `<li><strong>${escapeHtml(country.displayCountry)}</strong><span> · ${Number(country.governance.index).toFixed(1)}/100（${escapeHtml(text.insightVs)} ${sign}${escapeHtml(Math.abs(diff).toFixed(1))}） · ${escapeHtml(text.insightStrong)}：${escapeHtml(strongest)} · ${escapeHtml(text.insightWeak)}：${escapeHtml(weakest)} · ${formatCapacity(country.deployment.matrixX)} Mtpa · ${escapeHtml(quadrant)}${lang === 'zh' ? '象限' : ''}</span></li>`;
      })
      .join('');
  }

  body.innerHTML = countrySystems
    .map((country) => {
      const clarity = regulatoryClarity(country.regulatory, text.regKeys);
      const quadrant =
        text.quadrant[
          classifyQuadrant(country, benchmarks) || 'foundation-building'
        ];
      const profileBars = GOVERNANCE_DIMENSIONS.map((_, position) => {
        const score = country.governance.scores[position] || 0;
        const label = `${text.dimensionLabels[position]} ${Number(score).toFixed(0)}/100`;
        return `<div class="scorecard-bar" role="img" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"><span style="width:${Math.min(100, Math.max(0, score))}%"></span></div>`;
      }).join('');
      const key = escapeHtml(country.canonicalCountry);
      return `<tr data-country-key="${key}" class="scorecard-row"><th scope="row"><button type="button" class="scorecard-country" data-scorecard-country="${key}" aria-label="${escapeHtml(text.colCountry)}: ${escapeHtml(country.displayCountry)}">${escapeHtml(country.displayCountry)}</button></th><td class="scorecard-index">${Number(country.governance.index).toFixed(1)}</td><td><div class="scorecard-bars">${profileBars}</div></td><td>${country.governance.policyCount}</td><td>${formatCapacity(country.deployment.committedCapacity)}</td><td>${formatCapacity(country.deployment.plannedCapacity)}</td><td>${clarity}/${text.regKeys.length}</td><td>${escapeHtml(quadrant)}</td></tr>`;
    })
    .join('');
};

const classifyQuadrant = (country, benchmarks) => {
  const governanceHigh =
    Number(country.governance.index) >= Number(benchmarks.governance);
  const deploymentHigh =
    Number(country.deployment.matrixX) >= Number(benchmarks.deployment);
  if (governanceHigh && deploymentHigh) return 'integrated-leaders';
  if (governanceHigh) return 'policy-led';
  if (deploymentHigh) return 'deployment-led';
  return 'foundation-building';
};

const verificationBadge = (policy, lang) => {
  const ui = visualCopy[lang] || visualCopy.zh;
  const verified = policy?.data?.reviewStatus === 'verified';
  return `<span class="contributor-badge ${verified ? 'is-verified' : 'is-draft'}">${escapeHtml(verified ? ui.verifiedBadge : ui.draftBadge)}</span>`;
};

const renderContributors = (
  countrySystems,
  text,
  lang,
  expandedCountries = new Set()
) => {
  const container = document.getElementById('policy-bundles-container');
  if (!container) return;
  const dimensionColors = {
    incentive: 'bg-emerald-500',
    statutory: 'bg-blue-500',
    market: 'bg-amber-500',
    strategic: 'bg-purple-500',
    mrv: 'bg-slate-500',
  };

  const renderRow = (country, policy, hidden) => {
    const peakDots = GOVERNANCE_DIMENSIONS.map((dimension) => {
      const score = Number(policy.data.analysis?.[dimension]?.score || 0);
      const peak = country.peakAnalysis[dimension];
      return score > 0 && score === peak
        ? `<span class="h-1.5 w-1.5 rounded-full ${dimensionColors[dimension]}"></span>`
        : '';
    }).join('');
    const legalWeight = localizeLegalWeight(policy.data.legalWeight, lang);
    const href = `${text.policyPath}${encodeURIComponent(String(policy.id))}/`;
    return `<li class="contributor-row${hidden ? ' is-extra' : ''}"><span class="contributor-year">${escapeHtml(policy.data.year)}</span><a class="contributor-title" href="${href}" title="${escapeHtml(policy.data.title)}">${escapeHtml(policy.data.title)}</a><span class="contributor-meta">${legalWeight ? escapeHtml(legalWeight) : ''}</span><span class="contributor-dots">${peakDots}</span>${verificationBadge(policy, lang)}</li>`;
  };

  container.innerHTML = countrySystems
    .map((country) => {
      const key = country.canonicalCountry;
      const escapedKey = escapeHtml(key);
      const { visible, extra, total, hiddenCount } = splitContributors(
        country.contributors
      );
      const expanded = expandedCountries.has(key);
      return `<section class="contributor-section${expanded ? ' is-expanded' : ''}" data-country-key="${escapedKey}"><div class="contributor-head"><span class="contributor-dot" style="background-color:${country.color.border}"></span><h3>${escapeHtml(country.displayCountry)}</h3><span class="contributor-count">${text.policyCount} ${country.governance.policyCount}${text.items}</span></div><ul class="contributor-list">${visible
        .map((policy) => renderRow(country, policy, false))
        .join('')}${extra
        .map((policy) => renderRow(country, policy, true))
        .join('')}</ul>${
        hiddenCount
          ? `<button type="button" class="contributor-toggle" data-contributors-toggle="${escapedKey}" aria-expanded="${expanded ? 'true' : 'false'}">${
              expanded
                ? escapeHtml(text.collapse)
                : `${escapeHtml(text.showAllContributors)} · ${total}`
            }</button>`
          : ''
      }</section>`;
    })
    .join('');
};

const breakdownRows = (entries, total, label) => {
  if (!(total > 0) || !entries.length) return '';
  return (
    `<p class="breakdown-label">${escapeHtml(label)}</p>` +
    entries
      .map(
        ([name, value]) =>
          `<div class="breakdown-row"><span class="breakdown-name">${escapeHtml(name)}</span><span class="breakdown-track"><span class="breakdown-fill" style="width:${Math.min(100, (value / total) * 100).toFixed(1)}%"></span></span><span class="breakdown-value">${formatCapacity(value)}</span></div>`
      )
      .join('')
  );
};

const renderFacilityStats = (countrySystems, text) => {
  const container = document.getElementById('stats-grid');
  if (!container) return;
  container.innerHTML = countrySystems
    .map((country) => {
      const committedBase =
        country.deployment.operationalCapacity +
        country.deployment.constructionCapacity;
      const byDimension = (pick) => {
        const groups = new Map();
        for (const facility of country.facilityList || []) {
          const data = facility?.data ?? {};
          const status = String(data.status || '');
          const active = ['operational', 'under-construction'].some(
            (key) =>
              status.toLowerCase().includes(key) ||
              (key === 'operational' && /运行中|operational/i.test(status)) ||
              (key === 'under-construction' &&
                /建设中|under.construction/i.test(status))
          );
          if (!active) continue;
          const name = String(pick(data) || '').trim() || text.otherGroup;
          groups.set(name, (groups.get(name) || 0) + facilityCapacity(data));
        }
        return [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      };
      const sectors = byDimension((data) => data.sector);
      const types = byDimension((data) => data.type);
      return `<article class="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/50" data-country-key="${escapeHtml(country.canonicalCountry)}"><div class="mb-4 flex items-center justify-between gap-3"><span class="font-bold text-slate-900 dark:text-white">${escapeHtml(country.displayCountry)}</span><span class="text-[10px] font-black text-blue-600">${country.deployment.operationalCount} ${text.operationalProjects}</span></div><div class="breakdown">${breakdownRows(sectors, committedBase, text.bySector)}${breakdownRows(types, committedBase, text.byType)}</div></article>`;
    })
    .join('');
};

const renderRegulatoryMatrix = (countrySystems, text) => {
  const header = document.getElementById('reg-matrix-header');
  const body = document.getElementById('reg-matrix-body');
  if (header) {
    header.innerHTML =
      `<tr><th class="p-6 text-[10px] font-black uppercase text-slate-400">${text.dimension}</th>` +
      countrySystems
        .map(
          (country) =>
            `<th data-country-key="${escapeHtml(country.canonicalCountry)}" class="border-l border-slate-100 p-6 font-bold text-slate-900 dark:border-slate-800 dark:text-white">${escapeHtml(country.displayCountry)}</th>`
        )
        .join('') +
      '</tr>';
  }
  if (body) {
    body.innerHTML = text.regKeys
      .map(
        ([label, key]) =>
          `<tr class="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"><td class="bg-slate-50/30 p-6 text-xs font-bold text-slate-500 dark:bg-slate-900/20 dark:text-slate-400">${label}</td>${countrySystems
            .map((country) => {
              const value = country.regulatory[key] || '';
              const pending = isPendingRegulatory(value);
              const cell = pending
                ? `<span class="reg-dot is-pending">— ${escapeHtml(text.regPending)}</span>`
                : `<button type="button" class="reg-dot is-stated" title="${escapeHtml(value)}">● ${escapeHtml(value)}</button>`;
              return `<td data-country-key="${escapeHtml(country.canonicalCountry)}" class="reg-cell border-l border-slate-100 p-6 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-400">${cell}</td>`;
            })
            .join('')}</tr>`
      )
      .join('');
  }
};

const renderTimeline = (countrySystems, text, timelineState = new Map()) => {
  const section = document.getElementById('timeline-section');
  const container = document.getElementById('timeline-list');
  if (!section || !container) return;
  section.classList.remove('hidden');

  const groups = buildTimelineGroups(countrySystems);
  if (!groups.some((group) => group.total > 0)) {
    container.innerHTML = `<p class="text-sm text-slate-500">${escapeHtml(text.timelineEmpty)}</p>`;
    return;
  }

  container.innerHTML = groups
    .map((group) => {
      const key = group.country;
      const escapedKey = escapeHtml(key);
      const autoOpen =
        groups.length === 1 || group.total <= TIMELINE_OPEN_THRESHOLD;
      const open = timelineState.has(key)
        ? timelineState.get(key)
        : autoOpen && group.total > 0;
      const range =
        group.firstDate && group.lastDate
          ? ` · ${String(group.firstDate).slice(0, 4)}–${String(group.lastDate).slice(0, 4)}`
          : '';
      const meta =
        group.total > 0
          ? `${group.total}${escapeHtml(text.timelineMilestones)}${escapeHtml(range)}`
          : escapeHtml(text.timelineEmptyCountry);
      const items = group.items.length
        ? `<ol class="timeline-list">${group.items
            .map(
              (item) =>
                `<li class="timeline-item"><span class="timeline-date">${escapeHtml(item.date)}</span><span class="timeline-body">${escapeHtml(item.event)}</span></li>`
            )
            .join('')}</ol>`
        : `<p class="timeline-group-empty">${escapeHtml(text.timelineEmptyCountry)}</p>`;
      return `<section class="timeline-group${open ? ' is-open' : ''}" data-country-key="${escapedKey}"><button type="button" class="timeline-group-head" data-timeline-toggle="${escapedKey}" aria-expanded="${open ? 'true' : 'false'}"><span class="timeline-dot" style="background-color:${group.color}"></span><strong>${escapeHtml(group.displayCountry)}</strong><span class="timeline-group-meta">${meta}</span><span class="timeline-chevron" aria-hidden="true">▾</span></button>${items}</section>`;
    })
    .join('');
};

const renderSelectedTags = (selectedCanonical, countryMap, lang, pageText) => {
  const container = document.getElementById('selected-tags');
  if (!container) return;
  container.innerHTML = selectedCanonical
    .map(
      (canonical) =>
        `<span class="selected-tag" data-country-key="${escapeHtml(canonical)}">${escapeHtml(countryDisplayName(canonical, countryMap, lang))}<button type="button" data-remove-country="${escapeHtml(canonical)}" aria-label="${escapeHtml(pageText.removeCountry)}${escapeHtml(countryDisplayName(canonical, countryMap, lang))}">×</button></span>`
    )
    .join('');
};

const renderCountrySelector = (
  selectedCanonical,
  allPolicies,
  countryMap,
  lang,
  pageText
) => {
  const container = document.getElementById('country-selector');
  if (!container) return;
  const counts = new Map();
  for (const policy of allPolicies) {
    if (!isActivePolicy(policy)) continue;
    const key = countryKeyOf(policy?.data?.country, countryMap);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  }
  const options = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  container.innerHTML = options
    .map(
      ([canonical, count]) =>
        `<label class="country-option"><input type="checkbox" class="country-checkbox" value="${escapeHtml(canonical)}"${selectedCanonical.includes(canonical) ? ' checked' : ''} /><span>${escapeHtml(countryDisplayName(canonical, countryMap, lang))}</span><em>${count}</em></label>`
    )
    .join('');
  const hint = document.getElementById('selector-limit');
  if (hint) {
    hint.textContent = '';
    hint.dataset.message = pageText.selectorLimit;
  }
};

const downloadFile = (filename, content, mime) => {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const csvCell = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const exportScorecardCsv = (countrySystems, benchmarks, text) => {
  const header = [
    text.colCountry,
    text.colGovernance,
    ...text.dimensionLabels,
    text.colPolicies,
    text.colCommitted,
    text.colPlanned,
    text.colRegulatory,
    text.colQuadrant,
  ];
  const lines = [header.map(csvCell).join(',')];
  for (const country of countrySystems) {
    lines.push(
      [
        country.displayCountry,
        Number(country.governance.index).toFixed(1),
        ...country.governance.scores.map((score) => Number(score).toFixed(0)),
        country.governance.policyCount,
        formatCapacity(country.deployment.committedCapacity),
        formatCapacity(country.deployment.plannedCapacity),
        `${regulatoryClarity(country.regulatory, text.regKeys)}/${text.regKeys.length}`,
        text.quadrant[classifyQuadrant(country, benchmarks)],
      ]
        .map(csvCell)
        .join(',')
    );
  }
  downloadFile(
    'ccus-compare-scorecard.csv',
    `﻿${lines.join('\n')}`,
    'text/csv'
  );
};

const exportSummaryJson = (
  countrySystems,
  benchmarks,
  text,
  lang,
  weights,
  includePlanned
) => {
  const summary = {
    generated: new Date().toISOString().slice(0, 10),
    lang,
    weights: weights || 'equal',
    includePlanned,
    benchmarks: {
      governance: Number(Number(benchmarks.governance || 0).toFixed(1)),
      deploymentMtpa: Number(Number(benchmarks.deployment || 0).toFixed(1)),
    },
    countries: countrySystems.map((country) => ({
      country: country.canonicalCountry,
      display: country.displayCountry,
      governanceIndex: Number(country.governance.index.toFixed(1)),
      dimensions: Object.fromEntries(
        GOVERNANCE_DIMENSIONS.map((dimension, position) => [
          dimension,
          country.governance.scores[position],
        ])
      ),
      strongestDimension: country.governance.strongestDimension,
      weakestDimension: country.governance.weakestDimension,
      activePolicies: country.governance.policyCount,
      committedMtpa: Number(country.deployment.committedCapacity.toFixed(1)),
      plannedMtpa: Number(country.deployment.plannedCapacity.toFixed(1)),
      regulatoryClarity: `${regulatoryClarity(country.regulatory, text.regKeys)}/${text.regKeys.length}`,
      quadrant: classifyQuadrant(country, benchmarks),
      contributors: country.contributors.map((policy) => String(policy.id)),
    })),
    citation:
      'CCUS Policy Hub. CCUS Policy Comparison Brief. https://doi.org/10.5281/zenodo.21110615',
  };
  downloadFile(
    'ccus-compare.json',
    JSON.stringify(summary, null, 2),
    'application/json'
  );
};

const copyCitation = (button, pageText) => {
  const report = pageText.reportTitle || 'CCUS Policy Comparison Brief';
  const date = new Date().toISOString().slice(0, 10);
  const citation = `CCUS Policy Hub. ${report}. ${date}. https://doi.org/10.5281/zenodo.21110615`;
  const done = () => {
    const original = button.textContent;
    button.textContent = pageText.citedOk;
    setTimeout(() => {
      button.textContent = original;
    }, 1500);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(citation).then(done, done);
  } else {
    // Clipboard API unavailable (e.g. non-secure context): surface the
    // citation in a dismissible overlay so it can be copied manually.
    const overlay = document.createElement('div');
    overlay.className = 'citation-fallback';
    overlay.innerHTML = `<textarea readonly rows="3"></textarea>`;
    overlay.querySelector('textarea').value = citation;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
    overlay.querySelector('textarea').select();
    done();
  }
};

const setCountriesQuery = (canonicals) => {
  const url = new URL(window.location.href);
  if (!canonicals || !canonicals.length) {
    url.searchParams.set('countries', '');
  } else {
    url.searchParams.set('countries', countriesToQuery(canonicals));
  }
  window.history.replaceState(null, '', url.toString());
};

export function initGovernanceComparison(lang = 'zh') {
  const text = copy[lang] || copy.zh;
  const pageText = pageCopy[lang] || pageCopy.zh;
  const expandedContributorCountries = new Set();
  const timelineState = new Map();

  const render = () => {
    const allPolicies = getData('all-policies-data', 'policies');
    const allFacilities = getData('all-facilities-data', 'facilities');
    const countryMap = getData('country-data', 'countries');
    const profiles = getData('countries-profiles-data', 'profiles');
    const params = new URLSearchParams(window.location.search);
    const weights = readWeightState();
    const includePlanned = readIncludePlanned();
    const scopeSelect = document.getElementById('analysis-scope');
    const container = document.getElementById('compare-container');
    const emptyState = document.getElementById('empty-state');

    let selectedCanonical = [];
    let explicitEmpty = false;
    if (params.has('countries')) {
      const parsed = queryToCountries(params.get('countries'), countryMap);
      if (!String(params.get('countries') || '').trim()) explicitEmpty = true;
      selectedCanonical = parsed;
    } else {
      const selectedIds = JSON.parse(
        localStorage.getItem('compare-list') || '[]'
      );
      const selectedPolicies = allPolicies.filter((policy) =>
        selectedIds.includes(policy.id)
      );
      selectedCanonical = [
        ...new Set(
          selectedPolicies
            .map((policy) => countryKeyOf(policy?.data?.country, countryMap))
            .filter(Boolean)
        ),
      ];
      if (!selectedCanonical.length) {
        selectedCanonical = DEFAULT_COMPARE_COUNTRIES.filter(
          (canonical) => countryMap[canonical]
        );
      }
    }

    renderCountrySelector(
      selectedCanonical,
      allPolicies,
      countryMap,
      lang,
      pageText
    );
    renderSelectedTags(selectedCanonical, countryMap, lang, pageText);

    if (explicitEmpty || !selectedCanonical.length) {
      emptyState?.classList.remove('hidden');
      container?.classList.add('hidden');
      clearGovernanceAnalytics();
      const scorecard = document.getElementById('scorecard-section');
      const timeline = document.getElementById('timeline-section');
      scorecard?.classList.add('hidden');
      timeline?.classList.add('hidden');
      return;
    }

    emptyState?.classList.add('hidden');
    container?.classList.remove('hidden');

    const storedPolicyIds = readCompareList();
    const storedPolicies = allPolicies.filter((policy) =>
      storedPolicyIds.includes(String(policy.id))
    );
    // "Selected policies only" is meaningful only when the visitor arrived
    // with a policy selection that overlaps the countries on screen. Deep
    // links / presets carry no policy list, so the whole scope row stays
    // hidden and the page benchmarks the full active national system instead
    // of rendering a bogus all-zero profile.
    const storedMatchesSelection = storedPolicies.some((policy) =>
      selectedCanonical.includes(
        countryKeyOf(policy?.data?.country, countryMap)
      )
    );
    const scopeRow = document.querySelector('.governance-scope-row');
    scopeRow?.classList.toggle('hidden', !storedMatchesSelection);
    let scope = scopeSelect?.value || 'system';
    if (scope === 'selected' && !storedMatchesSelection) scope = 'system';
    if (scopeSelect && scopeSelect.value !== scope) scopeSelect.value = scope;

    const policyPool = scope === 'selected' ? storedPolicies : allPolicies;
    const countrySystems = selectedCanonical.map((canonical, index) =>
      buildCountrySystem({
        canonical,
        policies: policyPool.filter(
          (policy) =>
            countryKeyOf(policy?.data?.country, countryMap) === canonical &&
            isActivePolicy(policy)
        ),
        facilities: allFacilities.filter(
          (facility) =>
            countryKeyOf(facility?.data?.country, countryMap) === canonical
        ),
        countryMap,
        profiles,
        lang,
        index,
        weights,
        includePlanned,
      })
    );
    const globalSystems = buildGlobalSystems(
      allPolicies,
      allFacilities,
      countryMap,
      weights,
      includePlanned
    );
    const benchmarks = calculateGlobalBenchmarks(
      globalSystems,
      (deployment) => deployment?.matrixX
    );

    renderScorecard(countrySystems, benchmarks, text, lang);
    renderContributors(
      countrySystems,
      text,
      lang,
      expandedContributorCountries
    );
    renderFacilityStats(countrySystems, text);
    renderRegulatoryMatrix(countrySystems, text);
    renderTimeline(countrySystems, text, timelineState);
    renderGovernanceAnalytics({
      countrySystems,
      benchmarks,
      text,
      lang,
      includePlanned,
    });
    window.__ccusCompareLast = {
      systems: countrySystems,
      benchmarks,
    };
  };

  const clearButton = document.getElementById('clear-all');
  if (clearButton) {
    clearButton.onclick = () => {
      localStorage.removeItem('compare-list');
      window.dispatchEvent(new CustomEvent('compare-updated'));
      setCountriesQuery([]);
      render();
    };
  }
  const printButton = document.getElementById('print-report');
  if (printButton) printButton.onclick = () => window.print();
  const closeExportMenu = () =>
    document
      .querySelector('.compare-export-menu[open]')
      ?.removeAttribute('open');
  const csvButton = document.getElementById('export-csv');
  if (csvButton) {
    csvButton.onclick = () => {
      closeExportMenu();
      const detail = window.__ccusCompareLast;
      if (detail) exportScorecardCsv(detail.systems, detail.benchmarks, text);
    };
  }
  const jsonButton = document.getElementById('export-json');
  if (jsonButton) {
    jsonButton.onclick = () => {
      closeExportMenu();
      const detail = window.__ccusCompareLast;
      if (detail) {
        exportSummaryJson(
          detail.systems,
          detail.benchmarks,
          text,
          lang,
          readWeightState(),
          readIncludePlanned()
        );
      }
    };
  }
  const citeButton = document.getElementById('copy-citation');
  if (citeButton) {
    citeButton.onclick = () => {
      closeExportMenu();
      copyCitation(citeButton, pageText);
    };
  }
  const scopeSelect = document.getElementById('analysis-scope');
  if (scopeSelect) scopeSelect.onchange = render;
  const plannedToggle = document.getElementById('include-planned');
  if (plannedToggle) {
    plannedToggle.onchange = () => {
      syncViewParamsToUrl();
      render();
    };
  }
  const resetWeights = document.getElementById('reset-weights-compare');
  if (resetWeights) {
    resetWeights.onclick = () => {
      for (const dimension of GOVERNANCE_DIMENSIONS) {
        const slider = document.getElementById(`weight-${dimension}`);
        if (slider) slider.value = '20';
      }
      updateWeightLabels();
      syncViewParamsToUrl();
      render();
    };
  }
  for (const dimension of GOVERNANCE_DIMENSIONS) {
    const slider = document.getElementById(`weight-${dimension}`);
    if (slider)
      slider.addEventListener('input', () => {
        updateWeightLabels();
        syncViewParamsToUrl();
        render();
      });
  }

  const updateWeightLabels = () => {
    const weights = readWeightState() || {};
    const total =
      Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;
    for (const dimension of GOVERNANCE_DIMENSIONS) {
      const label = document.getElementById(`weight-${dimension}-val`);
      if (label) {
        label.textContent = `${Math.round(((weights[dimension] || 0) / total) * 100)}%`;
      }
      const name = document.querySelector(`[data-weight-label="${dimension}"]`);
      if (name) {
        name.textContent =
          text.dimensionLabels[GOVERNANCE_DIMENSIONS.indexOf(dimension)];
      }
    }
  };

  document.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const preset = COMPARE_PRESETS.find(
        (item) => item.id === button.dataset.preset
      );
      if (!preset) return;
      setCountriesQuery([...preset.countries]);
      render();
    });
  });

  // Re-bound on every Astro page-load: drop the previous document-level
  // handler first so navigations never stack duplicate listeners.
  if (window.__ccusCountryChangeHandler) {
    document.removeEventListener('change', window.__ccusCountryChangeHandler);
  }
  const countryChangeHandler = (event) => {
    const target = event.target;
    if (target?.classList?.contains('country-checkbox')) {
      const checked = [...document.querySelectorAll('.country-checkbox')]
        .filter((box) => box.checked)
        .map((box) => box.value);
      if (checked.length > MAX_COMPARE_COUNTRIES) {
        target.checked = false;
        const hint = document.getElementById('selector-limit');
        if (hint) hint.textContent = hint.dataset.message || '';
        return;
      }
      setCountriesQuery(checked);
      render();
    }
  };
  window.__ccusCountryChangeHandler = countryChangeHandler;
  document.addEventListener('change', countryChangeHandler);

  // Tag removal uses the same re-binding discipline as the selector above.
  if (window.__ccusTagRemoveHandler) {
    document.removeEventListener('click', window.__ccusTagRemoveHandler);
  }
  const tagRemoveHandler = (event) => {
    const button = event.target?.closest?.('[data-remove-country]');
    if (!button) return;
    event.preventDefault();
    const params = new URLSearchParams(window.location.search);
    const countryMap = getData('country-data', 'countries');
    const current = params.has('countries')
      ? queryToCountries(params.get('countries'), countryMap)
      : [
          ...new Set(
            [...document.querySelectorAll('.country-checkbox')]
              .filter((box) => box.checked)
              .map((box) => box.value)
          ),
        ];
    setCountriesQuery(
      current.filter((canonical) => canonical !== button.dataset.removeCountry)
    );
    render();
  };
  window.__ccusTagRemoveHandler = tagRemoveHandler;
  document.addEventListener('click', tagRemoveHandler);

  // Progressive disclosure: contributor cards, timeline groups and clamped
  // regulatory cells toggle in place. State lives in the closure so a
  // re-render (weights / planned toggle) preserves what the user expanded.
  if (window.__ccusDisclosureHandler) {
    document.removeEventListener('click', window.__ccusDisclosureHandler);
  }
  const disclosureHandler = (event) => {
    const toggle = event.target?.closest?.('[data-contributors-toggle]');
    if (toggle) {
      const key = toggle.dataset.contributorsToggle;
      const section = toggle.closest('.contributor-section');
      const expanded = Boolean(section?.classList.toggle('is-expanded'));
      if (expanded) expandedContributorCountries.add(key);
      else expandedContributorCountries.delete(key);
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      const total = section?.querySelectorAll('.contributor-card').length || 0;
      toggle.textContent = expanded
        ? text.collapse
        : `${text.showAllContributors} · ${total}`;
      return;
    }
    const timelineToggle = event.target?.closest?.('[data-timeline-toggle]');
    if (timelineToggle) {
      const key = timelineToggle.dataset.timelineToggle;
      const group = timelineToggle.closest('.timeline-group');
      const expanded = Boolean(group?.classList.toggle('is-open'));
      timelineState.set(key, expanded);
      timelineToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      return;
    }
    const regCell = event.target?.closest?.('.reg-dot.is-stated');
    if (regCell) regCell.classList.toggle('is-expanded');
  };
  window.__ccusDisclosureHandler = disclosureHandler;
  document.addEventListener('click', disclosureHandler);

  // Scorecard countries open the evidence panel (the former insight cards
  // were a duplicate of the scorecard rows).
  if (window.__ccusScorecardHandler) {
    document.removeEventListener('click', window.__ccusScorecardHandler);
  }
  const scorecardHandler = (event) => {
    const button = event.target?.closest?.('[data-scorecard-country]');
    if (!button) return;
    selectGovernanceCountry(button.dataset.scorecardCountry);
  };
  window.__ccusScorecardHandler = scorecardHandler;
  document.addEventListener('click', scorecardHandler);

  const bindingKey = `__ccusGovernanceComparisonBound_${lang}`;
  if (!window[bindingKey]) {
    window.addEventListener('compare-updated', render);
    window.addEventListener('storage', render);
    window[bindingKey] = true;
  }

  // Hydrate explorable view state from a shared link before first paint.
  const initialParams = new URLSearchParams(window.location.search);
  const sharedWeights = readWeightsFromUrl(initialParams);
  if (sharedWeights) applyWeightsToSliders(sharedWeights);
  const sharedPlanned = document.getElementById('include-planned');
  if (sharedPlanned && initialParams.get('planned') === '1') {
    sharedPlanned.checked = true;
  }

  updateWeightLabels();
  render();
}

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
  clearGovernanceAnalytics,
  renderGovernanceAnalytics,
} from './governanceWorkspaceVisuals.mjs';

const colors = [
  { border: 'rgb(37, 99, 235)', bg: 'rgba(37, 99, 235, 0.1)' },
  { border: 'rgb(16, 185, 129)', bg: 'rgba(16, 185, 129, 0.1)' },
  { border: 'rgb(245, 158, 11)', bg: 'rgba(245, 158, 11, 0.1)' },
  { border: 'rgb(139, 92, 246)', bg: 'rgba(139, 92, 246, 0.1)' },
  { border: 'rgb(236, 72, 153)', bg: 'rgba(236, 72, 153, 0.1)' },
  { border: 'rgb(14, 165, 183)', bg: 'rgba(14, 165, 183, 0.1)' },
];

const PENDING_PATTERN = /pending|待定|未具体说明|tbd|^—+$|^-+$|^n\/?a$/i;

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
const isPendingRegulatory = (value) =>
  !String(value || '').trim() || PENDING_PATTERN.test(String(value).trim());

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
        return `<div class="scorecard-bar" title="${escapeHtml(text.dimensionLabels[position])}: ${Number(score).toFixed(0)}"><span style="width:${Math.min(100, Math.max(0, score))}%"></span></div>`;
      }).join('');
      return `<tr data-country-key="${escapeHtml(country.canonicalCountry)}"><th scope="row">${escapeHtml(country.displayCountry)}</th><td class="scorecard-index">${Number(country.governance.index).toFixed(1)}</td><td><div class="scorecard-bars">${profileBars}</div></td><td>${country.governance.policyCount}</td><td>${formatCapacity(country.deployment.committedCapacity)}</td><td>${formatCapacity(country.deployment.plannedCapacity)}</td><td>${clarity}/${text.regKeys.length}</td><td>${escapeHtml(quadrant)}</td></tr>`;
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

const renderContributors = (countrySystems, text, lang) => {
  const container = document.getElementById('policy-bundles-container');
  if (!container) return;
  const dimensionColors = {
    incentive: 'bg-emerald-500',
    statutory: 'bg-blue-500',
    market: 'bg-amber-500',
    strategic: 'bg-purple-500',
    mrv: 'bg-slate-500',
  };

  container.innerHTML = countrySystems
    .map((country) => {
      const key = escapeHtml(country.canonicalCountry);
      return `<section class="space-y-6" data-country-key="${key}"><div class="flex items-center gap-4"><div class="h-3 w-3 rounded-full" style="background-color:${country.color.border}"></div><h3 class="text-xl font-bold dark:text-white">${escapeHtml(country.displayCountry)} · ${text.contributorHeading}</h3><span class="text-xs font-semibold text-slate-400">${text.policyCount} ${country.governance.policyCount}${text.items}</span></div><div class="grid grid-cols-1 gap-4 md:grid-cols-2">${country.contributors
        .map(
          (policy) =>
            `<article class="relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-blue-500 dark:border-slate-800 dark:bg-slate-900"><div class="mb-3 flex items-start justify-between"><span class="text-[9px] font-black uppercase tracking-widest text-slate-400">${escapeHtml(policy.data.year)}${policy.data.legalWeight ? ` · ${escapeHtml(policy.data.legalWeight)}` : ''}</span>${verificationBadge(policy, lang)}</div><h4 class="mb-4 line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">${escapeHtml(policy.data.title)}</h4><div class="flex gap-1.5">${GOVERNANCE_DIMENSIONS.map(
              (dimension) => {
                const score = Number(
                  policy.data.analysis?.[dimension]?.score || 0
                );
                const peak = country.peakAnalysis[dimension];
                return score > 0 && score === peak
                  ? `<span class="h-1.5 w-1.5 rounded-full ${dimensionColors[dimension]}"></span>`
                  : '';
              }
            ).join(
              ''
            )}</div><a class="absolute inset-0" href="${text.policyPath}${encodeURIComponent(String(policy.id))}/" aria-label="${escapeHtml(policy.data.title)}"></a></article>`
        )
        .join('')}</div></section>`;
    })
    .join('<div class="my-8 h-px bg-slate-100 dark:bg-slate-800"></div>');
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
      const pipelineTotal = committedBase + country.deployment.plannedCapacity;
      const stack =
        pipelineTotal > 0
          ? `<div class="capacity-stack"><span class="is-operational" style="width:${((country.deployment.operationalCapacity / pipelineTotal) * 100).toFixed(1)}%"></span><span class="is-construction" style="width:${((country.deployment.constructionCapacity / pipelineTotal) * 100).toFixed(1)}%"></span><span class="is-planned" style="width:${((country.deployment.plannedCapacity / pipelineTotal) * 100).toFixed(1)}%"></span></div>`
          : '';
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
        return [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
      };
      const sectors = byDimension((data) => data.sector);
      const types = byDimension((data) => data.type);
      return `<article class="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/50" data-country-key="${escapeHtml(country.canonicalCountry)}"><div class="mb-4 flex items-center justify-between gap-3"><span class="font-bold text-slate-900 dark:text-white">${escapeHtml(country.displayCountry)}</span><span class="text-[10px] font-black text-blue-600">${country.deployment.operationalCount} ${text.operationalProjects}</span></div>${stack}<div class="grid grid-cols-3 gap-2">${[
        [
          text.operational,
          country.deployment.operationalCapacity,
          'text-emerald-500',
        ],
        [
          text.construction,
          country.deployment.constructionCapacity,
          'text-amber-500',
        ],
        [text.planned, country.deployment.plannedCapacity, 'text-blue-500'],
      ]
        .map(
          ([label, value, className]) =>
            `<div class="rounded-xl bg-slate-50 p-2 text-center dark:bg-slate-800/50"><p class="text-[8px] font-black uppercase ${className}">${label}</p><p class="text-xs font-bold dark:text-white">${formatCapacity(value)}</p></div>`
        )
        .join(
          ''
        )}</div><div class="breakdown">${breakdownRows(sectors, committedBase, text.bySector)}${breakdownRows(types, committedBase, text.byType)}</div></article>`;
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
                ? `<span class="reg-dot is-pending" aria-label="${escapeHtml(text.regPending)}">— ${escapeHtml(text.regPending)}</span>`
                : `<span class="reg-dot is-stated" title="${escapeHtml(value)}">● ${escapeHtml(value)}</span>`;
              return `<td data-country-key="${escapeHtml(country.canonicalCountry)}" class="reg-cell border-l border-slate-100 p-6 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-400">${cell}</td>`;
            })
            .join('')}</tr>`
      )
      .join('');
  }
};

const renderTimeline = (countrySystems, text) => {
  const section = document.getElementById('timeline-section');
  const container = document.getElementById('timeline-list');
  if (!section || !container) return;
  const items = [];
  for (const country of countrySystems) {
    for (const policy of country.policyList || []) {
      const milestones = policy?.data?.evolution?.milestones;
      if (!Array.isArray(milestones)) continue;
      for (const milestone of milestones) {
        if (!milestone?.date || !milestone?.event) continue;
        items.push({
          date: String(milestone.date),
          event: String(milestone.event),
          country: country.displayCountry,
          color: country.color.border,
        });
      }
    }
  }
  if (!items.length) {
    section.classList.remove('hidden');
    container.innerHTML = `<p class="text-sm text-slate-500">${escapeHtml(text.timelineEmpty)}</p>`;
    return;
  }
  items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  section.classList.remove('hidden');
  container.innerHTML = items
    .map(
      (item) =>
        `<li class="timeline-item"><span class="timeline-dot" style="background-color:${item.color}"></span><span class="timeline-date">${escapeHtml(item.date)}</span><span class="timeline-body"><strong>${escapeHtml(item.country)}</strong> — ${escapeHtml(item.event)}</span></li>`
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

  const render = () => {
    const allPolicies = getData('all-policies-data', 'policies');
    const allFacilities = getData('all-facilities-data', 'facilities');
    const countryMap = getData('country-data', 'countries');
    const profiles = getData('countries-profiles-data', 'profiles');
    const params = new URLSearchParams(window.location.search);
    const weights = readWeightState();
    const includePlanned = readIncludePlanned();
    const scope = document.getElementById('analysis-scope')?.value || 'system';
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

    const policyPool =
      scope === 'selected'
        ? allPolicies.filter((policy) =>
            JSON.parse(localStorage.getItem('compare-list') || '[]').includes(
              policy.id
            )
          )
        : allPolicies;
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
    renderContributors(countrySystems, text, lang);
    renderFacilityStats(countrySystems, text);
    renderRegulatoryMatrix(countrySystems, text);
    renderTimeline(countrySystems, text);
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
  const csvButton = document.getElementById('export-csv');
  if (csvButton) {
    csvButton.onclick = () => {
      const detail = window.__ccusCompareLast;
      if (detail) exportScorecardCsv(detail.systems, detail.benchmarks, text);
    };
  }
  const jsonButton = document.getElementById('export-json');
  if (jsonButton) {
    jsonButton.onclick = () => {
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
    citeButton.onclick = () => copyCitation(citeButton, pageText);
  }
  const scopeSelect = document.getElementById('analysis-scope');
  if (scopeSelect) scopeSelect.onchange = render;
  const plannedToggle = document.getElementById('include-planned');
  if (plannedToggle) plannedToggle.onchange = render;
  const resetWeights = document.getElementById('reset-weights-compare');
  if (resetWeights) {
    resetWeights.onclick = () => {
      for (const dimension of GOVERNANCE_DIMENSIONS) {
        const slider = document.getElementById(`weight-${dimension}`);
        if (slider) slider.value = '20';
      }
      updateWeightLabels();
      render();
    };
  }
  for (const dimension of GOVERNANCE_DIMENSIONS) {
    const slider = document.getElementById(`weight-${dimension}`);
    if (slider)
      slider.addEventListener('input', () => {
        updateWeightLabels();
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

  const bindingKey = `__ccusGovernanceComparisonBound_${lang}`;
  if (!window[bindingKey]) {
    window.addEventListener('compare-updated', render);
    window.addEventListener('storage', render);
    window[bindingKey] = true;
  }

  updateWeightLabels();
  render();
}

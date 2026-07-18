import {
  GOVERNANCE_DIMENSIONS,
  calculateDeploymentMetrics,
  calculateGlobalBenchmarks,
  calculateGovernanceCapability,
  isActivePolicy,
} from './governanceBenchmarking.mjs';
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
];

const copy = {
  zh: {
    dimensionLabels: [
      '经济激励',
      '法规制度',
      '市场机制',
      '战略规划',
      'MRV 与数据治理',
    ],
    contributorHeading: '治理核心贡献政策',
    operationalProjects: '在运设施',
    operational: '在运',
    construction: '在建',
    planned: '规划（未计入矩阵）',
    dimension: '对比维度',
    regKeys: [
      ['空隙归属权', 'pore_space_rights'],
      ['长期责任转移', 'liability_transfer'],
      ['责任期限', 'liability_period'],
      ['财务保证', 'financial_assurance'],
      ['审批周期', 'permitting_lead_time'],
      ['CO₂ 监管属性 / 法律定位', 'co2_definition'],
      ['跨国 / 跨境规则', 'cross_border_rules'],
    ],
    xAxis: '已承诺项目记录规模（在运 + 在建，Mtpa）',
    yAxis: '治理能力指数（满分 100）',
    governance: '治理能力指数',
    deployment: '已承诺项目记录规模',
    policyCount: '纳入现行政策',
    items: '项',
    quadrant: {
      'policy-led': '制度先行',
      'integrated-leaders': '协同领先',
      'foundation-building': '基础培育',
      'deployment-led': '工程先行',
    },
    policyPath: '/ccus-policy-hub/policy/',
  },
  en: {
    dimensionLabels: [
      'Economic Incentives',
      'Statutory & Regulatory',
      'Market Mechanisms',
      'Strategic Planning',
      'MRV & Data Governance',
    ],
    contributorHeading: 'Governance peak contributors',
    operationalProjects: 'operational facilities',
    operational: 'Operational',
    construction: 'Under construction',
    planned: 'Planned (excluded from matrix)',
    dimension: 'Dimension',
    regKeys: [
      ['Pore-space rights', 'pore_space_rights'],
      ['Long-term liability transfer', 'liability_transfer'],
      ['Liability period', 'liability_period'],
      ['Financial assurance', 'financial_assurance'],
      ['Permitting lead time', 'permitting_lead_time'],
      ['CO₂ legal classification', 'co2_definition'],
      ['Cross-border rules', 'cross_border_rules'],
    ],
    xAxis:
      'Committed project-record scale (operational + under construction, Mtpa)',
    yAxis: 'Governance capability index (/100)',
    governance: 'Governance capability index',
    deployment: 'Committed project-record scale',
    policyCount: 'Active policies included',
    items: '',
    quadrant: {
      'policy-led': 'Policy-led',
      'integrated-leaders': 'Integrated leaders',
      'foundation-building': 'Foundation building',
      'deployment-led': 'Deployment-led',
    },
    policyPath: '/ccus-policy-hub/en/policy/',
  },
};

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
const canonicalCountry = (value, countryMap) => countryMap[value]?.en || value;
const sameCountry = (left, right, countryMap) =>
  canonicalCountry(left, countryMap) === canonicalCountry(right, countryMap);

const countryDisplayName = (country, countryMap, lang) => {
  if (lang === 'en') return canonicalCountry(country, countryMap);
  if (countryMap[country]?.zh) return countryMap[country].zh;
  for (const [key, translations] of Object.entries(countryMap)) {
    if (translations?.en === country || key === country) {
      return translations?.zh || country;
    }
  }
  return country;
};

const getData = (id, key) => {
  const node = document.getElementById(id);
  if (!node) return [];
  try {
    return JSON.parse(node.dataset[key] || '[]');
  } catch {
    return [];
  }
};

const buildCountrySystem = ({
  country,
  policies,
  facilities,
  countryMap,
  profiles,
  lang,
  index,
}) => {
  const governance = calculateGovernanceCapability(policies);
  const deployment = calculateDeploymentMetrics(facilities);
  const peakAnalysis = Object.fromEntries(
    GOVERNANCE_DIMENSIONS.map((dimension) => [
      dimension,
      governance.dimensions[dimension].score,
    ])
  );
  const canonicalName = canonicalCountry(country, countryMap);
  const profile = profiles.find(
    (item) => canonicalCountry(item?.data?.id, countryMap) === canonicalName
  );

  return {
    country,
    canonicalCountry: canonicalName,
    displayCountry: countryDisplayName(country, countryMap, lang),
    color: colors[index % colors.length],
    governance,
    deployment,
    peakAnalysis,
    contributors: governance.contributors,
    regulatory: profile?.data?.regulatory || {
      pore_space_rights: 'Pending',
      liability_transfer: 'Pending',
      liability_period: 'Pending',
      financial_assurance: 'Pending',
      permitting_lead_time: 'Pending',
      co2_definition: 'Pending',
      cross_border_rules: 'Pending',
    },
  };
};

const buildGlobalSystems = (allPolicies, allFacilities, countryMap) => {
  const countries = [
    ...new Set(
      allPolicies
        .filter(isActivePolicy)
        .map((policy) => canonicalCountry(policy?.data?.country, countryMap))
        .filter(Boolean)
    ),
  ];

  return countries.map((country, index) =>
    buildCountrySystem({
      country,
      policies: allPolicies.filter(
        (policy) =>
          sameCountry(policy?.data?.country, country, countryMap) &&
          isActivePolicy(policy)
      ),
      facilities: allFacilities.filter((facility) =>
        sameCountry(facility?.data?.country, country, countryMap)
      ),
      countryMap,
      profiles: [],
      lang: 'en',
      index,
    })
  );
};

const renderContributors = (countrySystems, text) => {
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
            `<article class="relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-blue-500 dark:border-slate-800 dark:bg-slate-900"><div class="mb-3 flex items-start justify-between"><span class="text-[9px] font-black uppercase tracking-widest text-slate-400">${escapeHtml(policy.data.year)}</span><div class="flex gap-1">${GOVERNANCE_DIMENSIONS.map(
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
            )}</div></div><h4 class="mb-4 line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">${escapeHtml(policy.data.title)}</h4><div class="flex gap-1.5">${GOVERNANCE_DIMENSIONS.map(
              (dimension) => {
                const score = Number(
                  policy.data.analysis?.[dimension]?.score || 0
                );
                const peak = country.peakAnalysis[dimension];
                const active = score > 0 && score === peak;
                const barColor = active
                  ? dimensionColors[dimension]
                  : 'bg-slate-200 dark:bg-slate-800';
                return `<div class="flex-1"><div class="mb-1 h-1 overflow-hidden rounded-full bg-slate-50 dark:bg-slate-950"><div class="h-full ${barColor}" style="width:${Math.min(100, Math.max(0, score))}%"></div></div><div class="text-center text-[7px] font-black ${active ? 'text-slate-900 dark:text-white' : 'text-slate-400 opacity-50'}">${dimension.slice(0, 3).toUpperCase()}</div></div>`;
              }
            ).join(
              ''
            )}</div><a class="absolute inset-0" href="${text.policyPath}${encodeURIComponent(String(policy.id))}/" aria-label="${escapeHtml(policy.data.title)}"></a></article>`
        )
        .join('')}</div></section>`;
    })
    .join('<div class="my-8 h-px bg-slate-100 dark:bg-slate-800"></div>');
};

const renderFacilityStats = (countrySystems, text) => {
  const container = document.getElementById('stats-grid');
  if (!container) return;
  container.innerHTML = countrySystems
    .map(
      (country) =>
        `<article class="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/50" data-country-key="${escapeHtml(country.canonicalCountry)}"><div class="mb-4 flex items-center justify-between gap-3"><span class="font-bold text-slate-900 dark:text-white">${escapeHtml(country.displayCountry)}</span><span class="text-[10px] font-black text-blue-600">${country.deployment.operationalCount} ${text.operationalProjects}</span></div><div class="grid grid-cols-3 gap-2">${[
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
          .join('')}</div></article>`
    )
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
            .map(
              (country) =>
                `<td data-country-key="${escapeHtml(country.canonicalCountry)}" class="border-l border-slate-100 p-6 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-400">${escapeHtml(country.regulatory[key] || '---')}</td>`
            )
            .join('')}</tr>`
      )
      .join('');
  }
};

export function initGovernanceComparison(lang = 'zh') {
  const text = copy[lang] || copy.zh;

  const render = () => {
    const allPolicies = getData('all-policies-data', 'policies');
    const allFacilities = getData('all-facilities-data', 'facilities');
    const countryMap = getData('country-data', 'countries');
    const profiles = getData('countries-profiles-data', 'profiles');
    const selectedIds = JSON.parse(
      localStorage.getItem('compare-list') || '[]'
    );
    const selectedPolicies = allPolicies.filter((policy) =>
      selectedIds.includes(policy.id)
    );
    const selectedCountries = [
      ...new Set(
        selectedPolicies.map((policy) => policy?.data?.country).filter(Boolean)
      ),
    ];
    const scope = document.getElementById('analysis-scope')?.value || 'system';
    const container = document.getElementById('compare-container');
    const emptyState = document.getElementById('empty-state');

    if (!selectedCountries.length) {
      emptyState?.classList.remove('hidden');
      container?.classList.add('hidden');
      clearGovernanceAnalytics();
      return;
    }

    emptyState?.classList.add('hidden');
    container?.classList.remove('hidden');

    const policyPool = scope === 'selected' ? selectedPolicies : allPolicies;
    const countrySystems = selectedCountries.map((country, index) =>
      buildCountrySystem({
        country,
        policies: policyPool.filter(
          (policy) =>
            sameCountry(policy?.data?.country, country, countryMap) &&
            isActivePolicy(policy)
        ),
        facilities: allFacilities.filter((facility) =>
          sameCountry(facility?.data?.country, country, countryMap)
        ),
        countryMap,
        profiles,
        lang,
        index,
      })
    );
    const globalSystems = buildGlobalSystems(
      allPolicies,
      allFacilities,
      countryMap
    );
    const benchmarks = calculateGlobalBenchmarks(globalSystems);

    renderContributors(countrySystems, text);
    renderFacilityStats(countrySystems, text);
    renderRegulatoryMatrix(countrySystems, text);
    renderGovernanceAnalytics({ countrySystems, benchmarks, text, lang });
  };

  const clearButton = document.getElementById('clear-all');
  if (clearButton) {
    clearButton.onclick = () => {
      localStorage.removeItem('compare-list');
      window.dispatchEvent(new CustomEvent('compare-updated'));
      render();
    };
  }
  const printButton = document.getElementById('print-report');
  if (printButton) printButton.onclick = () => window.print();
  const scopeSelect = document.getElementById('analysis-scope');
  if (scopeSelect) scopeSelect.onchange = render;

  const bindingKey = `__ccusGovernanceComparisonBound_${lang}`;
  if (!window[bindingKey]) {
    window.addEventListener('compare-updated', render);
    window.addEventListener('storage', render);
    window[bindingKey] = true;
  }
  render();
}

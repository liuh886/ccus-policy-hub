/**
 * governanceCopy.mjs
 *
 * Single source for ALL governance-comparison UI copy (T2 convergence).
 * Three dictionaries, three consumers:
 *
 * - `governanceComparisonCopy` — static compare-page markup
 *   (GovernanceComparisonWorkspace.astro, GovernanceAnalyticsPanels.astro)
 * - `governanceClientCopy` — client-side computed panels, passed as `text`
 *   into renderGovernanceAnalytics (governanceComparisonClient.mjs)
 * - `governanceVisualsCopy` — evidence panel + insights strings inside the
 *   chart renderers (governanceWorkspaceVisuals.mjs)
 *
 * zh is the fallback language everywhere (`copy[lang] || copy.zh`); every
 * `en` block must carry exactly the same keys (enforced by
 * scripts/governance-copy.test.mjs). `policyPath`/`emptyHref` differ per lang
 * by design (URL prefix, not copy).
 */

const BASE = import.meta.env?.BASE_URL ?? '';

export const governanceComparisonCopy = Object.freeze({
  zh: Object.freeze({
    pageTitle: '政策对比分析',
    pageDescription:
      '以所选政策所属国家为入口，对现行治理体系、项目落地和关键监管机制进行横向分析。',
    clear: '清空选择',
    export: '导出分析报告 (PDF)',
    reportTitle: 'CCUS 政策对比分析简报',
    generated: '生成日期',
    capabilityEyebrow: '治理体系对标',
    capabilityTitle: '治理能力画像',
    capabilitySubtitle: '峰值政策强度',
    scopeTitle: '分析范围',
    scopeNote: '默认比较所选政策所属国家的全部现行政策体系。',
    scopeSystem: '国家现行政策体系',
    scopeSelected: '仅所选现行政策',
    matrixTitle: '治理—部署矩阵',
    matrixSubtitle: '治理能力 × 已承诺项目规模',
    benchmarkPrefix: '全球基准',
    benchmarkGovernanceLabel: '治理基准',
    benchmarkDeploymentLabel: '部署基准',
    benchmarkGovernance: '治理能力指数中位数',
    benchmarkDeployment: '有已承诺项目国家的项目记录规模中位数',
    benchmarkMethod: '治理能力指数为五个峰值维度的平均值。',
    qPolicy: '制度先行',
    qLeader: '协同领先',
    qFoundation: '基础培育',
    qDeployment: '工程先行',
    facilityTitle: '设施规模对标',
    facilityNote: '矩阵部署规模仅包括在运与在建设施；规划规模不计入横轴。',
    evidenceEyebrow: '证据与来源',
    contributors: '治理核心贡献政策',
    regulatory: '关键制度要素对标',
    emptyTitle: '暂未选择对比政策',
    emptyDescription:
      '请从政策数据库中选择多项政策（最多 5 项），再进入国家治理能力与项目落地对比。',
    emptyAction: '前往政策数据库',
    emptyHref: `${BASE}/policy/`,
    panels: Object.freeze({
      profileView: '画像视图',
      radar: '雷达图',
      heatmap: '热力矩阵',
      profileTab: '治理画像',
      deploymentTab: '治理—部署',
      evidenceTitle: '评分证据',
      evidenceEmpty:
        '点击雷达维度、热力单元格或国家散点，查看评分依据与贡献政策。',
      insightsTitle: '对比洞察',
      insightsSubtitle: '优势、短板与治理—部署位置',
    }),
  }),
  en: Object.freeze({
    pageTitle: 'Policy Comparison Analysis',
    pageDescription:
      'Use selected policies as entry points to compare active national governance systems, project deployment and critical regulatory mechanisms.',
    clear: 'Clear all',
    export: 'Export report (PDF)',
    reportTitle: 'CCUS Policy Comparison Brief',
    generated: 'Generated',
    capabilityEyebrow: 'Governance Capability Profile',
    capabilityTitle: 'Governance Capability Profile',
    capabilitySubtitle: 'Peak Policy Strength',
    scopeTitle: 'Analysis scope',
    scopeNote:
      'The default view benchmarks the active national policy systems behind the selected policies.',
    scopeSystem: 'Active national policy system',
    scopeSelected: 'Selected active policies only',
    matrixTitle: 'Governance–Deployment Matrix',
    matrixSubtitle:
      'Governance capability versus committed project-record scale',
    benchmarkPrefix: 'Global benchmark',
    benchmarkGovernanceLabel: 'Governance benchmark',
    benchmarkDeploymentLabel: 'Deployment benchmark',
    benchmarkGovernance: 'median governance capability',
    benchmarkDeployment:
      'median committed project-record scale among countries with committed projects',
    benchmarkMethod:
      'The governance capability index is the mean of five peak dimensions.',
    qPolicy: 'Policy-led',
    qLeader: 'Integrated leaders',
    qFoundation: 'Foundation building',
    qDeployment: 'Deployment-led',
    facilityTitle: 'Facility benchmarking',
    facilityNote:
      'The matrix deployment scale includes operational and under-construction facilities only; planned scale is excluded from the x-axis.',
    evidenceEyebrow: 'Evidence & provenance',
    contributors: 'Governance peak contributors',
    regulatory: 'Critical regulatory benchmarking',
    emptyTitle: 'No policies selected',
    emptyDescription:
      'Select up to five policies from the database to compare national governance capability and project deployment.',
    emptyAction: 'Go to policy database',
    emptyHref: `${BASE}/en/policy/`,
    panels: Object.freeze({
      profileView: 'Profile view',
      radar: 'Radar',
      heatmap: 'Heatmap',
      profileTab: 'Governance profile',
      deploymentTab: 'Governance–deployment',
      evidenceTitle: 'Scoring evidence',
      evidenceEmpty:
        'Select a radar dimension, heatmap cell or country point to inspect evidence and contributing policies.',
      insightsTitle: 'Comparison insights',
      insightsSubtitle: 'Strengths, gaps and governance–deployment position',
    }),
  }),
});

export const governanceClientCopy = Object.freeze({
  zh: Object.freeze({
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
    policyPath: `${BASE}/policy/`,
  }),
  en: Object.freeze({
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
    policyPath: `${BASE}/en/policy/`,
  }),
});

export const governanceVisualsCopy = Object.freeze({
  zh: Object.freeze({
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
    evidencePrompt:
      '点击雷达维度、热力单元格或国家散点，查看评分依据与贡献政策。',
    policyPath: `${BASE}/policy/`,
  }),
  en: Object.freeze({
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
    evidencePrompt:
      'Select a radar dimension, heatmap cell or country point to inspect evidence and contributing policies.',
    policyPath: `${BASE}/en/policy/`,
  }),
});

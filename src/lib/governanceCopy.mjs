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

// SITE_BASE strips the trailing slash; mirror that here so `${BASE}/policy/`
// never renders a double slash under a non-root Astro base.
const BASE = (import.meta.env?.BASE_URL ?? '').replace(/\/$/, '');

export const governanceComparisonCopy = Object.freeze({
  zh: Object.freeze({
    pageTitle: '政策对比分析',
    pageDescription:
      '以所选政策所属国家为入口，对现行治理体系、项目落地和关键监管机制进行横向分析。',
    clear: '清空选择',
    export: '导出分析报告 (PDF)',
    exportMenu: '导出',
    reportTitle: 'CCUS 政策对比分析简报',
    generated: '生成日期',
    capabilityEyebrow: '治理体系对标',
    capabilityTitle: '治理能力画像',
    capabilitySubtitle: '峰值政策强度',
    scopeTitle: '分析范围',
    scopeNote: '来自政策库勾选时可切换为“仅所选政策”。',
    scopeSystem: '国家现行政策体系',
    scopeSelected: '仅所选现行政策',
    matrixTitle: '治理—部署矩阵',
    matrixSubtitle: '治理能力 × 已承诺项目规模',
    benchmarkPrefix: '全球基准',
    benchmarkGovernanceLabel: '治理基准',
    benchmarkDeploymentLabel: '部署基准',
    benchmarkGovernance: '治理能力指数中位数',
    benchmarkDeployment:
      '有项目记录国家的项目记录规模中位数（默认已承诺口径，含规划时同步重算）',
    benchmarkMethod: '治理能力指数为五个峰值维度的平均值。',
    methodRegulatory:
      '监管明确列为 7 个制度要素中已给出明确安排的条目数；“尚未/暂无/研究中/待定”等不计入。',
    qPolicy: '制度先行',
    qLeader: '协同领先',
    qFoundation: '基础培育',
    qDeployment: '工程先行',
    facilityTitle: '设施部署结构',
    facilityNote: '按在运 + 在建设施统计行业与类型分布；规划管线不计入。',
    evidenceEyebrow: '证据与来源',
    contributors: '治理核心贡献政策',
    regulatory: '关键制度要素对标',
    regulatoryHint: '7 项制度要素全文对照，点击展开',
    emptyTitle: '暂未选择对比国家',
    emptyDescription:
      '当前未选择任何国家。可从下方预设组合一键载入，或展开“自选国家”选择最多 6 个国家，比较其现行治理体系、项目落地与监管机制。',
    emptyHint: '或从一个预设组合开始：',
    presetTitle: '预设对比组合',
    presetBig3: '中美欧三强',
    presetAnglo: '英语圈',
    presetGulf: '海湾新兴',
    presetNordic: '北欧封存圈',
    selectorLabel: '自选国家（最多 6 个）',
    selectorLimit: '最多选择 6 个国家，已忽略多余选择。',
    removeCountry: '移除',
    weightsTitle: '维度权重',
    weightsHint: '默认等权，可展开调整并同步重算基准',
    weightsReset: '重置权重',
    plannedToggle: '含规划管线',
    methodTitle: '方法与口径',
    methodPeak:
      '治理能力指数取各维度现行政策最高分（峰值法），默认等权平均；拖动权重滑杆可调整并同步重算全球基准与象限位置。',
    methodCapacity:
      '部署规模默认取在运 + 在建（已承诺）；勾选“含规划管线”后切换为在运 + 在建 + 规划，基准同步重算。',
    methodLink:
      '设施与政策为同一司法辖区关联，非项目级法律适用；评分证据链详见下方，数据质量见质量看板。',
    exportCsv: '导出计分卡 (CSV)',
    exportJson: '导出 JSON',
    copyCite: '复制引用',
    citedOk: '引用已复制',
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
        '点击雷达维度、热力单元格、矩阵散点或热力图行首国家名，查看评分依据与贡献政策。',
    }),
  }),
  en: Object.freeze({
    pageTitle: 'Policy Comparison Analysis',
    pageDescription:
      'Use selected policies as entry points to compare active national governance systems, project deployment and critical regulatory mechanisms.',
    clear: 'Clear all',
    export: 'Export report (PDF)',
    exportMenu: 'Export',
    reportTitle: 'CCUS Policy Comparison Brief',
    generated: 'Generated',
    capabilityEyebrow: 'Governance Capability Profile',
    capabilityTitle: 'Governance Capability Profile',
    capabilitySubtitle: 'Peak Policy Strength',
    scopeTitle: 'Analysis scope',
    scopeNote:
      'Switch to selected policies only when arriving from a policy selection.',
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
      'median project-record scale among countries with recorded projects (committed by default, recomputed with planned included)',
    benchmarkMethod:
      'The governance capability index is the mean of five peak dimensions.',
    methodRegulatory:
      'The regulatory column counts the seven elements with a stated operative arrangement; entries marked pending, under study or not yet defined are excluded.',
    qPolicy: 'Policy-led',
    qLeader: 'Integrated leaders',
    qFoundation: 'Foundation building',
    qDeployment: 'Deployment-led',
    facilityTitle: 'Facility deployment structure',
    facilityNote:
      'Sector and type mix for operational + under-construction facilities; the planned pipeline is excluded.',
    evidenceEyebrow: 'Evidence & provenance',
    contributors: 'Governance peak contributors',
    regulatory: 'Critical regulatory benchmarking',
    regulatoryHint:
      'Full text of the seven regulatory elements; expand to view',
    emptyTitle: 'No countries selected',
    emptyDescription:
      'No countries are selected. Load a preset below, or expand “Custom countries” to pick up to six and compare their active governance systems, project pipelines and regulatory mechanisms.',
    emptyHint: 'Or start from a preset:',
    presetTitle: 'Preset comparisons',
    presetBig3: 'CN–US–EU majors',
    presetAnglo: 'Anglophone',
    presetGulf: 'Gulf emerging',
    presetNordic: 'Nordic storage circle',
    selectorLabel: 'Custom countries (up to 6)',
    selectorLimit: 'Up to 6 countries; extra selections were ignored.',
    removeCountry: 'Remove',
    weightsTitle: 'Dimension weights',
    weightsHint:
      'Equal by default; expand to re-weight and recompute benchmarks',
    weightsReset: 'Reset weights',
    plannedToggle: 'Include planned pipeline',
    methodTitle: 'Method & scope',
    methodPeak:
      'The governance index takes the peak active-policy score per dimension (peak-strength method) with equal default weights; moving the weight sliders re-weights the index and recomputes global benchmarks and quadrant positions.',
    methodCapacity:
      'Deployment defaults to operational + under construction (committed); toggling “Include planned pipeline” switches to operational + under construction + planned, with benchmarks recomputed.',
    methodLink:
      'Facilities link to policies at the jurisdiction level, not as project-specific legal applicability; evidence chains are shown below, data quality on the quality dashboard.',
    exportCsv: 'Export scorecard (CSV)',
    exportJson: 'Export JSON',
    copyCite: 'Copy citation',
    citedOk: 'Citation copied',
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
        'Select a radar dimension, heatmap cell, matrix point or heatmap row label to inspect evidence and contributing policies.',
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
    dimensionShortLabels: ['激励', '法规', '市场', '战略', 'MRV'],
    operationalProjects: '在运设施',
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
    xAxisPlanned: '项目记录规模（含规划管线，Mtpa）',
    colCountry: '国家',
    colGovernance: '治理指数',
    colPolicies: '现行政策',
    colCommitted: '已承诺 Mtpa',
    colPlanned: '规划 Mtpa',
    colRegulatory: '监管明确',
    colQuadrant: '象限',
    regStated: '已明确',
    regPending: '待定',
    bySector: '分行业',
    byType: '分类型',
    otherGroup: '其他',
    showAllContributors: '展开全部贡献政策',
    collapse: '收起',
    timelineTitle: '治理演进时间线',
    timelineEmpty: '所选国家暂无已收录的政策里程碑。',
    timelineMilestones: '项里程碑',
    timelineEmptyCountry: '暂无已收录里程碑',
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
    dimensionShortLabels: [
      'Incentive',
      'Statutory',
      'Market',
      'Strategic',
      'MRV',
    ],
    operationalProjects: 'operational facilities',
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
    xAxisPlanned: 'Project-record scale (incl. planned pipeline, Mtpa)',
    colCountry: 'Country',
    colGovernance: 'Governance',
    colPolicies: 'Policies',
    colCommitted: 'Committed Mtpa',
    colPlanned: 'Planned Mtpa',
    colRegulatory: 'Regulatory clarity',
    colQuadrant: 'Quadrant',
    regStated: 'Stated',
    regPending: 'Pending',
    bySector: 'By sector',
    byType: 'By type',
    otherGroup: 'Other',
    showAllContributors: 'Show all contributing policies',
    collapse: 'Collapse',
    timelineTitle: 'Governance timeline',
    timelineEmpty: 'No recorded policy milestones for the selected countries.',
    timelineMilestones: ' milestones',
    timelineEmptyCountry: 'No recorded milestones yet',
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
    strongest: '优势维度',
    weakest: '主要短板',
    scoreEvidence: '评分依据',
    verifiedBadge: '已核验',
    draftBadge: '待核验',
    sourcePolicy: '贡献政策',
    evidenceMissing: '该记录暂未提供结构化评分依据。',
    citation: '证据来源',
    openPolicy: '查看政策记录',
    evidencePrompt:
      '点击雷达维度、热力单元格、矩阵散点或热力图行首国家名，查看评分依据与贡献政策。',
    policyPath: `${BASE}/policy/`,
  }),
  en: Object.freeze({
    strongest: 'Leading dimension',
    weakest: 'Main gap',
    scoreEvidence: 'Scoring evidence',
    verifiedBadge: 'Verified',
    draftBadge: 'Pending review',
    sourcePolicy: 'Contributing policy',
    evidenceMissing:
      'No structured scoring evidence is available for this record.',
    citation: 'Evidence source',
    openPolicy: 'Open policy record',
    evidencePrompt:
      'Select a radar dimension, heatmap cell, matrix point or heatmap row label to inspect evidence and contributing policies.',
    policyPath: `${BASE}/en/policy/`,
  }),
});

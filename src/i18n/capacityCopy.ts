import { UNDER_CONSTRUCTION_OPERATION_YEAR_CUTOFF } from '../lib/capacityMetrics.mjs';
import { t as translateUi, type Lang } from './ui';

export type CapacityTypeId =
  | 'capture'
  | 'transport'
  | 'ts'
  | 'storage'
  | 'full-chain'
  | 'ccu';

export interface CapacityTrendCopy {
  totalTitle: string;
  totalYearSuffix: string;
  totalNote: string;
  chartTitle: string;
  committedLabel: string;
  pipelineLabel: string;
  typeFilterTitle: string;
  operationalTitle: string;
  constructionTitle: string;
  storageSubsetLabel: string;
  storageSubsetNote: string;
  chartNote: string;
  chartErrorTitle: string;
  chartErrorNote: string;
  chartErrorAction: string;
  metricOpen: string;
  metricClose: string;
  countSuffix: string;
  activeViewBadge: string;
  minYearAriaLabel: string;
  maxYearAriaLabel: string;
  typeLabels: Record<CapacityTypeId, string>;
}

const CAPACITY_TREND_COPY: Record<
  Lang,
  Omit<
    CapacityTrendCopy,
    'chartErrorTitle' | 'chartErrorNote' | 'chartErrorAction'
  >
> = {
  zh: {
    totalTitle: '全球项目记录能力',
    totalYearSuffix: '估',
    totalNote:
      'Planned、Operational 与 Under construction 项目记录能力累计；排除 Cancelled / Decommissioned / Suspended。',
    chartTitle: '全球 CCUS 项目记录能力增长趋势',
    committedLabel: '确定性能力（在运+在建）',
    pipelineLabel: '公开管线（规划+在运+在建）',
    typeFilterTitle: '类型',
    operationalTitle: '在运设施（项目记录规模）',
    constructionTitle: `在建设施（预计 ${UNDER_CONSTRUCTION_OPERATION_YEAR_CUTOFF} 年及以前投运）`,
    storageSubsetLabel: '其中封存相关',
    storageSubsetNote: `封存相关包括 T&S、Storage 与 Full chain 项目记录；不等于净可交付地质封存能力。在建卡仅统计预计 ${UNDER_CONSTRUCTION_OPERATION_YEAR_CUTOFF} 年及以前投运记录，全量在建项目见下方项目格局面板。`,
    chartNote:
      '注：本图采用 project-record 口径，按 operation → FID → announcement 年份累计 Planned、Operational、Under construction 项目记录能力；Cancelled、Decommissioned、Suspended 被排除。筛选项覆盖 capture、transport、T&S、storage、full-chain、CCU。数值为跨类型项目记录能力加总，不代表净可交付捕集能力或净封存能力。',
    metricOpen: '（',
    metricClose: '）',
    countSuffix: '个',
    activeViewBadge: '视图激活',
    minYearAriaLabel: '有效时间范围起始年份',
    maxYearAriaLabel: '有效时间范围结束年份',
    typeLabels: {
      capture: '碳捕集 (Capture)',
      transport: '碳运输 (Transport)',
      ts: '运输与封存 (T&S)',
      storage: '地质封存 (Storage)',
      'full-chain': '全产业链 (Full chain)',
      ccu: '碳利用 (CCU)',
    },
  },
  en: {
    totalTitle: 'Global Project-Record Capacity',
    totalYearSuffix: ' Est.',
    totalNote:
      'Cumulative project-record capacity for Planned, Operational and Under construction records; Cancelled / Decommissioned / Suspended excluded.',
    chartTitle: 'CCUS Project-Record Capacity Growth',
    committedLabel: 'Committed (Operational + Under construction)',
    pipelineLabel: 'Pipeline (Planned + Operational + Under construction)',
    typeFilterTitle: 'Types',
    operationalTitle: 'Operational facilities (project-record scale)',
    constructionTitle: `Under-construction facilities (operating ≤${UNDER_CONSTRUCTION_OPERATION_YEAR_CUTOFF})`,
    storageSubsetLabel: 'Storage-related subset',
    storageSubsetNote: `Storage-related includes T&S, Storage and Full chain project records; it is not net deliverable geological storage capacity. The under-construction card counts records operating ≤${UNDER_CONSTRUCTION_OPERATION_YEAR_CUTOFF}; see Project Landscape below for all active under-construction records.`,
    chartNote:
      'Note: This chart uses a project-record methodology, accumulating Planned, Operational and Under construction records by operation → FID → announcement year; Cancelled, Decommissioned and Suspended records are excluded. The type filter covers capture, transport, T&S, storage, full-chain and CCU. Values aggregate project-record capacity across selected types and should not be interpreted as net deliverable capture or storage capacity.',
    metricOpen: '(',
    metricClose: ')',
    countSuffix: '',
    activeViewBadge: 'ACTIVE_VIEW',
    minYearAriaLabel: 'Minimum year in active range',
    maxYearAriaLabel: 'Maximum year in active range',
    typeLabels: {
      capture: 'Capture',
      transport: 'Transport',
      ts: 'T&S',
      storage: 'Storage',
      'full-chain': 'Full chain',
      ccu: 'CCU',
    },
  },
};

export function capacityTrendCopy(lang: Lang): CapacityTrendCopy {
  const base = lang === 'en' ? CAPACITY_TREND_COPY.en : CAPACITY_TREND_COPY.zh;
  return {
    ...base,
    // Error strings are shared keys in src/i18n/ui.ts (single source);
    // the client catch-block already falls back to the same keys.
    chartErrorTitle: translateUi(lang, 'capacity.error.title'),
    chartErrorNote: translateUi(lang, 'capacity.error.note'),
    chartErrorAction: translateUi(lang, 'capacity.error.action'),
  };
}

export const languages = {
  zh: '中文',
  en: 'English',
};

export const defaultLang = 'zh';

export type Lang = 'zh' | 'en';

/** Normalize any lang-ish input to a supported language. */
export function resolveLang(value: unknown): Lang {
  return value === 'en' ? 'en' : 'zh';
}

const zh = {
  'nav.home': '首页',
  'nav.policy': '政策数据库',
  'nav.map': '设施地图',
  'nav.compare': '对比分析',
  'nav.docs': '文档中心',
  'nav.search': '搜索',
  'footer.description':
    '全球 CCUS 政策数据库与分析平台，助力全球净零排放目标。',
  'footer.links': '快速链接',
  'footer.contact': '联系我们',
  'footer.contact_info': '如有建议或反馈，请通过文档中心的反馈渠道与我们联系。',
  'policy.filter.country': '所有国家',
  'policy.filter.type': '所有类型',
  'policy.search.placeholder': '搜索政策标题、内容或标签...',
  'compare.title': '政策对比分析',
  'compare.empty': '暂未选择对比项',
  'compare.btn': '立即对比',
  'map.title': '全球 CCUS 设施地图',
  'map.tip': '提示：点聚合区域可点击放大，查看具体项目',
  'stats.total': '总计项目',
  'stats.filtered': '符合条件',
  'stats.page': '页',
  'stats.of': '/',
  'home.console.title': '全球政策准入控制台',
  'home.console.subtitle': '全球政策情报矩阵',
  'home.console.description':
    '实时多维度跟踪全球 CCS/CCUS 监管框架、激励机制与市场准入要求。',
  'home.console.legend.financial': '直接财政激励',
  'home.console.legend.regulatory': '合规监管框架',
  'home.console.node.active': '监管框架活跃',
  'map.filter.status': '状态筛选',
  'map.filter.operational': '运行中',
  'map.filter.construction': '建设中',
  'map.filter.planned': '计划中',
  'map.filter.inactive': '其他 / 已取消',
  'map.filter.hint': '点击切换可见性',
  'map.error.title': '地图数据加载失败',
  'map.error.note':
    '页面内嵌的地图数据无法解析。请刷新页面重试；若仍然失败，欢迎反馈。',
  'map.error.action': '改为浏览设施列表',
  'map.error.fail': '地图加载失败',
  'map.popup.details': '查看详情',
  'map.popup.precision.label': '定位精度',
  'map.popup.precision.exact': '精确',
  'map.popup.precision.state': '省级/区域',
  'map.popup.precision.country': '国家级',
  'compare.selected': '项政策已选',
  'compare.reset': '重置',
  'compare.limit': '最多只能同时对比 5 项政策',
  'facility.card.location': '区域近似坐标',
  'facility.card.capacity': '年捕集规模',
  'facility.card.type': '设施类型',
  'facility.card.industry': '所属行业',
  'policy.card.verified.title': '已核验记录',
  'policy.card.verified': '已核验',
  'policy.card.funding': '资金规模',
  'capacity.error.title': '趋势图加载失败',
  'capacity.error.note':
    '图表数据无法渲染。请刷新页面重试；若仍然失败，欢迎反馈。',
  'capacity.error.action': '改为浏览设施列表',
};

export type UiKey = keyof typeof zh;

const en: Record<UiKey, string> = {
  'nav.home': 'Home',
  'nav.policy': 'Policy Database',
  'nav.map': 'Facility Map',
  'nav.compare': 'Comparison',
  'nav.docs': 'Documentation',
  'nav.search': 'Search',
  'footer.description':
    'Global CCUS Policy Database & Analysis Platform, supporting global net-zero goals.',
  'footer.links': 'Quick Links',
  'footer.contact': 'Contact Us',
  'footer.contact_info':
    'For suggestions or feedback, please contact us through the feedback channel in the Documentation Center.',
  'policy.filter.country': 'All Countries',
  'policy.filter.type': 'All Types',
  'policy.search.placeholder': 'Search titles, content or tags...',
  'compare.title': 'Policy Comparison Analysis',
  'compare.empty': 'No items selected',
  'compare.btn': 'Compare Now',
  'map.title': 'Global CCUS Facility Map',
  'map.tip': 'Tip: Click markers to view facility details',
  'stats.total': 'Total Projects',
  'stats.filtered': 'Matching',
  'stats.page': 'Page',
  'stats.of': 'of',
  'home.console.title': 'Policy Access Console',
  'home.console.subtitle': 'Global Policy Intelligence Matrix',
  'home.console.description':
    'Real-time multi-dimensional tracking of CCS/CCUS regulatory frameworks and incentives.',
  'home.console.legend.financial': 'Direct Financial Incentives',
  'home.console.legend.regulatory': 'Regulatory Compliance',
  'home.console.node.active': 'Framework Active',
  'map.filter.status': 'Status Filter',
  'map.filter.operational': 'Operational',
  'map.filter.construction': 'Under Construction',
  'map.filter.planned': 'Planned',
  'map.filter.inactive': 'Inactive / Other',
  'map.filter.hint': 'Click to toggle visibility',
  'map.error.title': 'Map data failed to load',
  'map.error.note':
    'The embedded map payload could not be read. Please refresh the page, or report the issue if it persists.',
  'map.error.action': 'Browse the facility list instead',
  'map.error.fail': 'Map failed to load',
  'map.popup.details': 'Details',
  'map.popup.precision.label': 'Precision',
  'map.popup.precision.exact': 'exact',
  'map.popup.precision.state': 'state',
  'map.popup.precision.country': 'country',
  'compare.selected': 'policies selected',
  'compare.reset': 'Reset',
  'compare.limit': 'You can compare up to 5 policies.',
  'facility.card.location': 'Approximate location',
  'facility.card.capacity': 'Capacity',
  'facility.card.type': 'Type',
  'facility.card.industry': 'Industry',
  'policy.card.verified.title': 'Verified record',
  'policy.card.verified': 'Verified',
  'policy.card.funding': 'Funding scale',
  'capacity.error.title': 'Trend chart failed to load',
  'capacity.error.note':
    'The chart data could not be rendered. Please refresh the page; report the issue if it persists.',
  'capacity.error.action': 'Browse the facility list instead',
};

export const ui = { zh, en } as const;

/**
 * Key-based UI lookup with zh fallback. Missing keys fall back to zh so a
 * partially translated `en` dict can never render an empty string.
 */
export function t(lang: unknown, key: UiKey): string {
  const resolved = resolveLang(lang);
  return ui[resolved][key] || ui[defaultLang][key];
}

/**
 * Positional-pair helper for page-local strings that are not worth promoting
 * to shared keys: `const tp = makePair(lang); tp('你好', 'Hello')`.
 */
export function makePair(lang: unknown): (zh: string, en: string) => string {
  const isEn = resolveLang(lang) === 'en';
  return (zhText: string, enText: string) => (isEn ? enText : zhText);
}

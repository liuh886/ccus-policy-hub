/**
 * comparePresentation.mjs
 *
 * Pure presentation helpers for the /compare/ workspace. Kept free of DOM,
 * copy dictionaries and data access so scripts/compare-presentation.test.mjs
 * can lock the regulatory-clarity heuristic and the progressive-disclosure
 * limits that shape the page.
 *
 * Scope note: `isPendingRegulatory` is a *presentation* heuristic over the
 * free-text regulatory entries (binary "stated / pending" dotting approved in
 * docs/compare-evaluation-and-redesign-proposal.md §4 L4). It never feeds the
 * governance capability index.
 */

// Absence / in-progress signals across zh + en regulatory entries. Chinese
// entries dominate the zh payload, English the en payload, but both patterns
// are applied to both so translations stay consistent.
const PENDING_PATTERN =
  /pending|tbd|to be determined|not yet|currently (none|no)|no (formal|specific|unified|mandatory|national|dedicated|independent)|under (study|review|development|consideration|preparation)|being (studied|developed|reviewed|considered|drafted)|explor|尚未|尚无|暂无|暂未|未明确|未界定|未具体说明|未说明|未定义|待定|待进一步|研究中|讨论中|起草中|制定中|开发中|正在修订|正在研究|正在探索|探索|拟议|考虑中/i;

export function isPendingRegulatory(value) {
  const raw = String(value || '').trim();
  if (!raw) return true;
  return PENDING_PATTERN.test(raw);
}

// Raw `legalWeight` frontmatter values are English enum-ish strings. zh pages
// render short localized tiers; unmapped values fall back to the raw label so
// new frontmatter never disappears silently.
export const LEGAL_WEIGHT_LABELS_ZH = Object.freeze({
  'Primary Legislation': '法律',
  'Act of Parliament': '议会立法',
  'Law (RIGI)': '法律（RIGI）',
  'Law No. 7552': '法律（第 7552 号）',
  Decree: '法令',
  'Presidential Decree': '总统令',
  'Federal Decree': '联邦法令',
  'EU Regulation': '欧盟法规',
  'Federal Tax Legislation': '联邦税法',
  'Administrative Regulation': '行政法规',
  'Regulatory Directive': '监管指令',
  'Departmental Rules': '部门规章',
  'Departmental Circular': '部门通知',
  'Market Rule': '市场规则',
  'Storage Permit': '封存许可',
  'Licensing Round': '许可轮次',
  'National Strategy': '国家战略',
  'Strategic Guidance': '战略指引',
  'National Guidance': '国家指引',
  'Policy Roadmap': '政策路线图',
  'Strategic Technology Roadmap': '技术路线图',
  'Executive Order/Framework': '行政令/框架',
  'Guideline/Policy': '指南/政策',
  Guideline: '指南',
  'Ministerial Work Plan approved by the State Council':
    '部委工作计划（国务院批准）',
  'National Standard': '国家标准',
  'National Recommended Standards': '国家推荐标准',
  'Technical Standard': '技术标准',
  'Voluntary Standard': '自愿性标准',
  'Voluntary Carbon Crediting Methodology': '自愿碳信用方法学',
  'International Inventory Guideline': '国际清单指南',
  'EU Funding Programme': '欧盟资助计划',
  'State Aid Scheme': '国家援助计划',
  'Fiscal Incentive': '财税激励',
  'Structural Monetary Policy Instrument': '结构性货币政策工具',
  'Government Contractual Support Framework': '政府合同支持框架',
  'Federal Statutory Finance Program': '联邦法定融资计划',
  'European Commission Communication': '欧盟委员会通函',
});

export function localizeLegalWeight(value, lang = 'zh') {
  const raw = String(value || '').trim();
  if (!raw || lang === 'en') return raw;
  return LEGAL_WEIGHT_LABELS_ZH[raw] || raw;
}

export const CONTRIBUTOR_VISIBLE_LIMIT = 3;

/**
 * Single source for the progressive-disclosure button label. The initial
 * render and the click handler both go through here so the count can never
 * drift (the handler previously counted a stale `.contributor-card` selector
 * and collapsed to "… · 0").
 */
export function contributorToggleLabel(expanded, total, text = {}) {
  return expanded
    ? text.collapse
    : `${text.showAllContributors} · ${Math.max(0, Number(total) || 0)}`;
}

export function splitContributors(
  contributors = [],
  limit = CONTRIBUTOR_VISIBLE_LIMIT
) {
  const list = Array.isArray(contributors) ? contributors : [];
  const safeLimit = Math.max(0, Number(limit) || 0);
  return {
    visible: list.slice(0, safeLimit),
    extra: list.slice(safeLimit),
    total: list.length,
    hiddenCount: Math.max(0, list.length - safeLimit),
  };
}

export const TIMELINE_OPEN_THRESHOLD = 6;

/**
 * Collect `evolution.milestones` per country in ascending date order.
 * Countries without milestones stay in the result so the UI can say so.
 */
export function buildTimelineGroups(countrySystems = []) {
  return (Array.isArray(countrySystems) ? countrySystems : []).map(
    (country) => {
      const items = [];
      for (const policy of country?.policyList || []) {
        const milestones = policy?.data?.evolution?.milestones;
        if (!Array.isArray(milestones)) continue;
        for (const milestone of milestones) {
          if (!milestone?.date || !milestone?.event) continue;
          items.push({
            date: String(milestone.date),
            event: String(milestone.event),
          });
        }
      }
      items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      return {
        country: country?.canonicalCountry || country?.country || '',
        displayCountry: country?.displayCountry || '',
        color: country?.color?.border || '',
        items,
        total: items.length,
        firstDate: items[0]?.date || '',
        lastDate: items[items.length - 1]?.date || '',
      };
    }
  );
}

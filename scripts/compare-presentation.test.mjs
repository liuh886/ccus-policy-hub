/**
 * compare-presentation.test.mjs
 *
 * Locks the presentational heuristics behind /compare/ (progressive
 * disclosure limits, the binary regulatory-clarity dotting and the
 * legalWeight localization) so future copy/UI edits keep their semantics.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  CONTRIBUTOR_VISIBLE_LIMIT,
  LEGAL_WEIGHT_LABELS_ZH,
  buildTimelineGroups,
  contributorToggleLabel,
  isPendingRegulatory,
  localizeLegalWeight,
  makeCountryComparator,
  rankByGovernance,
  splitContributors,
} from '../src/lib/comparePresentation.mjs';

describe('isPendingRegulatory', () => {
  it('treats empty entries as pending', () => {
    assert.equal(isPendingRegulatory(''), true);
    assert.equal(isPendingRegulatory(null), true);
    assert.equal(isPendingRegulatory('   '), true);
  });

  it('flags absence or in-progress signals from real entries', () => {
    for (const value of [
      '待定',
      'Pending',
      '尚未明确规定',
      '暂无强制性财务保证机制',
      '尚无统一法定定义',
      '尚无独立 CCS 法定类别',
      '目前尚无正式的国家转移机制',
      '目前由运营商承担，国家储备金机制研究中',
      '机制研究中',
      '法规未界定；遵循良好油田规范',
      '正在探索碳基金/每吨处理费用于监测',
      '探索通过向运营商征收费用建立闭坑后管理基金',
      '统一的联邦政策正在起草中',
      '开发中（PSC 修订）',
      '讨论中；预计将与国际标准保持一致',
      '正在修订禁令',
      'not yet defined',
      'under development (PSC amendment)',
    ]) {
      assert.equal(isPendingRegulatory(value), true, value);
    }
  });

  it('keeps concrete arrangements as stated', () => {
    for (const value of [
      '国家所有（宪法规定地下资源归国家所有）',
      '是，转移给省（PICS 基金）',
      '闭坑后至少 20 年监测期',
      '2-4 年 (试点和研究阶段)',
      '强制性（退役基金）',
      '省级管辖权；已纳入碳氢化合物减排计划',
      '2-3 年 (与上游油气许可整合)',
    ]) {
      assert.equal(isPendingRegulatory(value), false, value);
    }
  });
});

describe('localizeLegalWeight', () => {
  it('maps raw frontmatter values to localized tiers', () => {
    assert.equal(localizeLegalWeight('Primary Legislation', 'zh'), '法律');
    assert.equal(
      localizeLegalWeight('Administrative Regulation', 'zh'),
      '行政法规'
    );
    assert.equal(localizeLegalWeight('Departmental Rules', 'zh'), '部门规章');
    assert.equal(localizeLegalWeight('Strategic Guidance', 'zh'), '战略指引');
  });

  it('passes raw values through for en and unmapped keys', () => {
    assert.equal(
      localizeLegalWeight('Primary Legislation', 'en'),
      'Primary Legislation'
    );
    assert.equal(
      localizeLegalWeight('Brand New Instrument', 'zh'),
      'Brand New Instrument'
    );
    assert.equal(localizeLegalWeight('', 'zh'), '');
  });

  it('covers every distinct value currently exported from the DB', () => {
    const observed = [
      'National Strategy',
      'Federal Decree',
      'Guideline/Policy',
      'Law (RIGI)',
      'Primary Legislation',
      'Regulatory Directive',
      'Departmental Rules',
      'Administrative Regulation',
      'Strategic Guidance',
      'National Standard',
      'Strategic Technology Roadmap',
      'Guideline',
      'Ministerial Work Plan approved by the State Council',
      'Technical Standard',
      'Structural Monetary Policy Instrument',
      'National Recommended Standards',
      'National Guidance',
      'State Aid Scheme',
      'EU Regulation',
      'European Commission Communication',
      'EU Funding Programme',
      'Voluntary Standard',
      'International Inventory Guideline',
      'Storage Permit',
      'Presidential Decree',
      'Executive Order/Framework',
      'Fiscal Incentive',
      'Policy Roadmap',
      'Licensing Round',
      'Departmental Circular',
      'Law No. 7552',
      'Market Rule',
      'Government Contractual Support Framework',
      'Federal Tax Legislation',
      'Federal Statutory Finance Program',
      'Voluntary Carbon Crediting Methodology',
      'Decree',
      'Act of Parliament',
    ];
    for (const value of observed) {
      assert.ok(LEGAL_WEIGHT_LABELS_ZH[value], `missing zh label for ${value}`);
    }
  });
});

describe('contributorToggleLabel', () => {
  const text = {
    collapse: '收起',
    showAllContributors: '展开全部贡献政策',
  };

  it('shows the contributor count when collapsed', () => {
    assert.equal(
      contributorToggleLabel(false, 7, text),
      '展开全部贡献政策 · 7'
    );
  });

  it('shows the collapse label when expanded', () => {
    assert.equal(contributorToggleLabel(true, 7, text), '收起');
  });

  it('never renders a zero count from a missing total', () => {
    // Regression: the click handler used to count a stale selector and
    // collapsed to "… · 0".
    assert.equal(
      contributorToggleLabel(false, undefined, text),
      '展开全部贡献政策 · 0'
    );
    assert.equal(
      contributorToggleLabel(false, 3, text),
      '展开全部贡献政策 · 3'
    );
  });
});

describe('rankByGovernance', () => {
  const systems = [
    { displayCountry: 'China', governance: { index: 92 } },
    { displayCountry: 'Norway', governance: { index: 97 } },
    { displayCountry: 'US', governance: { index: 97 } },
    { displayCountry: 'UK', governance: { index: 94 } },
  ];

  it('sorts descending by governance index', () => {
    const ranked = rankByGovernance(systems);
    assert.deepEqual(
      ranked.map((entry) => entry.country.displayCountry),
      ['Norway', 'US', 'UK', 'China']
    );
  });

  it('gives tied indices a shared standard-competition rank', () => {
    const ranked = rankByGovernance(systems);
    assert.deepEqual(
      ranked.map((entry) => entry.rank),
      [1, 1, 3, 4]
    );
  });

  it('handles empty and missing input', () => {
    assert.deepEqual(rankByGovernance([]), []);
    assert.deepEqual(rankByGovernance(undefined), []);
  });

  it('does not mutate the input order', () => {
    const before = systems.map((entry) => entry.displayCountry);
    rankByGovernance(systems);
    assert.deepEqual(
      systems.map((entry) => entry.displayCountry),
      before
    );
  });
});

describe('makeCountryComparator', () => {
  const a = { displayCountry: 'A', governance: { index: 90 } };
  const b = { displayCountry: 'B', governance: { index: 80 } };
  const c = { displayCountry: 'C', governance: { index: 90 } };

  it('orders numbers by direction', () => {
    const desc = [b, a].sort(
      makeCountryComparator((x) => x.governance.index, 'desc')
    );
    assert.deepEqual(
      desc.map((x) => x.displayCountry),
      ['A', 'B']
    );
    const asc = [b, a].sort(
      makeCountryComparator((x) => x.governance.index, 'asc')
    );
    assert.deepEqual(
      asc.map((x) => x.displayCountry),
      ['B', 'A']
    );
  });

  it('breaks ties with higher governance first regardless of direction', () => {
    const asc = [c, a].sort(makeCountryComparator(() => 1, 'asc'));
    assert.deepEqual(
      asc.map((x) => x.displayCountry),
      ['A', 'C']
    );
  });

  it('orders strings lexicographically', () => {
    const list = [
      { displayCountry: 'Z', governance: { index: 1 } },
      { displayCountry: 'A', governance: { index: 2 } },
    ];
    const sorted = list.sort(
      makeCountryComparator((x) => x.displayCountry, 'asc')
    );
    assert.deepEqual(
      sorted.map((x) => x.displayCountry),
      ['A', 'Z']
    );
  });
});

describe('splitContributors', () => {
  it('keeps the first three visible and hides the rest', () => {
    const list = [1, 2, 3, 4, 5];
    const split = splitContributors(list);
    assert.deepEqual(split.visible, [1, 2, 3]);
    assert.deepEqual(split.extra, [4, 5]);
    assert.equal(split.total, 5);
    assert.equal(split.hiddenCount, 2);
    assert.equal(CONTRIBUTOR_VISIBLE_LIMIT, 3);
  });

  it('handles short and missing lists', () => {
    assert.deepEqual(splitContributors([1]).extra, []);
    assert.equal(splitContributors([1]).hiddenCount, 0);
    assert.equal(splitContributors(undefined).total, 0);
  });
});

describe('buildTimelineGroups', () => {
  const systems = [
    {
      canonicalCountry: 'Norway',
      displayCountry: '挪威',
      color: { border: 'rgb(1,2,3)' },
      policyList: [
        {
          data: {
            evolution: {
              milestones: [
                { date: '2024-06', event: 'Longship 投运' },
                { date: '2019-01', event: 'CCS 战略' },
              ],
            },
          },
        },
      ],
    },
    {
      canonicalCountry: 'Iceland',
      displayCountry: '冰岛',
      color: { border: 'rgb(4,5,6)' },
      policyList: [],
    },
  ];

  it('sorts milestones ascending and reports the date range', () => {
    const [norway] = buildTimelineGroups(systems);
    assert.deepEqual(
      norway.items.map((item) => item.date),
      ['2019-01', '2024-06']
    );
    assert.equal(norway.total, 2);
    assert.equal(norway.firstDate, '2019-01');
    assert.equal(norway.lastDate, '2024-06');
  });

  it('keeps countries without milestones so the UI can say so', () => {
    const [, iceland] = buildTimelineGroups(systems);
    assert.equal(iceland.total, 0);
    assert.deepEqual(iceland.items, []);
  });

  it('ignores malformed milestones', () => {
    const groups = buildTimelineGroups([
      {
        canonicalCountry: 'X',
        policyList: [
          { data: { evolution: { milestones: [{ date: '2020' }, 'junk'] } } },
          { data: { evolution: { milestones: [{ event: 'no date' }] } } },
        ],
      },
    ]);
    assert.equal(groups[0].total, 0);
  });
});

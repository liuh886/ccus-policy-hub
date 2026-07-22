import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assessPolicyContent,
  renderMarkdown,
} from './audit-policy-content-depth.mjs';

function localized(overrides = {}) {
  return {
    title: 'Policy title',
    description:
      'A sufficiently detailed policy description explaining the instrument, implementation mechanism, policy boundary, responsible authority, project relevance and limitations. '.repeat(
        5
      ),
    scope:
      'National policy scope covering the relevant CCUS value-chain activity and regulated participants.',
    tags_json: JSON.stringify(['CCS', 'permitting', 'MRV', 'infrastructure']),
    impact_analysis_json: JSON.stringify({
      economic:
        'Provides a policy-specific explanation of financing, compliance costs and investment effects.',
      technical:
        'Explains the technical obligations, interfaces, monitoring requirements and implementation conditions.',
      environmental:
        'Explains containment, emissions-accounting and environmental-integrity implications.',
    }),
    evolution_json: JSON.stringify({
      milestones: [
        { date: '2024-01-01', event: 'Policy adopted.' },
        { date: '2025-01-01', event: 'Implementation guidance issued.' },
      ],
    }),
    regulatory_json: JSON.stringify({
      permitting_lead_time: 'Project-specific statutory process applies.',
    }),
    ...overrides,
  };
}

function analysis(evidence) {
  return ['incentive', 'statutory', 'market', 'strategic', 'mrv'].map(
    (dimension) => ({
      dimension,
      evidence,
    })
  );
}

test('well-developed bilingual policy content is healthy', () => {
  const result = assessPolicyContent({
    id: 'good-policy',
    country: 'Example',
    year: 2025,
    review_status: 'verified',
    category: 'Regulatory',
    locales: {
      en: localized(),
      zh: localized({
        title: '政策标题',
        description:
          '该政策说明了政策工具、实施机制、适用边界、主管部门、项目相关性及其限制条件，并对捕集、运输、封存和核算环节的影响作出具体解释。'.repeat(
            5
          ),
        scope: '适用于国家层面的CCUS价值链活动及相关受监管主体。',
      }),
    },
    analysis: analysis(
      'The policy establishes specific obligations, implementation procedures, responsible authorities and evidence requirements for the assessed governance dimension.'
    ),
  });

  assert.equal(result.severity, 'healthy');
  assert.ok(result.score >= 80);
  assert.equal(result.metrics.placeholderAnalysisCount, 0);
});

test('thin descriptions and placeholder analysis are critical', () => {
  const result = assessPolicyContent({
    id: 'thin-policy',
    country: 'Example',
    year: 2020,
    review_status: 'verified',
    category: 'Strategic',
    locales: {
      en: localized({
        description: 'Supports CCS deployment.',
        scope: '',
        tags_json: '[]',
        impact_analysis_json: '{}',
        evolution_json: '{}',
      }),
      zh: localized({
        title: '薄弱政策',
        description: '支持CCS发展。',
        scope: '',
        tags_json: '[]',
        impact_analysis_json: '{}',
        evolution_json: '{}',
      }),
    },
    analysis: analysis('No direct incentive found.'),
  });

  assert.equal(result.severity, 'critical');
  assert.ok(result.flags.includes('placeholder-analysis'));
  assert.equal(result.metrics.placeholderAnalysisCount, 5);
});

test('markdown output contains the priority queue', () => {
  const markdown = renderMarkdown({
    asOf: '2026-07-22',
    totalPolicies: 1,
    severityCounts: { critical: 1, high: 0, medium: 0, healthy: 0 },
    verifiedNeedsWork: 1,
    medianScore: 20,
    assessments: [
      {
        id: 'thin-policy',
        country: 'Example',
        reviewStatus: 'verified',
        score: 20,
        severity: 'critical',
        flags: ['short-en-description'],
        titles: { en: 'Thin Policy', zh: '薄弱政策' },
      },
    ],
  });

  assert.match(markdown, /Priority queue/);
  assert.match(markdown, /thin-policy/);
});

import Ajv from 'ajv';
import {
  candidateSchema,
  auditExtraction,
  reviewHash,
  validateReviewPack,
} from './extraction-review.mjs';

const text = { type: 'string', minLength: 1, pattern: '\\S' };
const object = (properties) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const candidate = candidateSchema.properties.outputs.items;
const {
  id: _id,
  case_id: _case,
  decision: _decision,
  ...expectationProperties
} = candidate.properties;
export const referenceDraftSchema = object({
  profile: { const: 'extraction-reference-draft-v1' },
  pack_sha256: candidateSchema.properties.pack_sha256,
  authorship: { const: 'agent_draft' },
  cases: {
    type: 'array',
    minItems: 1,
    items: object({
      case_id: text,
      expectations: {
        type: 'array',
        minItems: 1,
        items: object({ id: text, ...expectationProperties }),
      },
      required_checks: {
        type: 'array',
        minItems: 1,
        items: object({ id: text, description: text }),
      },
      must_not_infer: { type: 'array', minItems: 1, items: text },
    }),
  },
});
const validate = new Ajv({ allErrors: true }).compile(referenceDraftSchema);

export function prepareReferenceReview(pack, draft) {
  validateReviewPack(pack);
  if (!validate(draft))
    throw new Error(
      'Reference draft schema rejected; only agent drafts are accepted.'
    );
  if (draft.pack_sha256 !== pack.pack_sha256)
    throw new Error('Reference draft belongs to another source pack.');
  const expected = new Set(pack.cases.map((c) => c.id));
  const ids = new Set();
  const outputs = [];
  for (const item of draft.cases) {
    if (!expected.delete(item.case_id))
      throw new Error('Unknown or duplicate reference case.');
    const checkIds = new Set();
    for (const check of item.required_checks) {
      if (checkIds.has(check.id))
        throw new Error('Duplicate reference check ID.');
      checkIds.add(check.id);
    }
    for (const expectation of item.expectations) {
      const id = `${item.case_id}::${expectation.id}`;
      if (ids.has(id)) throw new Error('Duplicate reference expectation ID.');
      ids.add(id);
      outputs.push({
        ...expectation,
        id,
        case_id: item.case_id,
        decision: 'extract',
      });
    }
  }
  if (expected.size)
    throw new Error(
      'Reference draft must explicitly cover every selected case.'
    );
  const audit = auditExtraction(pack, {
    profile: pack.profile,
    pack_sha256: pack.pack_sha256,
    model_id: 'agent-authored-reference-draft-no-benchmark-run',
    generation_settings: {},
    outputs,
  });
  if (audit.summary.blocked)
    throw new Error(
      'Reference draft has blocked quotation, version or evidence declarations.'
    );
  return {
    profile: 'extraction-reference-review-v1',
    visibility: 'private_evaluation_only',
    pack_sha256: pack.pack_sha256,
    reference_draft_sha256: reviewHash(draft),
    authorship: 'agent_draft',
    human_review_status: 'not_reviewed',
    gold_status: 'not_annotated',
    knowledge_accuracy: null,
    cases: draft.cases.map((item) => ({
      case_id: item.case_id,
      source_identity_review: 'not_reviewed',
      source_edition_review: 'not_reviewed',
      expectations: item.expectations.map((expectation) => ({
        ...expectation,
        reference_id: `${item.case_id}::${expectation.id}`,
        semantic_support: 'not_reviewed',
        qualifier_retention: 'not_reviewed',
        atomicity: 'not_reviewed',
        reviewer_notes: null,
        locators: audit.results.find(
          (r) => r.candidate_id === `${item.case_id}::${expectation.id}`
        ).verified_unit_locators,
      })),
      required_checks: item.required_checks.map((check) => ({
        ...check,
        status: 'not_reviewed',
        reviewer_notes: null,
      })),
      must_not_infer: item.must_not_infer,
      missing_reference_propositions: null,
      reviewer_notes: null,
    })),
  };
}

export function referenceReviewMarkdown(review) {
  const lines = [
    '# 参考命题审核草稿',
    '',
    'AI 起草；不是人工 gold，也未批准任何命题。引文定位通过仅表示完整性可核对。',
    '',
    `输入包：${review.pack_sha256}`,
    `草稿：${review.reference_draft_sha256}`,
    '',
    '先核对原件身份和版次，再逐项核对命题支持、限定条件、原子性及遗漏。所有项目均未审核；填写意见不会自动发布或写入数据库。',
    '',
  ];
  for (const item of review.cases) {
    lines.push(
      `## ${item.case_id}`,
      '',
      '来源身份：未审核；版次：未审核。',
      ''
    );
    for (const expectation of item.expectations) {
      lines.push(
        `### ${expectation.id}`,
        '',
        expectation.statement,
        '',
        `范围：${expectation.scope.coverage}；版次：${expectation.scope.edition ?? 'unknown'}；现行性未核实。`,
        '',
        ...expectation.evidence.map((e) => `引文（${e.unit_id}）：${e.quote}`),
        '',
        `缺少上下文：${expectation.missing_context.join('；') || '草稿未列出，仍需复核'}`,
        '',
        '- [ ] 命题获得原文支持',
        '- [ ] 关键限定条件齐全',
        '- [ ] 命题粒度合理',
        '审核意见：待填写。',
        ''
      );
    }
    lines.push(
      '逐项检查：',
      '',
      ...item.required_checks.map((c) => `- [ ] ${c.id}：${c.description}`),
      '',
      '禁止据此推断：',
      '',
      ...item.must_not_infer.map((v) => `- ${v}`),
      '',
      '遗漏的参考命题：待人工填写（空白不代表无遗漏）。',
      ''
    );
  }
  return lines.join('\n') + '\n';
}

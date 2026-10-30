import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash } from '../consume-agent-data.mjs';
import { queryRows } from './sqlite-query.mjs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const strict = (properties, required = Object.keys(properties)) => ({
  type: 'object',
  additionalProperties: false,
  required,
  properties,
});
const text = { type: 'string', minLength: 1 };
const digest = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const nullableText = { type: ['string', 'null'] };
const review = { enum: ['draft', 'verified'] };
export const catalogSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  ...strict({
    schema_version: { const: '1.0.0' },
    source_db_sha256: digest,
    inputs: strict({
      captured_pdf_metadata_sha256: digest,
      existing_evidence_index_sha256: digest,
    }),
    count: { type: 'integer', minimum: 0 },
    records: {
      type: 'array',
      items: strict({
        document_id: { type: 'string', pattern: '^[a-z0-9-]+$' },
        title: strict({ en: text, zh: text }),
        title_translation_status: { const: 'draft' },
        publisher: text,
        source_kind: { enum: ['legislation', 'secondary_report'] },
        language: { const: 'en' },
        edition: nullableText,
        source_url: { type: 'string', format: 'uri', pattern: '^https://' },
        raw_sha256: digest,
        coverage: {
          enum: [
            'historical_snapshot',
            'original_enactment',
            'edition_unknown',
          ],
        },
        currentness: { const: 'not_verified' },
        access: { enum: ['public_frozen_text', 'private_original_metadata'] },
        identity_review_status: review,
        policy_links: {
          type: 'array',
          items: strict({ policy_id: text, status: { const: 'candidate' } }),
        },
        locators: {
          type: 'array',
          minItems: 1,
          items: strict({
            id: text,
            kind: { enum: ['html_quote', 'pdf_page'] },
            description: text,
            version_sha256: digest,
            review_status: review,
            physical_page: { type: ['integer', 'null'], minimum: 1 },
            printed_page: nullableText,
            short_quote: nullableText,
            page_text_sha256: { anyOf: [digest, { type: 'null' }] },
            evidence: {
              anyOf: [
                strict({ file: text, sha256: digest, anchor_id: text }),
                { type: 'null' },
              ],
            },
          }),
        },
        extraction: strict({
          scope: {
            enum: ['existing_html_anchor', 'selected_heading_or_caption'],
          },
          tool: text,
          version: text,
          normalization: text,
          original_bytes_checked: { const: true },
          semantic_knowledge_review: { const: 'not_performed' },
        }),
        gaps: { type: 'array', items: text, uniqueItems: true },
      }),
    },
  }),
};

export function catalogFiles(db, evidenceOutputs, dbSha) {
  const evidenceIndex = JSON.parse(evidenceOutputs.get('index.json'));
  const entry = evidenceIndex.records.find(
    (r) => r.document_id === 'us-45q-usc-2024'
  );
  if (!entry) throw new Error('Selected historical evidence is absent.');
  const source = JSON.parse(evidenceOutputs.get(entry.file));
  const records = [
    {
      document_id: source.document_id,
      title: source.title,
      title_translation_status: 'draft',
      publisher: 'United States Government Publishing Office / govinfo',
      source_kind: 'legislation',
      language: source.source_language,
      edition: source.edition,
      source_url: source.source_url,
      raw_sha256: source.raw_sha256,
      coverage: source.coverage,
      currentness: 'not_verified',
      access: 'public_frozen_text',
      identity_review_status: source.review.status,
      policy_links: [{ policy_id: source.policy_id, status: 'candidate' }],
      locators: source.anchors.map((a) => ({
        id: a.id,
        kind: 'html_quote',
        description: a.locator,
        version_sha256: a.version_sha256,
        review_status: a.review.status,
        physical_page: null,
        printed_page: null,
        short_quote: null,
        page_text_sha256: null,
        evidence: {
          file: `../evidence/${entry.file}`,
          sha256: entry.sha256,
          anchor_id: a.id,
        },
      })),
      extraction: {
        scope: 'existing_html_anchor',
        tool: source.extractor_version,
        version: source.extractor_version,
        normalization: 'existing_packet_profile',
        original_bytes_checked: true,
        semantic_knowledge_review: 'not_performed',
      },
      gaps: [
        'IDENTITY_AND_LOCATOR_REVIEW_PENDING',
        'CURRENTNESS_NOT_VERIFIED',
        'CLAIM_SUPPORT_NOT_REVIEWED',
      ],
    },
  ];
  const capturedBytes = fs.readFileSync(
    path.join(root, 'scripts/data/discovery/captured-pdfs.json')
  );
  const captured = JSON.parse(capturedBytes);
  for (const r of captured.records) {
    if (
      !r.capture.original_bytes_checked ||
      r.locator.review_status !== 'draft'
    )
      throw new Error('PDF metadata capture cannot promote review.');
    records.push({
      document_id: r.document_id,
      title: r.title,
      title_translation_status: 'draft',
      publisher: r.publisher,
      source_kind: r.source_kind,
      language: r.language,
      edition: r.edition,
      source_url: r.source_url,
      raw_sha256: r.raw_sha256,
      coverage: r.coverage,
      currentness: 'not_verified',
      access: 'private_original_metadata',
      identity_review_status: 'draft',
      policy_links: r.policy_ids.map((policy_id) => ({
        policy_id,
        status: 'candidate',
      })),
      locators: [
        {
          id: r.locator.id,
          kind: 'pdf_page',
          description: r.locator.description,
          version_sha256: r.raw_sha256,
          review_status: 'draft',
          physical_page: r.locator.physical_page,
          printed_page: r.locator.printed_page,
          short_quote: r.locator.exact_quote,
          page_text_sha256: r.locator.page_text_sha256,
          evidence: null,
        },
      ],
      extraction: {
        scope: 'selected_heading_or_caption',
        tool: r.capture.tool,
        version: r.capture.version,
        normalization: r.locator.normalization,
        original_bytes_checked: true,
        semantic_knowledge_review: 'not_performed',
      },
      gaps: [
        'IDENTITY_AND_LOCATOR_REVIEW_PENDING',
        'ORIGINAL_BYTES_NOT_PUBLICLY_RESOLVED',
        'CLAIM_SUPPORT_NOT_REVIEWED',
        'CURRENTNESS_NOT_VERIFIED',
        ...(r.edition === null ? ['EDITION_UNKNOWN'] : []),
      ],
    });
  }
  if (new Set(records.map((r) => r.document_id)).size !== records.length)
    throw new Error('Duplicate catalog document ID.');
  for (const r of records)
    for (const link of r.policy_links)
      if (
        !queryRows(db, 'SELECT id FROM policies WHERE id=?', [link.policy_id])
          .length
      )
        throw new Error('Catalog policy link is absent from SQLite.');
  const catalog = {
    schema_version: '1.0.0',
    source_db_sha256: dbSha,
    inputs: {
      captured_pdf_metadata_sha256: hash(capturedBytes),
      existing_evidence_index_sha256: hash(evidenceOutputs.get('index.json')),
    },
    count: records.length,
    records: records.sort((a, b) =>
      a.document_id.localeCompare(b.document_id, 'en')
    ),
  };
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(catalogSchema);
  if (!validate(catalog)) throw new Error(ajv.errorsText(validate.errors));
  const json = JSON.stringify(catalog, null, 2) + '\n';
  return new Map([
    ['catalog.json', json],
    ['catalog.schema.json', JSON.stringify(catalogSchema, null, 2) + '\n'],
    [
      'README.md',
      '# Source discovery catalog\n\nGenerated metadata for three frozen source candidates. Original PDF bytes remain private.\n\n' +
        catalog.records
          .map(
            (r) =>
              `- ${r.document_id}: ${r.title.en}; ${r.coverage}; ${r.access}; review=${r.identity_review_status}`
          )
          .join('\n') +
        '\n\nA catalog hit is not reviewed knowledge. Semantic extraction has not been performed.\n',
    ],
  ]);
}

export function publishCatalog(files, directory) {
  for (const [name, bytes] of files) {
    if (!['catalog.json', 'catalog.schema.json', 'README.md'].includes(name))
      throw new Error('Invalid catalog output path.');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, name), bytes);
  }
}

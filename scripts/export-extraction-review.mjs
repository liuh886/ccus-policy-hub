#!/usr/bin/env node
// Uses existing static catalog and named text caches. No crawling, OCR or model calls.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { filesystemPublication } from './consume-agent-data.mjs';
import { consumeSourceCatalog } from './consume-source-catalog.mjs';
import {
  normalizeUnit,
  reviewHash,
  sealReviewPack,
} from './lib/extraction-review.mjs';
import { writePrivateReviewFiles } from './lib/private-review-files.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const options = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  if (
    ![
      '--catalog-root',
      '--uk-text-cache',
      '--report-text-cache',
      '--output',
    ].includes(key) ||
    !process.argv[i + 1]
  )
    throw new Error(
      'Usage: --catalog-root <static-public-root> --uk-text-cache <saved-text> --report-text-cache <saved-text> --output <private-folder>'
    );
  options[key] = process.argv[i + 1];
}
if (Object.keys(options).length !== 4)
  throw new Error('All explicit existing-input paths are required.');
const { manifestUrl, reader } = filesystemPublication(
  options['--catalog-root']
);
await consumeSourceCatalog(manifestUrl, reader);
const manifest = JSON.parse(reader(manifestUrl));
const catalogUrl = new URL(
  manifest.datasets.discovery_catalog.file,
  manifestUrl
);
const catalog = JSON.parse(reader(catalogUrl));
const definitions = JSON.parse(
  fs.readFileSync(
    new URL('./data/extraction-review/cases.json', import.meta.url),
    'utf8'
  )
);
const caches = new Map([
  ['uk-energy-act-2023-enacted', options['--uk-text-cache']],
  ['gccsi-ccus-progress-china-en', options['--report-text-cache']],
]);
const cases = definitions.map((item) => {
  const record = catalog.records.find(
    (r) => r.document_id === item.document_id
  );
  if (!record || record.locators.length !== 1)
    throw new Error('Selected catalog source/locator is unavailable.');
  const locator = record.locators[0];
  let text;
  if (locator.evidence) {
    const source = JSON.parse(
      reader(new URL(locator.evidence.file, catalogUrl))
    );
    text = normalizeUnit(
      source.anchors.find((a) => a.id === locator.evidence.anchor_id)
        .exact_quote
    );
  } else {
    const file = caches.get(record.document_id);
    if (!file || fs.statSync(file).size > 32 * 1024 * 1024)
      throw new Error('A bounded existing text cache is required.');
    const page = fs.readFileSync(file, 'utf8').split('\f')[
      locator.physical_page - 1
    ];
    if (page === undefined) throw new Error('Cached physical page is absent.');
    text = normalizeUnit(page);
    if (reviewHash(text) !== locator.page_text_sha256)
      throw new Error('Saved page text differs from the frozen capture.');
  }
  return {
    ...item,
    units: [
      {
        id: `${record.document_id}::${locator.id}`,
        document_id: record.document_id,
        raw_sha256: record.raw_sha256,
        unit_sha256: reviewHash(text),
        text,
        source_kind: record.source_kind,
        coverage: record.coverage,
        edition: record.edition,
        currentness: record.currentness,
        extraction_profile: record.extraction,
        representation:
          locator.kind === 'html_quote'
            ? 'normalized_section_text'
            : 'normalized_flat_page_text',
        layout_available: false,
        source_review_status: record.identity_review_status,
        locator: {
          id: locator.id,
          description: locator.description,
          physical_page: locator.physical_page,
          printed_page: locator.printed_page,
          evidence: locator.evidence,
        },
      },
    ],
  };
});
const pack = sealReviewPack(cases);
const template = {
  profile: pack.profile,
  pack_sha256: pack.pack_sha256,
  model_id: null,
  generation_settings: {},
  outputs: [],
};
const files = new Map([
  ['pack.json', JSON.stringify(pack, null, 2) + '\n'],
  ['candidate.template.json', JSON.stringify(template, null, 2) + '\n'],
  [
    'review.md',
    '# Private extraction evaluation\n\nNot human-annotated gold; no model has been executed.\n\n' +
      pack.prompt +
      '\n\n' +
      cases
        .map((c) => `## ${c.id}\n\n${c.task}\n\nCheck: ${c.risks.join('; ')}\n`)
        .join('\n') +
      '\nSource unit text remains in private pack.json. Never publish this directory.\n',
  ],
]);
for (const item of cases)
  files.set(
    `${item.id}.json`,
    JSON.stringify(sealReviewPack([item]), null, 2) + '\n'
  );
writePrivateReviewFiles(root, options['--output'], files);
console.log(
  JSON.stringify({
    profile: pack.profile,
    pack_sha256: pack.pack_sha256,
    cases: cases.length,
    source_units: cases.flatMap((c) => c.units).length,
    source_text_reextracted: false,
    model_calls: 0,
    human_gold_items: 0,
  })
);

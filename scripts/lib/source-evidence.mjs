import crypto from 'node:crypto';
import { z } from 'astro/zod';

export const EXTRACTOR_VERSION = 'govinfo-usc-html-v1';
export const digest = (bytes) =>
  crypto.createHash('sha256').update(bytes).digest('hex');
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, 'A valid calendar date is required.');
const review = z
  .object({
    status: z.enum(['draft', 'verified']),
    reviewer: z.string().trim().min(1).nullable(),
    method: z.enum(['not_reviewed', 'human']),
    reviewed_at: date.nullable(),
  })
  .strict()
  .refine(
    (v) =>
      v.status !== 'verified' ||
      (v.method === 'human' && v.reviewer && v.reviewed_at),
    'Verified evidence requires a named reviewer and date.'
  );
export const evidencePacketSchema = z
  .object({
    schema_version: z.literal('1.0.0'),
    document_id: id,
    policy_id: id,
    title: z.object({ en: z.string().min(1), zh: z.string().min(1) }).strict(),
    source_url: z
      .string()
      .url()
      .refine(
        (v) =>
          /^https:\/\/www\.govinfo\.gov\/content\/pkg\/USCODE-\d{4}-title26\/html\/USCODE-\d{4}-title26-subtitleA-chap1-subchapA-partIV-subpartD-sec45Q\.htm$/.test(
            v
          ),
        'Only the pilot official 45Q source is allowed.'
      ),
    edition: z.string().regex(/^\d{4}$/),
    fetched_at: z.string().datetime(),
    published_at: date.nullable(),
    source_current_through: date,
    raw_file: z.literal('source.html'),
    raw_sha256: sha,
    normalized_sha256: sha,
    extractor_version: z.literal(EXTRACTOR_VERSION),
    review,
    anchors: z
      .array(
        z
          .object({
            id,
            locator: z.string().min(1),
            exact_quote: z.string().min(1),
            version_sha256: sha,
            review,
          })
          .strict()
      )
      .min(1),
  })
  .strict();

export class EvidenceError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// Deliberately narrow profile, not a general web parser. Unknown entity or
// unexpected source shape fails closed rather than silently losing text.
export function normalizeOfficialHtml(raw) {
  if (raw.length > 512 * 1024)
    throw new EvidenceError(
      'SOURCE_TOO_LARGE',
      'The pilot source exceeds 512 KiB.'
    );
  const html = new TextDecoder('utf-8', { fatal: true }).decode(raw);
  if (
    !html.includes('<!-- documentid:26_45Q ') ||
    !html.includes('class="section-head"')
  )
    throw new EvidenceError(
      'UNEXPECTED_SOURCE',
      'Not the supported official USC 45Q document; an HTTP 200 is insufficient.'
    );
  let body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if (!body) throw new EvidenceError('UNEXPECTED_SOURCE', 'No document body.');
  body = body
    .replace(/<!--[^]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(?:p|h[1-6]|div|br|li|tr)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  const entities = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    sect: '§',
    mdash: '—',
    ndash: '–',
    lsquo: '‘',
    rsquo: '’',
    ldquo: '“',
    rdquo: '”',
    thinsp: ' ',
  };
  body = body.replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi, (_, key) => {
    if (key.startsWith('#')) {
      const cp =
        key[1].toLowerCase() === 'x'
          ? parseInt(key.slice(2), 16)
          : Number(key.slice(1));
      if (cp > 0x10ffff || cp < 1 || (cp >= 0xd800 && cp <= 0xdfff))
        throw new EvidenceError('INVALID_ENTITY', 'Invalid Unicode entity.');
      return String.fromCodePoint(cp);
    }
    if (!(key in entities))
      throw new EvidenceError(
        'UNSUPPORTED_ENTITY',
        `Unsupported entity: ${key}`
      );
    return entities[key];
  });
  return (
    body
      .normalize('NFC')
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.replace(/[\t \u00a0]+/g, ' ').trim())
      .filter(Boolean)
      .join('\n') + '\n'
  );
}

export function inspectEvidence(
  input,
  raw,
  { observedRaw = raw, extractorVersion = EXTRACTOR_VERSION } = {}
) {
  const packet = evidencePacketSchema.parse(input);
  if (digest(raw) !== packet.raw_sha256)
    throw new EvidenceError(
      'RAW_HASH_MISMATCH',
      'Stored bytes do not match the frozen raw hash.'
    );
  const text = normalizeOfficialHtml(raw);
  if (digest(text) !== packet.normalized_sha256)
    throw new EvidenceError(
      'TEXT_HASH_MISMATCH',
      'Normalized text differs from the frozen extraction.'
    );
  const ids = new Set();
  const changed = digest(observedRaw) !== packet.raw_sha256;
  const parserChanged = extractorVersion !== packet.extractor_version;
  const anchors = packet.anchors.map((anchor) => {
    if (ids.has(anchor.id))
      throw new EvidenceError('DUPLICATE_ANCHOR', 'Anchor IDs must be unique.');
    ids.add(anchor.id);
    if (anchor.version_sha256 !== packet.raw_sha256)
      throw new EvidenceError(
        'ANCHOR_VERSION_MISMATCH',
        'Anchor references another source version.'
      );
    const start = text.indexOf(anchor.exact_quote);
    if (start < 0 || text.indexOf(anchor.exact_quote, start + 1) >= 0)
      throw new EvidenceError(
        'ANCHOR_NOT_UNIQUE',
        'Each exact quote must resolve once in the frozen text.'
      );
    const state = changed
      ? 'source_changed'
      : parserChanged
        ? 'extractor_changed'
        : packet.review.status !== 'verified' ||
            anchor.review.status !== 'verified'
          ? 'needs_review'
          : 'verified';
    return {
      ...anchor,
      start_offset: start,
      end_offset: start + anchor.exact_quote.length,
      offset_unit: 'utf16_code_units',
      state,
      usable_as_reviewed_reference: state === 'verified',
    };
  });
  const currentThrough = /currentthrough:(\d{4})(\d{2})(\d{2})/.exec(
    new TextDecoder().decode(raw)
  );
  if (
    !currentThrough ||
    currentThrough.slice(1).join('-') !== packet.source_current_through
  )
    throw new EvidenceError(
      'EDITION_MISMATCH',
      'Coverage date must match the source metadata.'
    );
  if (
    !text.includes(`United States Code, ${packet.edition} Edition`) ||
    !packet.source_url.includes(
      `USCODE-${packet.edition}-title26/html/USCODE-${packet.edition}-title26-`
    )
  )
    throw new EvidenceError(
      'EDITION_MISMATCH',
      'Source URL, edition and text disagree.'
    );
  return {
    document_id: packet.document_id,
    policy_id: packet.policy_id,
    raw_sha256: packet.raw_sha256,
    normalized_sha256: packet.normalized_sha256,
    extractor_version: packet.extractor_version,
    source_current_through: packet.source_current_through,
    source_currentness_verified: false,
    observed_source_changed: changed,
    requires_review: anchors.some((a) => !a.usable_as_reviewed_reference),
    anchors,
    normalized_text: text,
  };
}

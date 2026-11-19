# Real source catalog: inputs, processing and citation boundaries

This catalog implementation is stacked on #104's existing source contract and
the P3 cross-jurisdiction evidence packets. It reuses #103/#104's manifest,
schemas, release fingerprints and independent public consumer. SQLite, source
review states and private originals are unchanged. It does not rerun source
discovery or acquisition.

## Inputs and generated files

- All archived HTML evidence packets in `scripts/data/evidence/` (currently
  `us-45q-usc-2024`, `ca-ccus-itc-2026`, `no-for-2014-1517`, and
  `dk-ens-ccs-funds`) are projected into the catalog directly from the
  generated evidence index and records, not hand-maintained copies of titles,
  editions, hashes or anchors.
- `scripts/data/discovery/captured-pdfs.json` is a generated capture from
  manifest-declared local PDFs defined in `scripts/data/discovery/pdf-targets.json`.
  Capture checks full source hashes, page counts, a unique selected
  heading/caption and printed page labels. Only metadata, short locators,
  extraction hashes and measurements are retained; local paths, private file IDs,
  complete page text and PDF bytes are excluded.
- Existing SQLite IDs are checked for candidate policy links; this does not
  approve those relationships. Reports can have no policy link. The catalog binds
  to the actual SQLite snapshot used by this branch; the source PDF identity is
  independently bound by its raw hash.
- The deterministic public projection is `public/data/discovery/catalog.json`,
  with `catalog.schema.json` and a brief README in the same directory. The main
  manifest advertises it and its byte fingerprint. Build copies it to
  `dist/data/discovery/`; release metadata covers both catalog and schema.

Currently the catalog inventories 6 frozen records: 4 archived HTML snapshots
(`us-45q-usc-2024`, `ca-ccus-itc-2026`, `no-for-2014-1517`,
`dk-ens-ccs-funds`), plus 2 private PDF captures (the original Energy Act 2023
chapter 52 PDF and the English GCCSI China status report). The GCCSI report's
edition (and `dk-ens-ccs-funds` edition) remains unknown (`null`): an
upload-directory year is not an edition. Translated catalog titles remain draft;
all four archived HTML packets reflect bounded historical snapshot/locator human
review, while both PDF identity/locator reviews remain draft.

## What the generator does

It joins selected source metadata and the existing evidence output with accepted
policy IDs, checks structure and references, sorts records and writes static
files. Identical frozen inputs give identical catalog bytes. It does not call an
LLM or infer legal conditions, effective dates, report findings or claim support.

This separates three different products:

1. **Catalog**: document identity candidates, edition, language, issuer/platform,
   public reference, access and gaps.
2. **Structural extraction**: a recoverable HTML quote, PDF heading/caption,
   physical/printed page and normalization/hash provenance.
3. **Semantic knowledge**: supported propositions with necessary conditions,
   context, scope and scoped review. This layer is **not performed** here.

The knowledge-extraction engineering decision remains in [RFC #112](https://github.com/liuh886/ccus-policy-hub/pull/112): determine quality and evaluate parser/model/reviewer responsibilities before choosing a semantic schema or model. The directory generator is not that semantic extractor.

## Independent consumer and receipts

```bash
pnpm gen
pnpm catalog:consume --root public

# After a normal build: check the actual release, not an assumed deployed state.
pnpm catalog:consume --root dist --expect-commit <full-git-sha>
pnpm catalog:consume --manifest-url <public-manifest-url> --expect-commit <full-git-sha>
```

The consumer reads public bytes only. It discovers the catalog through the main
manifest, validates its schema/fingerprint and policy snapshot, resolves existing
evidence/index/anchor references and emits a receipt per locator. The existing
per-record source validator verifies the frozen 45Q raw/text hashes and quote offsets; no site
runtime or SQLite is needed by the external reader.

Current output is **6 catalog records / 6 receipts (4 `reviewed_historical_locator`,
2 `candidate_only`) / 4 reviewed catalog references**. The 4 HTML packets' raw
text and anchors can be rechecked through public resources; both PDF receipts
explicitly report that original bytes cannot be publicly resolved. A reported
private page hash is provenance, not public byte verification. A source quote
that resolves is not proof of a semantic claim.

Wrong raw-version bindings, missing anchors, inconsistent review flags, orphan
policy links, schema/hash corruption, stale policy snapshots and release drift
fail rather than silently becoming citations. Unknown edition and private
source access are explicit gaps. Historical scope never becomes current law.
The consumer does not fetch official publisher URLs or private PDF originals.

Callers can pass `{ documentIds: ['gccsi-ccus-progress-china-en'] }` to the
exported `consumeSourceCatalog` function to resolve only selected records.
It reuses the existing per-source validator without fetching unrelated context
bundles or unrelated frozen source text; the CLI validates all records by default.

## Re-capture when the explicit source inputs change

The capture command is a local extraction step over manifest-declared frozen
files (`scripts/data/discovery/pdf-targets.json`), not a crawler. Poppler must
be installed; no cloud model is used. It records the actual tool version and
diagnostics. Run it only to refresh those frozen inputs, then inspect the
generated metadata and reproduce the catalog:

```bash
node scripts/capture-catalog-pdfs.mjs --targets scripts/data/discovery/pdf-targets.json --input-dir <local-pdf-dir> --output scripts/data/discovery/captured-pdfs.json
# Or override specific documents explicitly:
node scripts/capture-catalog-pdfs.mjs --pdf uk-energy-act-2023-enacted=<UK-PDF> --pdf gccsi-ccus-progress-china-en=<GCCSI-PDF> --output scripts/data/discovery/captured-pdfs.json
pnpm gen
```

Capture timing is an observation, not a reproducible performance guarantee;
ordinary catalog generation does not recapture or re-extract either PDF. The
full-corpus search experiments and source acquisition scripts are not part of
this catalog operation. A review signature must come from an actual scoped
human review, not the capture script or this implementation Agent.

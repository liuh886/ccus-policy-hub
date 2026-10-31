# Private knowledge-extraction evaluation protocol

This is an internal experiment format, **not an accepted production knowledge schema**, Q&A Agent or semantic-accuracy benchmark. It implements the review-readiness part of [the extraction study in RFC #112](https://github.com/liuh886/ccus-policy-hub/blob/docs/rfc-evidence-to-agent-context-pipeline-20261030/docs/research/knowledge-extraction-engineering.md). No new dependency, service or database is required.

The exporter reuses the three records in the existing [source catalog](source-catalog.md): historical 45Q HTML, original UK Energy Act 2023 and a GCCSI report. It validates the static publication through its existing consumer. HTML uses the existing anchored quotation. PDFs use the named, already saved Poppler text caches; selected normalized pages must match the captured page hashes. It does not crawl, download, re-extract PDFs, execute models or index private text.

```powershell
node scripts/export-extraction-review.mjs --catalog-root ../real-source-catalog/public --uk-text-cache ../../.codex/context-layer/uk-energy.txt --report-text-cache ../../.codex/context-layer/gccsi-english.txt --output .codex/private-extraction/first-cohort
```

Inputs must exist; adjust paths for your checkout. Outputs are restricted to this checkout's `.codex/private-extraction/`, ignored by Git. The writer rejects paths into publication inputs, traversal and resolved symlink escapes. Full source units remain private. Git contains only protocol code, synthetic test text and case descriptions.

`pack.json` contains all three cases; individual case files allow a smaller input per experiment. Each pack binds its prompt, candidate schema, tasks, source versions, normalized text, context boundaries and risks by SHA-256. The cache-key helper binds the complete pack, declared model ID and generation settings. This is deterministic input identity, not proof of execution or model reproducibility. No API runner or provider is selected.

`candidate.template.json` deliberately has a null model ID and no outputs. Supply real run metadata before audit; never relabel this empty template as a model result. Output claims, quotations and explicit gaps follow the embedded evaluation schema. The representation is experimental and can change after evaluation.

```powershell
node scripts/audit-extraction-review.mjs .codex/private-extraction/first-cohort/pack.json .codex/private-extraction/first-cohort/candidate-run.json .codex/private-extraction/first-cohort
```

The auditor checks identity, context/edition declarations, unique quote matches and mechanical evidence restrictions. Offsets are UTF-16 code units **within the normalized review unit**, not PDF byte offsets or original full-document offsets. The origin locator links back to the catalog page/HTML anchor. A hash is an integrity check, not a signature or proof of legal authority. PDF image/layout evidence is absent; the report case must not infer figure relations from flattened labels. It also cannot become legal authority. The catalog's original extraction profile describes its locator capture; the packet's representation describes the larger cached page supplied for review.

Successful quotation matching yields `needs_support_review`, never `supported`. For example, the synthetic test quotes “Eligibility requires A and B.” while claiming A alone suffices: mechanical checks pass, but semantic support remains **not evaluated**. Missing source/quote/version, unsupported currentness, secondary report used as law and absent diagram layout are blocked. Abstention needs an explicit gap. Missing case outputs are reported, so an empty run is not completeness. The auditor rejects self-assigned human approval fields.

There is no human-annotated gold set, verified model execution, measured token cost or semantic accuracy. Those remain null/unperformed rather than zero-quality scores. The next evidence needed is genuine review of identity/edition plus reference propositions and omissions for these cases, followed by a controlled comparison using the same packs and recorded model settings. Evaluate support, qualifier retention, omission and appropriate abstention separately; three cases cannot establish general quality. No output enters public knowledge or SQLite automatically.

## Preparing reference propositions for review

`prepare-extraction-reference.mjs` turns a private Agent-authored reference draft into a JSON worksheet and a readable Chinese Markdown worksheet. This is a separate input from an experimental model run: an Agent draft is not human gold. Its schema is exported as `referenceDraftSchema` from `scripts/lib/extraction-reference.mjs` and remains evaluation-only.

The draft binds `profile: extraction-reference-draft-v1`, `pack_sha256`, `authorship: agent_draft` and every selected case. Each case supplies nonempty `expectations`, `required_checks` and `must_not_infer`. Expectations have stable IDs plus the statement, claim kind, scope, evidence and missing-context fields used by the candidate schema. Checks have IDs and descriptions. Duplicated IDs, omitted/unknown cases, self-assigned approval, stale context and blocked quotation/version declarations are rejected. Source text and reference statements stay in the private draft; no real reference text is committed.

```powershell
node scripts/prepare-extraction-reference.mjs .codex/private-extraction/first-cohort/pack.json .codex/private-extraction/first-cohort/reference-draft.json .codex/private-extraction/first-cohort
```

Outputs are `reference-review.json` and `reference-review.md`, bound to the draft and source-pack hashes. The worksheet separates source identity/edition, proposition support, qualifier retention, atomicity, case checks and missing propositions. It initializes every review field to `not_reviewed`, notes/omissions to null, and accuracy to null. Null omissions mean unknown completeness, not zero omissions. Mechanical quote checks reuse the candidate auditor; a conjunction-loss synthetic draft still reaches only an unreviewed worksheet. This command neither imports completed human reviews nor changes publication status.

Identical worksheet reruns are allowed. If either existing worksheet differs, generation stops before writing any worksheet, preserving reviewer edits. Use a new private output folder for a changed draft rather than overwriting annotations. Retain the original draft and pack when recording review decisions.

In the first local rehearsal, the existing three source units yielded **7 Agent-authored reference drafts and 12 case checks**, all unreviewed. The historical 45Q checklist distinguishes construction AND/OR, facility categories, annual quantities and design-capacity denominators; the UK checklist retains licensing and transport cross-references and flags the continuation onto the next page; the report checklist separates adjacent figure captions, unknown edition and absent layout. These drafts make the review concrete but do not prove their own correctness or exhaustiveness. Human source/support/omission review is still needed before any controlled semantic-quality comparison.

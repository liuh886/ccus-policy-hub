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

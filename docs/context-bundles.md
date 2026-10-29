# Static policy context bundles

This is the first implementation slice of the [Agent context-layer plan](https://github.com/liuh886/ccus-policy-hub/pull/101).
It serves the maintainer's Agent with SQLite-derived JSON and Markdown. It does
not add a server, model call, full-text corpus or project tax-eligibility engine.

## Available bundles

| ID                  | Kind          | Included records                                         |
| ------------------- | ------------- | -------------------------------------------------------- |
| `us-45q-ira`        | policy        | IRA-era 45Q record                                       |
| `us-obbba-45q-2025` | policy        | 2025 amendment record                                    |
| `us-section-45q`    | policy_family | Both records side by side; not a consolidated legal text |

All three are available in `en` and `zh`. Six JSON files, six equivalent
Markdown files and one index are generated under `public/data/context/`.

## Agent workflow

1. Fetch `/data/manifest.json`; follow `datasets.context.file` to the index.
2. Select a record by `id` and `lang`. Resolve its `json`/`markdown` path relative
   to the index URL, preserving the site's base path.
3. Check the HTTP status before parsing. Static unknown URLs return the site's
   normal 404 response; there is no dynamic JSON error endpoint.
4. Verify the downloaded bytes against the corresponding SHA-256 in the index.
5. Read capabilities, gaps, each record's review date and evidence level before
   answering. Cite `source_refs`; the Markdown reference links resolve to the
   same official source URLs listed in JSON.
6. Keep the original versions distinct. Do not call a source URL a verified
   clause or equate geographic association with project tax eligibility.

Use a currentness check against the official source outside the bundle before
making a claim about current law. `source_currentness_verified` is deliberately
false: generating a projection does not re-review a statute or IRS guidance.

## Local commands

```bash
# Generate every registered bundle (also runs within pnpm gen).
pnpm context:build

# Machine-readable stdout; --silent suppresses pnpm's script banner.
pnpm --silent context:read -- --id us-section-45q --lang zh --format json
pnpm --silent context:read -- --id us-section-45q --lang en --format md

# Compare all published bytes to a fresh read-only projection.
pnpm context:check
```

For subprocesses, the equivalent direct command is:

```bash
node scripts/generate-policy-context.mjs --id us-section-45q --lang en --format json
```

An unknown ID, unsupported language/format, unsupported argument, missing policy
record or generated drift exits nonzero. Errors are JSON on stderr with
`error.code` and `error.message`; successful single-bundle reads write only the
requested JSON or Markdown on stdout and do not write files. `--lang` and
`--format` require `--id`; historical `--as-of` queries are not supported.

## What the six sections mean

- `identity`: policy identities and their actual review states.
- `relationships`: full counts plus at most 20 example associations; truncation
  is explicit. Geographic matches remain context. Value-chain coverage is not
  assessed. Verified direct sources, if present, are shown first without
  granting tax eligibility.
- `time`: publication dates, individual review dates and known milestones;
  missing dates remain null. No historical state reconstruction is implied.
- `sources`: record-summary provenance with stable IDs and database locators.
  A locator identifies a maintained record, not a statutory clause.
- `legal_context`: scope, narrative, regulatory notes and canonical analysis,
  all explicitly `record_summary` evidence. No automatic consolidation occurs.
- `definitions`: shared meanings of geographic matches, direct evidence,
  record-summary evidence and the bundle's date.

`data_as_of` is the latest individual review date among the selected records.
It does not mean every record was reviewed on that date and is never used as a
legal-effective date. Chinese analysis without a valid source-bound translation
falls back to English with an explicit per-dimension language field.

## Example bounded question

A consuming Agent may use this instruction with either bundle format:

> List the included policy records and their review dates. Summarize each
> record's stated scope separately and cite its source ID. Identify which
> questions about conditions, timing and project eligibility cannot be answered
> from this evidence. Do not infer current law, verified clause wording or
> eligibility from a record's verified status or a geographic association.

Expected behavior: the family includes both IRA and 2025 amendment records;
the Agent cites each separately, preserves their dates and reports the missing
clause/history/currentness/project evidence. A request such as “this US facility
must qualify, correct?” must not receive an affirmative eligibility conclusion.

This first slice validates access to existing curated summaries and exposes
missing evidence. Clause-level 45Q condition Q&A still requires the later
versioned-document, anchor and condition-card work described in PR #101.

## Maintenance and validation

Edit accepted facts in SQLite through the existing governed workflow. Do not
hand-edit bundles. The existing public generator uses the same in-memory
SQLite snapshot for API records and context bundles. No source fetching,
scoring, factual inference or SQLite writes occur during context generation.

`context-bundle.schema.json` describes the public payload; the matching runtime
contract uses the existing `astro/zod` export. No dependencies were added.

Generated bytes are owned by the generator and excluded from Prettier so index
hashes remain valid after `pnpm gen`. The directory remains ignored by Git.
Source tests cover versions, draft status, unknown dates and sources, stale
translations, relationship limits, reference resolution, path rejection,
byte-identical output, drift detection and unchanged SQLite bytes.

# CCUS Policy Hub | Architecture

## 1. System purpose

CCUS Policy Hub combines a governed CCUS policy/facility dataset with a bilingual Astro website, analytical workspaces, public JSON endpoints, and an agent-readable maintenance layer.

## 2. Data and publication flow

```text
Primary external evidence and approved source datasets
                      ↓
agent/ccus-ai-agent/db/ccus_master.sqlite
                      ↓
standardization · relationship repair · analytical computation
                      ↓
          deep audit and quality gates
                      ↓
   ┌──────────────────┴──────────────────┐
   ↓                                     ↓
src/content/ bilingual Markdown       public/data/ JSON + schemas
   ↓                                     ↓
   └──────────────────┬──────────────────┘
                      ↓
          Astro build + Pagefind index
                      ↓
               GitHub Pages release
```

## 3. Authority and generated outputs

- `db/ccus_master.sqlite`: authoritative structured maintenance source.
- `db/schema.sql`: schema reference for reproducible initialization and review.
- `logic/manage.mjs`: canonical database maintenance CLI.
- `src/content/policies`, `src/content/facilities`, `src/content/countries`: generated bilingual publication content.
- `public/data/*.json`: generated AI-readable/public data endpoints.
- `src/data/quality_metrics.generated.json` and `public/data/quality.json`: generated quality outputs.
- `src/`: frontend source, shared components, page logic, styles, and translations.

Data corrections start in SQLite or an approved import pipeline. UI and documentation changes start in their source files. Generated files are reviewed outputs, not independent maintenance sources.

## 4. Core domains

### Policies

Structured identity, jurisdiction, year, status, category, legal weight, source, bilingual narrative, analytical dimensions, impact interpretation, evolution, regulatory context, relationships, and provenance.

### Facilities

Record identity, country, status, capacity fields, coordinates and precision, bilingual technical/project metadata, partners, links, relationships, and provenance.

### Country governance profiles

Bilingual summaries, seven regulatory pillars, strategic targets, governance/deployment metrics, and provenance.

### Public analytical layer

Homepage capacity growth, 2026 project landscape, policy navigation, facility exploration, governance benchmarking, deployment comparison, quality dashboard, and AI-readable data interfaces.

## 5. Safe extension points

- Add reusable tested logic under `logic/` and expose it through `manage.mjs` or an explicit package script.
- Add one-off data transformations under `migrations/` with a manifest explaining input, output, idempotency, and approval requirements.
- Add read-only diagnostics under a clearly named tools location or repository `scripts/`.
- Add new public fields only with schema, generator, test, documentation, and backward-compatibility review.

## 6. GitHub workflow

GitHub is the shared state and hand-off layer. Use focused branches and PRs, keep the web/GitHub workflow primary, use local execution only for environment-specific work, and require CI plus human review before merging.

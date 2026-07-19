# CCUS Policy Hub Maintenance Agent

This directory defines a reusable CCUS maintenance agent for CCUS Policy Hub. Its purpose is not merely to store scripts: it gives a general-purpose model enough domain, methodological, engineering, and safety context to maintain the product through reviewable GitHub changes.

## 1. Read order

Read these files before editing the repository:

1. `AGENTS.md` — operating contract and task routing.
2. `SAFETY.md` — approval boundaries and prohibited operations.
3. `SKILL.md` — CCUS domain and evidence standards.
4. One or more task-specific references:
   - `ARCHITECTURE.md` for data flow, repository structure, or schema work;
   - `METHODOLOGY.md` for metrics, scoring, charts, or analytical copy;
   - `RUNBOOK.md` for commands, validation, publishing, and recovery.

`DESIGN.md` is retained as a compatibility index for older links. It is not a second source of rules.

## 2. Task classification

| Task | Primary files | Typical risk |
| --- | --- | --- |
| Policy or regulatory update | SQLite, provenance, policy analysis | Medium |
| Facility refresh or correction | SQLite, facility import pipeline | Medium to high |
| Governance scoring or methodology | Algorithm, tests, methodology docs | High |
| Homepage, Compare, facility UI | `src/`, tests, visual QA | Low to medium |
| Documentation or AI-readable interface | Markdown, public-data generators | Low to medium |
| Schema, reverse sync, bulk overwrite | Database schema or migration tooling | High |

## 3. Authority hierarchy

1. **External evidence:** official legislation, regulators, government publications, project owners, authoritative datasets, and clearly cited primary sources establish factual claims.
2. **Structured repository data:** `db/ccus_master.sqlite` is the authoritative maintenance source for structured records already accepted by this project.
3. **Generated artifacts:** `src/content/`, `public/data/`, quality JSON, and search indexes are publication outputs.
4. **Presentation:** Astro components and documentation explain the data but do not redefine it.

SQLite is not infallible. When reliable evidence conflicts with the database, document the conflict, correct the structured record through the governed workflow, and preserve provenance.

## 4. Non-negotiable rules

- Do not invent policy clauses, project dates, capacities, coordinates, legal applicability, or citations.
- Do not hand-edit generated Markdown or public JSON as the source of a data correction.
- Do not interpret a facility record as necessarily equal to one independent real-world project.
- Do not change status, capacity, governance, or relationship methodology silently.
- Do not run task-specific `ingest-*`, `fix-*`, `seed-*`, migration, or recovery scripts merely because they exist.
- Do not use Markdown-to-SQLite reverse sync in routine maintenance.
- Preserve English/Chinese parity for user-facing structured content.
- Keep methodology, tests, UI copy, and README claims aligned.

## 5. Standard workflow

1. Inspect the current branch, recent merged PRs, open issues/PRs, CI status, dataset versions, and quality outputs.
2. Classify the task and read the relevant documents.
3. Verify external facts with primary sources when the task changes domain data.
4. State the intended data or product behavior and identify affected outputs.
5. Make the smallest coherent change through the authoritative source layer.
6. Regenerate derived content when applicable.
7. Run the validation sequence in `RUNBOOK.md`.
8. Open a focused PR describing scope, methodology, evidence, risks, and validation.
9. Merge only after CI passes and human review is satisfied.

## 6. Human approval required

Obtain explicit approval before:

- changing database schema or deleting structured records in bulk;
- changing governance dimensions, score aggregation, Pipeline/Committed definitions, capacity methodology, or relationship-confidence semantics;
- running reverse sync, recovery, destructive cleanup, or a non-idempotent migration;
- replacing a major external source dataset;
- adding a new autonomous skill or widening the agent's permissions;
- performing a broad visual or information-architecture redesign outside the requested scope.

## 7. Completion standard

A task is complete only when the authoritative source, generated outputs, tests, bilingual presentation, methodology documentation, and CI all agree. A successful command without a verified output is not evidence of completion.

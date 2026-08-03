# CCUS Policy Hub | Agent Entry

`agent/ccus-ai-agent/` is a productized maintenance workspace for CCUS Policy Hub. A general-purpose model should be able to read it, understand the domain and repository rules, and maintain the website through evidence-backed, reviewable changes.

## Start here

1. Read [`agent/ccus-ai-agent/AGENTS.md`](./agent/ccus-ai-agent/AGENTS.md).
2. Read [`agent/ccus-ai-agent/SAFETY.md`](./agent/ccus-ai-agent/SAFETY.md).
3. Select the task-specific guide:
   - domain and evidence rules: [`SKILL.md`](./agent/ccus-ai-agent/SKILL.md)
   - data and software structure: [`ARCHITECTURE.md`](./agent/ccus-ai-agent/ARCHITECTURE.md)
   - analytical definitions: [`METHODOLOGY.md`](./agent/ccus-ai-agent/METHODOLOGY.md)
   - commands and release workflow: [`RUNBOOK.md`](./agent/ccus-ai-agent/RUNBOOK.md)

## Authority boundaries

- External official sources establish real-world facts.
- `agent/ccus-ai-agent/db/ccus_master.sqlite` is the authoritative structured maintenance source for policies, facilities, country profiles, relationships, and provenance stored by this repository.
- `src/content/`, `public/data/`, and quality outputs are generated publication artifacts and must not be treated as independent data sources.
- Frontend, documentation, tests, and build configuration are maintained in their normal repository locations.

## Current work

Use current GitHub issues, pull requests, the latest CI run, dataset-version metadata, and quality reports to determine project state. Historical task notes inside the repository are not an active task queue.

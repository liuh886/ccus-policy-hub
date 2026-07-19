# CCUS Policy Hub | Agent Workspace Design Index

> Status: compatibility entry point  
> Version: 3.0  
> Updated: 2026-07-19

This file is retained for compatibility with earlier repository links. The active maintenance guidance is split into focused documents so an agent can identify the rules relevant to the current task.

## Active documents

- [`AGENTS.md`](./AGENTS.md): role, task routing, authority hierarchy, and completion standard.
- [`SKILL.md`](./SKILL.md): CCUS domain and evidence skill.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md): data flow, repository structure, and extension points.
- [`METHODOLOGY.md`](./METHODOLOGY.md): policy, facility, capacity, status, geography, relationship, and governance definitions.
- [`RUNBOOK.md`](./RUNBOOK.md): commands, update workflows, validation, and PR checklist.
- [`SAFETY.md`](./SAFETY.md): risk levels, approval triggers, prohibited operations, and recovery.

## Stable design principles

1. Official external evidence establishes real-world facts.
2. SQLite is the authoritative structured maintenance source inside the repository.
3. Markdown, public JSON, quality metrics, and search indexes are generated outputs.
4. Methodology must be explicit, tested, bilingual, and consistent across data and UI.
5. GitHub branches, pull requests, CI, and human review are the production control loop.
6. Current work is tracked in GitHub, not in a static task file.

There is no standing frontend design freeze. UI changes should be scoped, consistent with the current visual system, tested, and approved through normal pull-request review.

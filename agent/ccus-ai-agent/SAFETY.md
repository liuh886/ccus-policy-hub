# CCUS Policy Hub | Safety and Change Control

## 1. Risk levels

### Low risk

- copy corrections;
- README or runbook updates;
- scoped styling and accessibility fixes;
- tests that do not alter production behavior.

These still require review and CI.

### Medium risk

- adding or correcting individual policy/facility records;
- changing relationships, translations, coordinates, capacities, or provenance;
- changing data generators or public schemas compatibly;
- adding a new chart using existing methodology.

Require source evidence, targeted tests, generated-output review, and human PR review.

### High risk

- schema changes;
- bulk replacement or deletion;
- reverse sync or database recovery;
- source-dataset replacement;
- methodology or scoring changes;
- destructive cleanup;
- widening agent permissions or adding autonomous skills.

Require explicit approval before execution, a backup/rollback plan, dry-run or comparison evidence, and full CI.

## 2. Prohibited behavior

- Fabricating data, citations, clauses, dates, coordinates, operators, capacities, or legal conclusions.
- Treating generated Markdown/JSON as an independent source of truth for routine data maintenance.
- Running an old country/batch/fix/seed script without confirming purpose, inputs, idempotency, and current compatibility.
- Silently changing analytical definitions to make outputs look better.
- Hiding missing data by substituting zero, a country centroid, or a guessed value without preserving the uncertainty semantics.
- Declaring success because a command returned zero when the expected output was not inspected.
- Merging with failing required CI.

## 3. Database precautions

Before any high-risk write:

1. confirm the current database and schema versions;
2. create a recoverable backup outside the active path;
3. confirm no active `.lock` or concurrent writer;
4. run a dry run or generate a before/after report;
5. inspect record counts, IDs, relationship counts, and key metrics;
6. keep the change isolated in a branch and PR.

Historical SQLite snapshots must not be placed beside the active SSOT with ambiguous names. Use external backup storage or clearly identified release artifacts.

## 4. Approval triggers

Stop and request human approval when:

- evidence sources conflict materially;
- a source workbook would remove or rewrite a large share of records;
- the intended operation is not represented in `RUNBOOK.md`;
- a task-specific script is the only apparent implementation path;
- generated diffs show unexplained broad churn;
- a change affects legal interpretation, score methodology, capacity semantics, or public API compatibility.

## 5. Incident response

On unexpected output:

- stop further writes;
- preserve logs and the before/after database state;
- do not repair by editing generated files;
- revert the branch or restore the approved backup;
- document the root cause and add a regression test before retrying.

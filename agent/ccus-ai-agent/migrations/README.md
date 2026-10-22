# Migrations

This directory is reserved for one-off or versioned data transformations that are not part of routine maintenance.

Every migration added here must include a short manifest stating:

- purpose and date;
- source and target schema/data version;
- input files;
- rows/tables affected;
- idempotency and re-run policy;
- dry-run or comparison command;
- backup and rollback procedure;
- required post-migration audits and exports;
- approval status.

Do not execute a migration solely because it exists. Routine changes should use the canonical CLI and reusable ingestion paths.

## Lifecycle (convergence rule)

Executed one-off code does not accumulate here. After a batch is merged and
pushed, remove its `*.mjs` scripts and `.test.mjs` files; the batch
`manifest.md` stays in place as the permanent execution record alongside git
history. Only active, unretired batches under `migrations/` keep executable
`.mjs` and `.test.mjs` files.

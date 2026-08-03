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

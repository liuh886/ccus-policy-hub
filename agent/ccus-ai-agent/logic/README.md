# Logic Directory

`manage.mjs` is the canonical database maintenance CLI. Prefer package scripts or documented `pnpm manage <command>` invocations over executing files in this directory directly.

Reusable, active logic should be tested and connected to the canonical CLI or an explicit package script. Country-specific, batch-specific, `fix-*`, `seed-*`, ad hoc query, migration, and recovery files may remain for historical reproducibility, but their presence does not make them safe or current.

Before running any non-canonical script, confirm:

- its input source and version;
- whether it writes to SQLite;
- whether it is idempotent;
- whether current schema and enums are supported;
- whether a backup and explicit approval are required;
- which audit, export, and tests must follow.

Unknown CLI commands must fail with a non-zero exit code; a successful no-op is not an acceptable maintenance result.

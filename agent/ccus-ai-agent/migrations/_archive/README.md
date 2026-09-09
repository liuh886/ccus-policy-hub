# \_archive — retired one-off migrations

Executed migration code lands here after merge+push, per the lifecycle rule in
`migrations/README.md`. The batch `manifest.md` stays next to the dated
directory as the execution record.

Archived suites are **frozen, not runnable**: their relative imports are pinned
to the pre-archive directory layout, so running them in place fails with
`ERR_MODULE_NOT_FOUND`. That is by design — do not "fix" the paths. Execution
evidence is the manifest plus the commit recorded in it. Re-running an archived
migration is a governed operation requiring explicit human approval
(`AGENTS.md` section 6).

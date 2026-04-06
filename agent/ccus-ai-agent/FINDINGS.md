# FINDINGS

## [FACTS]
- The facility SSOT is `agent/ccus-ai-agent/db/ccus_master.sqlite`.
- The latest facility workbook provided by the user is `agent/ccus-ai-agent/assets/IEA CCUS Projects Database 2026.xlsx`.
- The existing import path in `agent/ccus-ai-agent/logic/manage.mjs` (`db:import:iea:links`) only updates a subset of facility fields from the workbook and does not perform a full facility refresh.
- The repository had no existing worktree directory; `.worktrees/` must be ignored before creating a project-local worktree.

## [HYPOTHESES]
- The 2026 workbook likely contains facility rows keyed by the same `ID` field used by the current `facilities` table, allowing deterministic upsert/update logic.
- A full workbook refresh will require updating both `facilities` and `facility_i18n`, and may also require rebuilding `facility_partners`, `facility_links`, and `policy_facility_links` only if the workbook carries those fields.

## [BLOCKERS]
- None currently.

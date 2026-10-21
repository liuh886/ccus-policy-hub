# manifest — migrations/2026-10

## add-beijing-ccus-measures-2026.mjs

- **purpose and date**: Ingest Beijing municipal CCUS industrial cultivation measures:
  《北京市关于推动碳捕集利用与封存产业培育壮大的若干措施》（京经信发〔2026〕15号）; 2026-10-21.
- **source and target**: Official Beijing Municipal Government Gazette
  (`https://www.beijing.gov.cn/zhengce/zhengcefagui/202603/t20260324_4564707.html`).
  Target tables: `policies`, `policy_i18n` (en, zh), `policy_analysis` (5 dimensions).
- **input files**: `agent/ccus-ai-agent/db/ccus_master.sqlite`.
- **rows affected**:
  - 1 row in `policies` (`cn-bj-ccus-measures-2026`)
  - 2 rows in `policy_i18n` (bilingual en & zh)
  - 5 rows in `policy_analysis` (`incentive`, `statutory`, `market`, `strategic`, `mrv`)
  - Frozen tables (`facilities`, `country_profiles`, etc.) verified untouched.
- **integrity note**: Content depth score 100/100, healthy status, zero placeholder flags, full bilingual parity.
- **idempotency**: Checks existing policy ID before inserting; re-run skips insertion without error (tested).
- **dry-run & tests**: `add-beijing-ccus-measures-2026.test.mjs` (in-memory execution, content depth evaluation, idempotency).
- **post-migration audits & exports**:
  - `pnpm manage:db:fix-relationships`
  - `pnpm gen` (exports Markdown, public JSON, updates quality metrics)
  - `src/data/dataset_versions.json` updated to 130 policies
  - Deep audit & consistency audit PASS
  - `pnpm test`, `pnpm exec astro check`, `pnpm build`
- **approval status**: Approved by user on 2026-10-21.

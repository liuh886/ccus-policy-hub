# Skill Master: CCUS Governance (v6.2 SQLite)

本手册是 `governance/0_GOVERNANCE.md` 的可执行实现，约束目标是让治理流程在当前仓库中可重复、可审计、可导出。

## 0. 权限与前提

- SSOT 只有一个：`governance/db/ccus_master.sqlite`。
- 执行前必须读取：`governance/0_GOVERNANCE.md`、`governance/OPERATING_RULES_AGENT.md`。
- 仅允许通过 `scripts/manage.mjs` 改写数据库；禁止直接手改 generated artifacts。

## 1. 端到端生产线（唯一标准路径）

推荐直接执行：

`pnpm manage:db:pipeline`

### 1.1 初始化与字典导入

1. `pnpm manage:db:init`（仅 schema 变化后执行）
2. `pnpm manage:db:init-standard`（初始化地区/来源映射）
3. `pnpm manage:db:import:i18n`

### 1.2 数据录入

1. 执行显式 SQLite-native 导入/更新步骤（禁止使用 legacy JSON import）
2. `pnpm manage db:import:iea:links --excel "governance/IEA CCUS Projects Database 2025.xlsx"`（可选但推荐）
3. （仅迁移/应急）`pnpm manage:db:import:md:migration`，禁止日常使用

### 1.3 标准化与关系修复

1. `pnpm manage:db:standardize`
2. `pnpm manage db:standardize:region-zh`
3. `pnpm manage db:standardize:policy-source`
4. `pnpm manage:db:fix-relationships`

### 1.4 审计门禁（不通过不得导出）

1. `pnpm manage:db:audit:deep`
2. `pnpm manage:db:audit:facilities-parity`（设施治理/切换阶段强烈推荐）
3. `pnpm manage db:stats`
4. `pnpm manage db:dict:lint`

### 1.5 导出与前端消费

1. `pnpm manage:db:export:i18n`
2. `pnpm manage:db:export:md`
3. `pnpm manage db:export:schema-enums`

导出物：
- `src/data/i18n_dictionary.json`
- `src/content/policies/{en,zh}/*.md`
- `src/content/facilities/{en,zh}/*.md`
- `src/content/enums.generated.ts`

## 2. 质量门禁与报告

- 审计心跳：`governance/reports/governance_heartbeat.json`
- 数据概览：`governance/reports/stats.json`
- 摘要报告：`governance/reports/data_integrity_summary.md`
- 阈值配置：`governance/audit_thresholds.json`

必须满足：
- `gates.pass == true`
- 导出命令无 `Export blocked` 错误
- 无锁冲突（命令需串行执行）

## 3. 常见故障处理

- 报错 `Database is locked by another process`：等待并串行重跑命令，不要并行调用 `manage` 子命令。
- 报错 `Export blocked. Last audit failed.`：先修复数据，再重跑 `db:audit:deep`。
- 报错 Excel 缺失：检查 `governance/IEA CCUS Projects Database 2025.xlsx` 是否存在，或显式传入 `--excel`。

## 4. 临时脚本治理

- 新增一次性脚本前，优先扩展 `scripts/manage.mjs`。
- 任务结束后，临时脚本必须归档到 `archive/`，不可留在 `scripts/` 根目录污染生产线。
- 治理根目录文件必须通过 `pnpm manage:db:lint-governance` 校验。

---

**版本**：v6.2 (2026-02-10)  
**状态**：已更新（SQLite -> MD 单向设施流程；legacy import 退役）

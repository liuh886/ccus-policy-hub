# Governance Core Pack (v6.3)

本目录采用“核心最小集 + 可生成报告 + 历史归档”的结构，确保治理能力完整且文件数量可控。

## Core Files (长期保留)

- `governance/0_GOVERNANCE.md`
- `governance/OPERATING_RULES_AGENT.md`
- `governance/SKILL_MASTER.md`
- `governance/field_mapping_sqlite.md`
- `governance/audit_thresholds.json`
- `governance/IEA CCUS Projects Database 2025.xlsx`

## Core Directories

- `governance/db/`：SQLite SSOT 与 schema
- `governance/reports/`：审计与统计产物（可覆盖）
- `governance/archive/`：历史方案、旧报告、阶段性文档

## Reusable Commands

- 一键生产线：`pnpm manage:db:pipeline`
- 全量重建（谨慎）：`pnpm manage db:pipeline --init --with-imports --with-iea --excel "governance/IEA CCUS Projects Database 2025.xlsx"`
- 核心文件守卫：`pnpm manage:db:lint-governance`

## End-to-End Output

治理流水线最终保障以下前端输入是可重复生成的：
- `src/data/i18n_dictionary.json`
- `src/content/policies/{en,zh}/*.md`
- `src/content/facilities/{en,zh}/*.md`
- `src/content/enums.generated.ts`

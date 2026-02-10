# Deep Governance Review (2026-02-10)

## Scope

本审查覆盖完整链路：数据库录入 -> 数据管理 -> 数据导出 -> 前端消费。

## Evidence (Executed)

- `pnpm manage db:stats`
- `pnpm manage db:audit:deep`
- `pnpm manage db:export:i18n`
- `pnpm manage db:export:md`
- `pnpm manage db:export:schema-enums`

关键结果（来自 `governance/reports`）：
- 审计门禁：`pass = true`
- 政策总量：`86`
- 设施总量：`1017`
- 无效链接：`0`
- 无效坐标：`0`

## End-to-End Verdict

结论：当前治理架构可以支撑完整流程，且可重复执行。

## Capability Assessment by Stage

### 1) 数据库录入

状态：可支撑。  
依据：
- `manage.mjs` 具备 `db:import:legacy`、`db:import:i18n`、`db:import:iea:links`。
- `governance/IEA CCUS Projects Database 2025.xlsx` 恢复后，IEA 链路默认输入可用。

### 2) 数据管理（标准化 + 关系修复 + 审计）

状态：可支撑。  
依据：
- 具备 `db:standardize`、`db:fix-relationships`、`db:audit:deep`。
- 审计写回 `db_meta.last_audit_pass`，后续导出受门禁约束。

### 3) 数据导出

状态：可支撑。  
依据：
- `db:export:i18n`、`db:export:md`、`db:export:schema-enums` 已通过实测。
- 导出路径覆盖前端所需 JSON + Markdown + 枚举文件。

### 4) 前端消费

状态：可支撑。  
依据：
- 前端消费 `src/content/*` 与 `src/data/i18n_dictionary.json`，均由导出链路生成。
- 结构化枚举由 `src/content/enums.generated.ts` 保持一致性。

## Governance Gaps (Non-blocking but Important)

1. 设施外链覆盖率低  
`facility_links_non_empty_rate = 0`（`governance/reports/stats.json`）。

2. 中文 region 仍为英文回填  
`region_zh_non_chinese_rate = 1`，说明字典覆盖未完成。

3. 政策 URL 覆盖率不足  
`policy_url_non_empty_rate = 0.697674...`，仍有约 30% 缺官方链接。

4. 并行执行易触发锁冲突  
`manage` 子命令并行时会出现 `Database is locked`，流程必须串行。

## Recommended Actions (P1)

1. 执行 IEA 链接补齐：`pnpm manage db:import:iea:links --excel "governance/IEA CCUS Projects Database 2025.xlsx"`。
2. 完善区域中文映射后执行：`pnpm manage db:standardize:region-zh`。
3. 执行 URL 补全：`pnpm manage db:enrich:policy-url`，再复跑 `db:audit:deep` + `db:stats`。
4. CI 中明确串行治理任务，禁止并行跑多个 `manage` 子命令。

# CCUS Policy Hub 治理任务系统 (Todolist v6.2)

## 0. 对齐声明

本文件追踪 `0_GOVERNANCE.md` 的当前治理缺口，重点面向端到端生产线稳定性。

## 1. 已完成（2026-02-10）

- [x] 恢复 `governance` 误删资产（含 `SKILL_MASTER.md`、`IEA CCUS Projects Database 2025.xlsx`）。
- [x] 审计通过：`pnpm manage db:audit:deep`。
- [x] 导出通过：`db:export:i18n`、`db:export:md`、`db:export:schema-enums`。
- [x] 输出深度评估：`governance/3_DEEP_GOVERNANCE_REVIEW_2026-02-10.md`。

## 2. 当前优先级任务

- [ ] **P1 / 设施链接补齐**  
执行 `pnpm manage db:import:iea:links --excel "governance/IEA CCUS Projects Database 2025.xlsx"`，然后复跑审计与统计。

- [ ] **P1 / 区域中文映射补齐**  
完善 `dict_region_alias` 后执行 `pnpm manage db:standardize:region-zh`，将 `region_zh_non_chinese_rate` 降到可接受区间。

- [ ] **P1 / 政策 URL 覆盖率提升**  
执行 `pnpm manage db:enrich:policy-url` 并人工抽样复核，将 `policy_url_non_empty_rate` 提升到 >= 0.9。

- [ ] **P2 / 串行执行约束固化**  
在 CI 或运行手册中明确：禁止并行运行多个 `manage` 子命令，避免 `.lock` 冲突。

## 3. 质量目标（下一轮）

- `facility_links_non_empty_rate` > 0.7
- `region_zh_non_chinese_rate` < 0.1
- `policy_url_non_empty_rate` >= 0.9
- 审计门禁持续 `PASS`

---

**最近审查日期**：2026-02-10  
**执行负责人**：Codex

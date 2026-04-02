
# TodoList: CCUS Policy Hub Evolution

> **Status**: Dynamic Task Tracker | **Alignment**: DESIGN V2.3.0 (DVC)
> **Last Updated**: 2026-03-18

## 1. G20 Governance & FSRTM 5.0 (P0)
- [ ] **[治理][P0]** **FSRTM 5.0 Evaluative Audit**: Perform deep re-scoring and "Small Print" evidence refinement (Min 100 words per axis) for all 44 populated countries. 
- [ ] **[数据][P0]** **DVC Pulse Scan**: Systematically verify legal enactment status (Draft vs Enforced) for EU/US/Canada 2025 regulatory updates.
- [x] **[数据][P0]** Complete the **7 Regulatory Pillars** for all 62 countries (100% Fill Rate achieved).

## 2. Agentic Infrastructure & Tools (P1)
- [ ] **[开发][P1]** Build the **DVC Alarm Module**: Logic to detect regulatory drift (e.g., date mismatch) and trigger autonomous SGP updates.
- [ ] **[运维][P1]** Refactor ccus-ai-agent to support **FSRTM Evidence-Based Auditing**.

## 3. Digital MRV & Clusters (P2)
- [ ] **[设计][P1]** **Digital MRV Layer**: Define schema for linking ESG30 cluster data to policy incentive thresholds.
- [ ] **[内容][P2]** Standardize the "Impact Analysis" JSON for the top 50 global facilities.

## 4. 2026 IEA Facility Refresh (P0)
- [>] **[数据][P0][IEA-2026-01]** Create a safe git worktree backup and isolate the 2026 facility refresh workflow.
- [ ] **[数据][P0][IEA-2026-02]** Analyze `IEA CCUS Projects Database 2026.xlsx` and map workbook fields to the SQLite facility schema.
- [ ] **[数据][P0][IEA-2026-03]** Implement and run a complete SQLite facility refresh from the 2026 IEA workbook.
- [ ] **[验证][P0][IEA-2026-04]** Verify database integrity, export compatibility, and summarize the update in a report.

## 5. Facilities & Compare Regression Sweep (P0)
- [x] **[开发][P0][UX-2026-04-01-01]** 排查并修复 `/facilities/` 地图加载缓慢。Owner: `subagent/frontend-performance`. 验收：地图初始化不再依赖运行时 CDN 串行加载；页面仅向客户端传递地图必需字段；国家级聚合点渲染维持现有交互但显著减少首屏 marker 负担。
- [x] **[数据][P0][UX-2026-04-01-02]** 修复国家基准点重复问题。Owner: `subagent/data-normalization`. 验收：同一国家/地区的 `precision=country` 设施仅映射到单一标准坐标；中国及其它存在双坐标国家完成统一；跨国条目维持单独逻辑，不污染单一国家聚合。
- [x] **[国际化][P0][UX-2026-04-01-03]** 修复中文设施页国家筛选栏中 `International`/跨国类英文残留。Owner: `subagent/i18n-facilities`. 验收：中文页国家筛选全部显示中文别名，含国际/跨国类。
- [x] **[开发][P0][CMP-2026-04-01-04]** 修复 `/compare/` 中文页全球治理成熟度矩阵数据源。Owner: `subagent/compare-analytics`. 验收：X 轴=在运+在建总规模（不区分捕集/封存/全产业链）；Y 轴=所选国家现行政策分数总和；中文页展示真实值，不再依赖过期导出的 `maturity_x/y`。
- [x] **[开发][P0][CMP-2026-04-02-05]** 复核全球治理成熟度矩阵分值上限与聚合逻辑。Owner: `subagent/maturity-audit`. 验收：矩阵 Y 轴不再出现超出 5 维总上限的异常值；明确区分“单政策五维总分”与“国家治理成熟度聚合值”口径；中英文 compare 页面与 SQLite 计算链路保持一致。
- [x] **[开发][P0][UX-2026-04-02-06]** 修复 `/facilities/` 地图无设施点渲染问题。Owner: `subagent/map-runtime`. 验收：设施页地图可稳定初始化并显示 marker/cluster；首屏无 JS 报错；中文与英文设施页都可见设施点。

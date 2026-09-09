# Issue #69 归一化映射（APPROVED + EXECUTED 2026-09-08）

> 审批：Q1 Upcoming、Q2 Active（2026-09-08）。迁移
> `migrations/2026-09/normalize-policy-taxonomy-2026-09.mjs` 已执行；
> `config.ts` en schema 已收 `z.enum`；categoryMap 已删；CI 守卫
> `scripts/policy-taxonomy.test.mjs` 已加。残留 zh 译文值由字典路径覆盖，
> 见正文。

## Category 映射（9 raw → 6 canonical，全部落在 POLICY_CATEGORIES 内）

| #   | raw（n）                                                                      | → canonical          | 依据                                                                        |
| --- | ----------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------- |
| 1   | Regulatory（57）                                                              | Regulatory           | identity                                                                    |
| 2   | Strategic（30）                                                               | Strategic            | identity                                                                    |
| 3   | Incentive（17）                                                               | Incentive            | identity；抽查 17 条全为财政工具（45Q、SDE++、BOI、RIGI…），同类            |
| 4   | Market（10）                                                                  | Market               | identity（碳市场/ETS/CBAM 类机制）                                          |
| 5   | 法律监管（6）                                                                 | Regulatory           | zh 重复；`ui_category` 确认 法律监管＝Regulatory 的 zh 标签                 |
| 6   | Technical（4）                                                                | Technical            | identity（CRCF、MRR、OCCS、CCS+ 均为技术规则）                              |
| 7   | Methodology（3: gold-standard, ipcc-guidelines, verra-vm0049）                | Technical Standard   | MRV/核算方法学＝技术标准；与 categoryMap（Technical Standard→技术规范）一致 |
| 8   | Statutory（2: za-climate-change-act-2024, tr-climate-law-2025，均为国会法案） | Regulatory Framework | 法案＝建制性框架；与 categoryMap（Regulatory Framework→法律监管）一致       |
| 9   | Tax Incentives（1: us-obbba-45q-2025，45Q 税收抵免修订）                      | Incentive            | 17 条 Incentive 同行全是财政工具；`ui_category` Incentive→经济激励          |

迁移后分布：Regulatory 63 / Strategic 30 / Incentive 18 / Market 10 / Technical 4 /
Technical Standard 3 / Regulatory Framework 2。`Economic Incentive`、`Market Mechanism`、
`Strategic Guidance` 三个枚举项继续 0 条（见开放问题 Q3）。

## Status 映射（9 raw → 5 canonical，全部落在 POLICY_STATUSES 内）

| #   | raw（n）                                                                         | → canonical       | 依据                                                                        |
| --- | -------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------- |
| 1   | Active（115）                                                                    | Active            | identity                                                                    |
| 2   | 现行（6）                                                                        | Active            | zh 重复；`ui_status` 确认 现行＝Active 的 zh 标签（与 category #5 同 6 条） |
| 3   | Planned（3）                                                                     | Planned           | identity                                                                    |
| 4   | Upcoming（1）                                                                    | Upcoming          | identity                                                                    |
| 5   | Under development（1）                                                           | Under development | identity                                                                    |
| 6   | Proposed（1: br-bill-1425-2022，已提交国会审议的法案）                           | Upcoming ⚠️       | 已过起草、待生效 → Upcoming；备选 Planned（见 Q1）                          |
| 7   | Policy principles adopted（1: de-icm-strategy，要点已通过、全文待定）            | Upcoming ⚠️       | 原则通过、细则待定 → Upcoming；备选 Planned（见 Q1）                        |
| 8   | Draft for public comment（1: us-doe-carbon-management-strategy，公开征求意见稿） | Under development | 仍在制定程序内（含咨询）                                                    |
| 9   | Awarded（1: no-14th-licensing-round-2025，许可轮已授标）                         | Active ⚠️         | 轮次已完成并产生法律效力；备选：在枚举外新增值（见 Q2）                     |

迁移后分布：Active 122 / Planned 3 / Upcoming 3 / Under development 2。

## 迁移执行计划（批准后才做）

1. SQLite-first：UPDATE policies SET category/status（走 db-write.mjs 锁＋原子写），
   同步补 `ui_category`/`ui_status` 缺失行（本草案确认字典已全，无需补）。
2. 重跑 `db:export:md`＋`export:i18n`，双语 markdown 再生；deep audit＋consistency＋diff 门禁。
3. `config.ts` policy status/category 收 `z.enum(POLICY_CATEGORIES/POLICY_STATUSES)`；
   删 `PolicyIndex.astro` categoryMap 补丁（迁移后 zh 文件内为字典直译值，补丁无命中）。
4. CI 加枚举守卫（新值先红）。

## 开放问题（需拍板）

- **Q1**：#6 Proposed、#7 Principles-adopted → Upcoming 还是 Planned？
  当前生命周期语义：Under development（起草中）→ Planned（已规划）→ Upcoming（即将实施）→
  Active（现行）。已提交审议的法案／已通过要点，落在 Planned 与 Upcoming 之间。
- **Q2**：#9 Awarded → Active 是否可接受？还是在 POLICY_STATUSES 增新值？
  增新值会扩大枚举面（与收紧方向相反），不推荐，但决定权在你。
- **Q3**：目标枚举内 4 个 0 条目（Economic Incentive、Market Mechanism、
  Strategic Guidance，以及 Facility 侧若干）是否顺手折叠？建议不折叠（另案治理，
  本轮只做 raw→canonical 最小映射）。
- **Q4（范围外观察，不 blocking）**：`norway-longship` 以 policy＋法律监管入库，
  实为项目记录，疑似分类错误；`puro-earth`、`iso-standards` 同为 6 条 zh 规范列之一，
  系历史写入语言不一致。是否另起数据质量单修？

## 另两项 T4 待拍板（本草案不含执行动作）

- **关系模型 Phase 2**：`docs/facility-policy-relationship-model.md` 规范已完整
  （country/sector/evidence 三级，confidence 0.3/0.6/0.9）。待批：① 是否执行 Phase 2
  schema 迁移（6,938 条全量标 country/0.3）；② confidence 取值确认；③ `created_at/
updated_at` 用 `datetime('now')`（一次性墙钟，需豁免确定性规则）。
- **政策内容深度**：103/130 待改进，中位 44/100，priority queue 见
  `docs/policy-content-depth-report.md`（critical 集中希腊/菲律宾/罗马尼亚等）。
  待批：① 先修 critical 还是按国别批量；② 目标分线（如 ≥70）；③ agent 可否按
  AGENTS.md 证据规则起草内容（每条需一手来源），还是只列清单由人工写。

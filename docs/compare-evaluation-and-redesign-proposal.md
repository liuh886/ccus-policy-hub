# 对比页（`/compare/`）评估与改版提案

> 状态：**提案（proposal only），不改代码、不改 DB、不改方法论。**
> 任何治理维度、聚合口径、容量方法论的实际变更，需按 `agent/ccus-ai-agent/AGENTS.md §6`
> 获得人工批准后，另起实施 PR。本 PR 只新增本文档，供评审与排期。
> 评估基线：`main`（`eba6c5a7`）+ 线上 `https://liuh886.github.io/ccus-policy-hub/compare/`（2026-09-17 实测）。

## 0. 一句话结论

**观感是对的：首次打开的体感完成度只有约 35–40%。但底层工程已完成约 70%——最强的部分被藏在了“先去选 5 个政策”的空状态后面。**

首屏实际呈现（无选择时）：标题 + 一段描述 + `治理基准 —/100`、`部署基准 —` + 空图表容器 + `暂未选择对比政策，请从政策数据库中选择多项政策（最多 5 项）`。用户会天然解读为“半成品”，而不是“等你选数据的工具”。

## 1. 已完成的部分（不要推倒重来）

| 能力                                                                                  | 位置                                                     | 评价                               |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------- |
| 峰值治理能力算法（各维度取现行政策最高分，均值成指数，输出最强/最短板/离散度/贡献者） | `src/lib/governanceBenchmarking.mjs:44-104`              | 方法自洽，是本站差异化核心，保留   |
| 中位数全球基准 + 四象限分类（协同领先/制度先行/工程先行/基础培育）                    | `src/lib/governanceBenchmarking.mjs:155-183`             | 保留，文案已完整中英               |
| 雷达 + 热力切换、散点矩阵象限底色 + 标签防重叠、洞察卡 + 证据面板联动高亮             | `src/lib/governanceWorkspaceVisuals.mjs:241-543`         | 工程完成度约 80%，保留并做小修     |
| 页面载荷裁剪（policy 只下发 6 字段、facility 5 字段，`{id,data}` 信封不动客户端）     | `src/lib/comparePayload.mjs:21-64`                       | 做得对，继续守住字段清单           |
| 治理 copy 中英三字典 + key 对齐测试                                                   | `src/lib/governanceCopy.mjs`                             | 保留，命名统一时以它为收敛目标之一 |
| 监管 7 要素打通 66 国 profile                                                         | `src/lib/governanceComparisonClient.mjs:100-110,219-246` | 数据链路已通，只差呈现升级         |
| 政策库加权排名（5 滑杆实时重排）                                                      | `src/components/PolicyIndex.astro:305-338`               | 与对比页联动的基础，见 §5          |

## 2. 为什么“看起来没做完”：7 个断层

### 断层 1：冷启动空白（最致命）

- 对比状态只存 `localStorage['compare-list']`（`CompareDrawer.astro:69-166`、`governanceComparisonClient.mjs:258-266`）。
- 直接访问 `/compare/`（搜索、外链、书签）永远是空状态；无 URL 参数、无预设、无示例缩略图。
- 基准 chip 默认 `—/100`、`—`（`GovernanceAnalyticsPanels.astro:91-101` + `updateBenchmarkLabels` 只在有选择后填充），首屏即“没数据”。

### 断层 2：心智模型错位——选的是政策，比的是国家

- `PolicyCard.astro:194-221` 让用户勾**政策**（≤5）。
- `governanceComparisonClient.mjs:281-298` 实际按政策所属**国家**聚合，`scope==='system'` 默认把该国**全部现行政策**拉进来算峰值。
- 用户以为比 3 个文件，实际在比 2 个国家体系（政策数突然变成“美国 20+ 项”）。
- `select#analysis-scope`（`GovernanceAnalyticsPanels.astro:56-65`）藏在二级面板，几乎不可发现。

> 定位修正：**国家治理体系对标工作台，以国家为一等公民，政策是证据。**

### 断层 3：没有叙事——7 个板块平铺，无结论

现有纵序：雷达/热力 → 矩阵 → 洞察卡 → 证据 → 设施 3 数字 → 贡献政策 → 监管长文本表。
缺失：**一句话洞察、计分卡大表（可排序）、排名**。决策者 3 秒内回答不了“谁强、强在哪、证据在哪”。

### 断层 4：数据优势只用了约 30%

| 有但没用的弹药                                         | 位置                                             | 可比什么                                             |
| ------------------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------- |
| `legalWeight`（国家战略 vs 部门规章）                  | policy frontmatter                               | 制度含金量                                           |
| `implementationDetails.fundingScale`（45Q 等激励规模） | policy frontmatter，卡片已展示                   | 钱的量级，最值得比                                   |
| `impactAnalysis` 经济/技术/环境                        | policy frontmatter，详情页已展示                 | 政策影响结构                                         |
| `evolution.milestones`                                 | policy frontmatter（如 `ae-carbon-strategy.md`） | 治理演进时间线                                       |
| 设施 `sector/type/region/hub/date`                     | facilities collection                            | 部署结构（电力/水泥/钢铁/制氢；捕集/运输/封存/全链） |
| `planned` 管线                                         | 有数据，矩阵 X 轴一刀切排除                      | 预期信号（中东/东南亚被系统性低估）                  |
| `reviewStatus/provenance` + `quality.json`             | 详情页有 Verified 徽                             | 可信度分层                                           |

### 断层 5：方法不透明

全页方法说明只有一句：`治理能力指数为五个峰值维度的平均值`。
没讲：**峰值法**（取各维度最高分政策，非平均分——这是对的，但用户不知道）、等权假设、中位数基准口径、设施 `operational+construction` 口径、设施–政策关联置信度（`README` 三级：country 低 / sector 中 / direct 高，对比页现状 100% country-level，应标注）。

### 断层 6：不可分享、假导出

- 无 `?countries=` 深链，跨设备/跨人协作断裂；`storage` 事件只管多标签同步。
- `导出分析报告 (PDF)` = `window.print()`（`governanceComparisonClient.mjs:320-321`），无 CSV/JSON/引用（Zenodo DOI）导出。

### 断层 7：细节廉价感

- `GovernanceComparisonWorkspace.astro:140` 的 `emptyHref`（`${BASE}/policy/`）在线上渲染成 `/ccus-policy-hub//policy/` 双斜杠。
- 监管矩阵是 7 行长中文句子纯文本，无状态色、无术语定义、无来源跳转，无法横向扫读。
- 维度命名三处不一致：政策库（法律监管/经济激励/市场机制/战略引导/技术规范）vs 对比页（经济激励/法规制度/市场机制/战略规划/MRV与数据治理）vs 详情页雷达（经济激励/法律监管/市场机制/战略引导/技术规范）。

## 3. 对比页应该是什么：北极星与 4 个黄金问题

北极星：**从“选政策看图”变成“国家治理体系对标工作台”，3 秒说清“谁强、强在哪、证据在哪”，链接可分享，结论可引用。**

页面必须回答：

1. 治理谁强？（指数 + 排名 + vs 全球中位数）
2. 强在哪、缺在哪？（5 维结构 + 最强/最短板 + 离散度）
3. 制度转成项目了吗？（治理–部署象限 + 在运/在建/规划结构 + sector/type 结构）
4. 凭什么这么说？（每分必有 `evidence + citation + 贡献政策 + reviewStatus`，方法与口径可查）

## 4. 呈现方案：5 层叙事（现状 → 改法）

```text
[L1 选择层] 国家选择器 + 预设组合 + URL 可分享
[L2 总览层] 一句话洞察 + 计分卡大表（可排序）
[L3 结构层] 雷达/热力 + 治理–部署矩阵（现有保留，升级）
[L4 机制层] 监管7支柱（状态点+定义+来源）+ 设施结构（堆叠条）+ 政策时间线
[L5 证据层] 点击穿透 evidence/citation + 导出 CSV/JSON/引用 + 方法+质量徽章
```

**L1 选择层（P0）：**默认加载 `美国 + 中国 + 英国 + 挪威`（覆盖四象限，首屏永远有图）；
国家多选器替代“去政策库勾选”（policy→country 反查已具备）；预设一键（中美欧三强 / 英语圈 / 海湾新兴 / 北欧封存圈）；
`?countries=US,CN,GB&scope=system&view=radar` 深链（`localStorage` 只做辅助）；
空状态重做为 3 个预设卡片 + 示例缩略图，而非“去选吧”。

**L2 总览层（现在缺失，P0）：**模板生成一句话洞察
（例：`美国治理 78.4（+12.1 vs 基准），优势在经济激励，短板在跨境规则；已承诺 25.3Mtpa，位于协同领先象限。`）；
计分卡表头：`国家 | 治理指数 | 5维迷你条 | 现行政策数 | 已承诺Mtpa | 规划Mtpa | 监管就绪度 n/7 | 象限`，可点表头排序。

**L3 结构层（保留优化，P0–P1）：**雷达/热力保留（>3 国默认热力，`preferredProfileView` 逻辑正确）；
矩阵 X 轴加 toggle（已承诺 / 含规划管线）；Y 轴截断（`governanceAxisMinimum` 从 30 起正确）必须标注“截断轴”。

**L4 机制层（差距最大，P1–P2）：**监管矩阵文本改为 `●就绪/◐部分/○缺失/—待定 + hover 定义 + 跳 country profile`；
设施 3 数字改为堆叠条（在运/在建/规划）+ sector 分布 + type 分布；
贡献政策卡加上 `year + legalWeight + fundingScale`（peak 彩色点保留）；
新增 `evolution.milestones` 时间线（2015–2026），区分制度先行 vs 后发追赶。

**L5 证据与导出（P1）：**`evidenceForCountry` 已有 evidence+citation+openPolicy，加上 `reviewStatus` 徽章；
打印样式真正做分页（现在只是 `print:hidden` 藏头）；新增 `导出 CSV（计分卡）/ JSON（带 evidence）/ 复制引用（Zenodo DOI）`；
方法弹窗讲清三句：峰值法 / 等权平均 / 中位数基准 + 设施口径 + 关联置信度 + `/quality/` 链接。

## 5. 政策评估库与对比系统如何结合

1. **权重联动（核心）：**`PolicyIndex` 已有 5 滑杆加权排名，对比页却是等权平均。
   改法：`calculateGovernanceCapability(policies, weights?)` 加可选权重参数，对比页加同款滑杆，默认等权，改动即重算指数与矩阵 Y 轴。两处共用同一权重语义。
2. **命名统一：**三处维度中文先收敛到 `governanceCopy.mjs` 一处（与 `docs/ROADMAP.md` 的 i18n 收敛项合并，避免另起第四套）。
3. **双向闭环：**政策详情已有国家聚合雷达（`PolicyDetail.astro:224-312`），补“一键加入对比”；
   对比 → 贡献政策 → 政策详情 → 相关设施（`relatedFacilities` 双向逻辑 `PolicyDetail.astro:126-130` 已有，只差入口）。
4. **置信度标注：**对比页注明“设施–政策为 jurisdiction 级关联，非项目级法律适用”（`README` 三级置信度），学者才敢引用。

## 6. 路线图

**P0（1–2 天，解决“看起来没做完”）：**默认 4 国预设 + 空状态重做 + 修双斜杠链接；
`?countries=` 深链 + Drawer 同步；计分卡总览表（纯 HTML 表，无新依赖）；
方法折叠块 + 基准骨架屏（替代 `—`）。

**P1（1 周，发挥优势）：**国家选择器 + 预设组合；权重滑杆联动；
监管状态点化 + 设施堆叠条；CSV/引用导出。

**P2（2–3 周，做深）：**政策时间线 + sector/type 结构；质量徽章 + planned toggle + 移动端卡片化；
预设组合 SEO（`og:image` + 描述）；EN/ZH copy 对齐加固。

**验收标准（隐身模式）：**打开 `/compare/`，3 秒说出谁强/强在哪/证据在哪；
复制 URL 给同事打开是同一视图；每个分数都能点到 `evidence + citation + 政策原文`。

## 7. 风险与不做事项

- 不改动 `GOVERNANCE_DIMENSIONS` 五维定义与峰值聚合语义（AGENTS.md §6 高风险，需另行审批）。
- 不改动 Pipeline/Committed 容量口径（`README` 方法论已承诺）。
- 不动 `public/data/*.json` 对外 AI 接口结构（`comparePayload` 只动页面内嵌 payload，如需动接口则版本化）。
- 大视觉/IA 重构以本提案评审通过为前提，不在本文档 PR 里顺手做。

## 附录：涉及文件清单（实施 PR 参考）

- `src/components/GovernanceComparisonWorkspace.astro`（L1/L2/L5 结构）
- `src/components/GovernanceAnalyticsPanels.astro`（基准 chip、scope、移动 tabs）
- `src/lib/governanceComparisonClient.mjs`（选择→国家聚合→渲染主流程）
- `src/lib/governanceWorkspaceVisuals.mjs`（雷达/矩阵/洞察/证据渲染）
- `src/lib/governanceBenchmarking.mjs`（权重参数、基准、象限）
- `src/lib/governanceCopy.mjs`（命名统一收敛点）
- `src/lib/comparePayload.mjs`（字段清单，动字段需同步 `scripts/page-payload.test.mjs`）
- `src/components/CompareDrawer.astro` + `src/components/PolicyCard.astro`（选择器联动）
- `src/components/PolicyDetail.astro:224-312`（详情→对比入口）

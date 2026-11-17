# 研究方案：将报告与政策原文归档转化为可引用的 Agent-ready 证据资产

> 状态：**架构论证与待验证契约，不是已完成的功能** · 2026-10-30
>
> 产品边界及实施进度分别以 [PR #105 的 PRODUCT_BOUNDARIES](https://github.com/liuh886/ccus-policy-hub/pull/105) 和其 `docs/ROADMAP.md` 为准。本文只回答“证据如何成为可复核的数据资产”；不维护独立的工作队列，不承诺站内问答 Agent。

## 一、研究问题与已有证据

我们已经有政策事实库、双语站点、分析报告，也开始批量归档来源。但**已下载的文件不等于经过审核的原始证据**，尤其不能被直接转化为法规条款、项目法律资格或“当前有效”判断。

2026-10-30 的已观察基线：

- `main@aa68b45f`：SQLite 结构化政策记录 **130** 条；旧的 `policy-source-url-gaps` 仅检查字段是否非空。
- [#107 首次实测](https://github.com/liuh886/ccus-policy-hub/pull/107)：全部 130 个政策 ID 有采集审计记录；首轮 34 份归档中 8 份是机构主页。第二轮 Google Drive 共保留 **44** 个原始文件，但仅 **36 个政策 ID** 有非主页**候选**，还未通过文书身份和版本审核；**44 条政策记录**的原 URL 太宽泛。来源：[第二轮实测审查](https://github.com/liuh886/ccus-policy-hub/blob/feat/source-archive-colab-incremental-20261030/tools/source_archive/POLICY_SOURCE_SECOND_RUN_REVIEW_20261030.md)。
- #107 的 v3 在 130 条记录上生成 160 条人工审核候选记录，其中 46 条 URL 候选只覆盖 16 条政策；不相关法律/隐私政策曾被高分误推荐。v4 已通过针对这些假阳性的离线 fixture 检查，**尚不能等同 v4 真实运行通过或原文身份审核**。
- [#104](https://github.com/liuh886/ccus-policy-hub/pull/104) 已有一份 Git 冻结的 2024 年美国法典 §45Q 原文字节、哈希、正文定位与静态消费者，但该定位仍为 `draft/not_reviewed`；历史原文截至 2025-01-06 不能代表现行法。
- GCCSI 报告有独立增量归档流程（[ #107 操作说明](https://github.com/liuh886/ccus-policy-hub/pull/107)）；其**报告观点属于二次分析证据**，不能自动转换成“原始法规已证明此结论”。

### 需要分别测量的四种完成度

- **政策**：政策 ID 是否有被人工确认匹配的原始法案/规章/计划/官方说明；不能用 URL 非空代替。
- **文档**：独立原始文件是否已识别，取得合法访问权限和可复现字节摘要。
- **版本**：edition、修订版、公布/生效/覆盖截止是否被单独识别；新增版本不能覆盖旧版。
- **引用**：某条主张是否有稳定文档版本、具体段落/页码/条款、引用原句及审核状态。

## 二、统一术语：五种对象，不混为一谈

1. `policy_id` / `facility_id` / `report_id`：**现有研究对象/目录身份**。政策事实仍由 SQLite SSOT 管理；学术报告以其上游文稿为权威。
2. `source_document_id`：**文书身份**，如特定法律、实施细则、官方技术指引、GCCSI 研究报告。政策、报告与文书可多对多，不能从标题字符串推断关联。
3. `source_version_id`：**不可变版次快照**，由文书身份、明确版次、原始字节 SHA-256 联合确认；相同文书的新增版次保留既有引用。
4. `anchor_id`：**特定版本中的可核查位置**。可为法规条/款、HTML text quote + normalized text offset，或 PDF 实际物理页 + 印刷页标记 + 精确短引文；必须记录提取器及归一化规则版本。
5. `claim_id`：**拟公开的结构化主张或摘录**，其关系是 `supports/mentions/contradicts/qualifies` 等有人工复核的类型。一个主张可能依赖多个文书与版本；**文档存在不等于主张被证成**。

不要先建全域知识图谱；这只是最小可消费的数据契约语义。技术实现先复用 #104 的 Git 证据 packet 和既有 SQLite ID，证明有真实维护/查询瓶颈才提出最小治理 schema。所有未建立关系均保持 `unknown`。

## 三、所有权：采集、审核、发布三层严格分开

```text
官方法规/报告发行方             SQLite（已接受政策/项目事实）
         │                                    │
         ▼                                    │
Colab / Drive 私有原始归档                 ┌────┘
[采集日志、原字节、哈希、候选]           │
         │                                │
         ▼                                │
人工认定文书身份/版次/版权/所支持主张       │
         │                                │
         ▼                                │
受审证据 packet：文档版本、定位、审查状态 ──┘
         │ 仅在可分发时保留 Git 原始字节
         ▼
已存在的确定性公开导出/manifest/JSON Schema
         ├── 网站研究页面（人读）
         └── 外部 Agent 消费（发现→校验→定位→引用/缺口）
```

**首选方案：Drive 作采集工作区与不可删除备份；Git（在许可允许且容量合理时）保存已确认的版本证据；SQLite 只管理已接受的结构化政策/项目事实；公开 JSON 仅由受审输入确定性生成。**

- Google Drive 私有文件 ID **不是公共可引用永久 URL**，不能直接作为 Agent 的开放证据端点。应保留发行方官方 URL；对不允许再分发的原件，只公开合法的元数据、定位线索、审查结论、哈希和许可声明；缺少可公共复核路径时如实标记受限。
- 对已授权原件，Git 以版本化文件（或既有上游文档权威）保存不可变源字节；同一原文不能既在 Git 又在 SQLite BLOB 当作两套可改写权威。大文件和许可受限文件不必为实现产品强行复制到公开仓库。
- Drive CSV 是**采集运行记录/候选**，既不是事实权威，也不能自动将候选 URL 回写 `policies.url`。纠错先经人工确认，再通过现有受治理的数据提交过程修改 SQLite。
- 文档原文层不直接写政策评分或“符合资格”等推理结果；经过审查才让引用支持具体发布主张。

## 四、从两类材料生成证据：不同信任等级

### A. 政策/法规原文（primary source）

阶段：发行方官方页面识别 → 明确文书号/发布机构/语言 → 获取真实原件 → 固定版本及哈希 → 规范化正文/保留页结构 → 定位条款 → 审核**具体引文** → 公开证据索引。

最低字段应能回答：

- **谁发布的？** `issuer`, `jurisdiction`, `document_type`, `canonical_url`, `instrument_identifier`。
- **哪个版本？** `edition`, `published_at`, `effective_from`, `effective_to`（不确定时 null）, `source_current_through`, `retrieved_at`, `raw_sha256`。
- **引用什么？** `anchor_id`, `locator`, `exact_quote`, `source_version_id`, `extraction_profile`, `normalized_sha256`。
- **可信到哪里？** `review.status`, `review.scope`, `reviewer`, `reviewed_at`, `source_currentness_verified`, `gaps`。

已复核历史法条也不证明现行法。法律文本、官方解释、部门网页、项目新闻须区别标注角色，不能仅凭官方域名或 200 响应认定为制定法原文。

### B. GCCSI/其他机构报告（secondary research source）

阶段：报告标识/作者/机构/年份/版次/版权 → 原始 PDF 归档 → 基于**实际 PDF 物理页**的保守正文提取 → 表格/图例/段落定位 → 逐项确认报告的**陈述和统计口径** → 有出处的报告观点摘要或数据点。

- **报告中的观点**可以被引用为“GCCSI 在某版报告中认为/统计”；不能升级成对应法规原文已核实，也不能代替独立核实法条。
- **图表与表格**必须保留单位、口径、时期、区域、图表编号、PDF 物理页、可见印刷页，以及不确定性/附注；提取后的数字须与源表核对。
- PDF 与 HTML 的定位能力不同：PDF 优先使用 `page_index`（0-based）及人类页码 `page_label`、`exact_quote`、可选 `table_or_figure_id`；不要将 #104 的 HTML UTF-16 offsets 硬套在 PDF。
- 没有稳定数字/引文或页面含扫描图像时，标记 `extraction_pending` 或 `manual_review_required`，不要自动猜测；扫描件 OCR 仅在必要并验证版面时考虑。
- CCUS Policy Hub 不是 GCCSI 镜像站。许可不明确时不公开大段提取正文或整份 PDF，而是公开引用入口、版本与受审的短摘要/定位信息。

### C. 本站 ESG30 报告

- 研究报告正文和 PDF 的内容权威仍在上游 `2601_ESG30`；本仓库已有的同步页面只是**发布投影**。
- 本文引用上游报告的明确 Git 版本与 PDF/HTML 生成标识，不把本站自动同步产物转回上游权威，也不把论文观点伪装成法规一手证据。

## 五、候选 Agent-ready 契约（研究草案，非现有部署）

最小关系示例（字段为评审建议，**并非声称当前 Schema 已包含**）：

```json
{
  "claim_id": "example-claim-001",
  "subject_id": "us-45q-ira",
  "claim_type": "source_excerpt",
  "claim_language": "en",
  "supports": [
    {
      "source_document_id": "us-45q-usc",
      "source_version_id": "us-45q-usc-2024",
      "raw_sha256": "<verified-raw-digest>",
      "anchor_id": "qualified-facility",
      "locator": "26 USC 45Q(d), 2024 edition",
      "review_status": "draft",
      "source_currentness_verified": false
    }
  ],
  "gaps": ["human_review_pending", "current_law_not_verified"]
}
```

**消费者规则**：只有审核过的版本与相应锚点能标示为 `reviewed`；`draft` 只能作为研究候选。公开 cite token 至少要能反解 `document_id/version_id/anchor_id`；链接和哈希失效不得静默回退到不同版本；受限原文的访问能力须单独标记。**可引用**与**可公开复核原文字节**也是不同能力，必须分别报告。

建议保留一条最短访问路径：现有 `/data/manifest.json` → 来源证据索引/Schema → `source_version_id` → `anchor_id` → `source_url`/允许公开的原文字节。独立消费者不依赖站内 SQLite、Colab 或 Drive 权限。

## 六、架构方案比较与推荐

**方案 1：Drive 直接作为 Agent 数据源。** 优点是采集省事；缺点是私有权限、URL 稳定性、第三方不可复核、原始文件与审核结论无法天然区分。**不作为公共 Agent-ready 权威。**

**方案 2：Git 冻结受审证据 + SQLite 既有事实 + 确定性静态发布。** 已被 #104 以一份 45Q 样例验证部分技术可行性；稳定、少运行服务、符合现有 Pages/Astro 和单一事实权威。跨 PDF/HTML、不同版权场景与多文档关联尚需实测。**首选。**

**方案 3：全文入库/新三表/外部知识图谱或向量服务。** 能支持大型实时查询，但引入重复正文、双写、权限、运行成本以及审核耦合，且目前没有证明静态路径不够用。**现阶段不批准**；出现真实多文档版本查询瓶颈再评估。

可借鉴成熟规范的**概念**，不预防性加载复杂语义框架：

- [W3C PROV-O](https://www.w3.org/TR/prov-o/) 区分原始实体、处理活动、责任方与派生关系，适合作为最小 provenance 字段的设计依据；无需先部署 RDF。
- [W3C Web Annotation](https://www.w3.org/TR/annotation-model/) 的 TextQuoteSelector、TextPositionSelector 说明精确引文加上下文及偏移的可核验定位方式；不要忽略版本状态或把易变 HTML 偏移当稳定身份。
- [RFC 8785 JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785.html) 提供跨实现规范化哈希参考；项目当前确定性 JSON + SHA-256 已满足起步需求，只有观察到跨语言序列化分歧才增加 JCS 依赖。

## 七、研究实验与决策门禁

正式结论必须由**三种真实输入**检验，而不是只从 45Q 单例外推：

1. **美国 45Q**：复用 #104 的 2024 HTML，确认历史文书身份/版本/锚点，同时在欠缺当期修法核验时维持“现行法未知”。
2. **欧盟或英国法规**：优先欧盟地质封存指令（原始/整合版本分开）或英国 Energy Act 2023（核对章节编号及最初公布文本）。测试不同官网格式与版本时间边界。
3. **一份 GCCSI PDF 报告**：由私有归档提取一个可公开引用的页段/表格要素，保留机构、年份、物理页、版面表头、数字单位及许可限制；用原始 PDF 逐项人工复核。

三个实验必须共同回答：

- 能否不创建新的事实权威，把采集候选变成受审、可重复生成的来源证据？
- 多文档关联是否真需要 schema，还是文件 packet/既有 ID 足够？
- HTML/PDF 的定位是否可由同一**引用语义**处理，同时保留格式专属定位字段？
- Drive 内容无法公开再分发时，外部 Agent 可读取什么？哪里必须返回 `restricted`/unknown？
- 上游换版、提取器升级、URL 迁移、章节重排时，旧引用是否仍能指向**旧版本**且不错误继承审核？

**研究完成条件**：给出针对三例的实际字段/Schema 差异、原文身份与版权复核结果、正反例、引用示例和“现有接口足够/必须做最小增量”的明确决策表。设计结论通过审核后，实施工作回填**唯一** `docs/ROADMAP.md` 并拆为针对采集/证据/发布的聚焦 PR，不另设平行路线图。

## 八、拒绝的误差与实现边界

- 不能使用“上传成功数/来源 URL 非空数”代替原文覆盖率；不能把报告观点升级成制定法、将 homepage 升级成法律原文。
- 不能把自动文本抽取、标题相似度、官方域名、HTTP 200 或模型生成当人工真实性审核。
- 不预设统一 PDF/HTML 解析器、全库 OCR、通用爬虫、向量数据库、MCP 服务器、聊天界面或法律资格判定。
- 不把私有 Drive 文件 ID、外部许可证不明的 PDF 或未经审核的摘要当作可以公开再分发的证据。
- 不改变已运行的人类研究站、ESG30 上游同步或 SQLite 已接受政策事实；本研究不是数据迁移授权。

# RFC：从报告与法规原文到可引用的 CCUS Context 数据资产

> 版本：0.1 · 首轮讨论：2026-10-30 · 状态：**Open for discussion / 未批准实施**
>
> 讨论统一在本 RFC 所属 GitHub PR 的 Review/Conversation 中进行；经过讨论的决定回写本文「决策日志」，保留原提问、备选项、反例、证据和状态。**不另建平行 ROADMAP**。项目的产品边界以 docs/PRODUCT_BOUNDARIES.md、实施优先级以 docs/ROADMAP.md 为权威。本文件是 #108 的**具体化技术论证**，不是替代 #108，也不代表已发布功能。

## 0. 参考来源与本轮边界

用户分享了 Muse Artifact 参考页面：

https://muse.ai/s/space-2-xlxe64u6xlxhn09/xs0cU6ExUNomLYLV1pCQEDF6FTETS-ofnh2WOIJXQ78

本轮通过公开抓取无法访问分享页，已连接浏览器的页面读取也未成功。因此**没有审核该页面内部布局、交互、文件列表或 Agent 执行结果**。该链接按用户提供的真实参考保留；在获得页面具体内容、截图或可访问的公开页面前，不基于该页面臆测产品特性。

可核查的类似成熟产品做法：[Adobe PDF Spaces Knowledge Base collections](https://helpx.adobe.com/acrobat/web/explore-pdf-spaces/knowledge-base-collections/overview.html) 可引用企业现有知识库而不把每个文件复制进 Space，并强调可追溯引用；[共享与权限说明](https://helpx.adobe.com/acrobat/web/explore-pdf-spaces/knowledge-base-collections/share.html) 明确分享空间并不等于授予源文件访问权。这是**独立对照产品**，不能冒充用户 Muse 页面内容。

我们借鉴的不是“加聊天窗口”或“上传所有文件做 RAG”，而是两项产品能力：**可核验来源卡片**、**引用内容和原文件权限独立判断**。CCUS Policy Hub 继续提供外部 Agent 可消费的公开静态数据，不承诺本站问答能力。

### 已存在、无需重写的组件

- **已接受政策事实** — 实际来源：agent/ccus-ai-agent/db/ccus_master.sqlite；当前状态：main 上唯一结构化维护权威，130 条 policy；在本 RFC 中怎样复用：读取 policy ID、现有事实，不复制维护政策描述
- **来源覆盖基线** — 实际来源：[#111](https://github.com/liuh886/ccus-policy-hub/pull/111) / [#106](https://github.com/liuh886/ccus-policy-hub/issues/106)；当前状态：#111 分支候选，按 130 ID 审计，当前 main 尚未合入；在本 RFC 中怎样复用：使用审计状态，不把归档、候选、验证混计
- **GCCSI/法规原件采集** — 实际来源：[#107](https://github.com/liuh886/ccus-policy-hub/pull/107)；当前状态：私有 Drive 原件、增量归档和候选审核；draft；在本 RFC 中怎样复用：上游采集输入，不能自动晋级法律事实
- **静态 Context** — 实际来源：[#103](https://github.com/liuh886/ccus-policy-hub/pull/103)；当前状态：分支上的 manifest / JSON Schema / bundle / 独立消费者；在本 RFC 中怎样复用：复用同一发布与读取入口，不另设一套 HTTP/API
- **固定版本法条** — 实际来源：[#104](https://github.com/liuh886/ccus-policy-hub/pull/104)；当前状态：2024 年 45Q HTML、packet/hash/locator；human review 仍 draft；在本 RFC 中怎样复用：作为 HTML 证据最小实验，不重新发明存储结构
- **数据资产架构边界** — 实际来源：[#108](https://github.com/liuh886/ccus-policy-hub/pull/108)、[消费契约 #109](https://github.com/liuh886/ccus-policy-hub/pull/109)；当前状态：已合并 main；在本 RFC 中怎样复用：遵守权威，不把规范讨论误当已实现

注意：#111 的“30/36/44 等”数量只代表某次归档审计，**不是法律原文核验覆盖率**。后续每次引用计数需区分政策数、文书数、版次数、经审锚点数。

## 1. 从用户视角倒推：怎样才叫「Agent 可以引用」？

外部 Agent 在分析某个 CCUS 政策时，真正需要的不是一串 Google Drive 文件名，而是一个**证据凭条（citation receipt）**，可以检查：

1. 该记录关联哪个已知政策 ID 或报告？关联是否人工确认？
2. 原始材料是什么（立法原文、官方项目解释、机构分析报告）？谁发表？
3. 精确哪一版？公布日期、生效日期、覆盖截止、抓取日期是否分开？
4. 它支持**哪一句话或哪一个表格数据**？页码、条款、原始短引文是否稳定？
5. 文档身份、定位、主张支持关系分别有无审核？审核的是**什么范围**？
6. 是否允许获取原始字节？第三方能否验证 SHA-256，还是只能核查官方来源链接？
7. 来源改版、引用位置改变或审核失效时，是否明确拒绝“自动沿用”？
8. Agent 如何在不连接私有 Drive、不读 SQLite、不调用本站 LLM 的条件下完成发现与引用？

这八项是我们的**可测试数据服务**，不是 Agent 生成正确答案的测试。

### 三种不等价的能力

- **Discoverable / 可发现**：用户/Agent 知道源文件存在和出处；
- **Citable / 可引用**：用户/Agent 能指明特定版本和具体定位，并清楚其审核强度；
- **Independently verifiable / 可独立复核**：使用者有合法路径实际获取当时的原始版本/内容并重做定位与哈希验证。

如果官方服务器已变更且原件不允许再分发，第二种有时能成立、第三种可能不成立。API 必须显式区分，不能把 URL、私有 Drive ID、哈希当成开放字节下载承诺。

## 2. 最短闭环：五步、三个权威、零个新后台

```text
[发行方：官方法规 / GCCSI 报告 / ESG30 论文]
           │ ① 发现 + 采集原件（#107）
           ▼
[私有 Drive：raw bytes + SHA + 运行审计 + 候选链接]
           │ ② 文书身份/版次/许可证人工核实
           ▼
[Git：已批准的证据 packet + 可合法公开的固定原文字节]
           │ ③ 从原文提取段落/页码/表图 + 定位与引文复核
           ▼
[policy ID / report reference ↔ source-version ↔ anchor]
           │ ④ 只读 join 已接受的 SQLite facts + packet
           ▼
[#103 manifest/schema/bundle + #104 source_evidence 静态发布]
           │ ⑤ 外部 Agent：resolve → validate → cite / explicit gap
           ▼
[引用凭条 + 可读来源卡片；不调用本站问答 Agent]
```

**三个权威彼此不冲突：**外部发行方是法律/报告的事实依据；**SQLite** 是 CCUS Policy Hub 已接受的结构化政策/设施事实的唯一修改入口；**Git 证据 packet** 是不可变原文版本、源位置及受审证据记录的唯一维护入口（不拥有或重写政策事实）。Drive 仅是采集与私有存档运行区；static JSON、Markdown、Astro 页面是确定性投影。ESG30 正文继续以论文上游仓库为唯一权威。

**明确排除的架构**：不从 Drive CSV 自动改写 policies.url，不把整份 PDF 一股脑塞进 SQLite BLOB，不建第二个事实库、无后台 API、无向量库和问答 Agent。只有实测证明“公开静态索引不满足引用发现”后，再研究检索增强。

## 3. 到底写什么数据：先扩展 #104 packet，不先造表

建议先用**一个受审 JSON packet**定义来源版本及锚点。现在 #104 的 packet 已含 document_id、policy_id、edition、raw_sha256、normalized_sha256、extractor_version、review、anchors。先沿用这些字段及静态生成器，测试缺失项，仅在有真实样例时增加：

- **document identity** — 语义及维护者：人工确认的文书标识、发行方、种类、官方原始 URL；为什么需要：报告/政策记录可能映射多份文书、同一文书被多政策引用；拒绝的简化：以文件名/政策标题模糊匹配为权威
- **source version** — 语义及维护者：edition + 官方版本标记 + raw SHA + covered-through；为什么需要：版本、抓取、公布、生效是不同时间；拒绝的简化：raw SHA 或下载时间直接表示法条现行
- **access and rights** — 语义及维护者：public_original / publisher_only / restricted / unknown；为什么需要：数据能公开引用≠原件可再分发；拒绝的简化：把 Drive 私有 URL 发给 Agent
- **locator** — 语义及维护者：html_text_quote / statute_section / pdf_page_quote / pdf_table（按真实格式）；为什么需要：提供原文可复核位置；拒绝的简化：HTML UTF-16 offset 直接套到 PDF
- **review scope** — 语义及维护者：identity / version / locator / support（分别可 pending/reviewed）；为什么需要：防止来源 ID 已审即自动晋级具体断言；拒绝的简化：只有一个全局 verified 布尔值
- **relationship** — 语义及维护者：policy_id + source_version_id + role / report_id + source_version_id；为什么需要：一对多、多对一，区分法律原文、法规释义、报告观点；拒绝的简化：同国家或同关键词即可关联
- **claim support** — 语义及维护者：可选，特定已发表的事实/论断 + 审核过的 source anchor；为什么需要：Agent 引用的对象是具体主张，不能由文档存在推导；拒绝的简化：把整篇报告/原文自动视为对全部政策结论的支持

**第一次实际实现的最小数据包**仍然是“一个 source document 版本 + 一处定位 + 一个已知 policy_id + 公开 schema/index”，不需要把全部对象一次造出来。尤其“claim”不单独创建新事实表；既有已发表的 SQLite 分析文本先保留当前 record_summary 等级。只有事实文本与 anchor 被**人工逐项关联**后才提高具体引用的证据等级。

### 可消费数据的例子（示意，不是已发布 Schema）

以下数值用 #104 真实的 2024 历史 packet，但**字段结构只是 RFC 提案**；所有审核仍为 pending，不能从该例认定 2026 年法律现状。

```json
{
  "policy_id": "us-45q-ira",
  "source": {
    "document_id": "us-45q-usc-2024",
    "kind": "legal_primary",
    "source_url": "https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapA-partIV-subpartD-sec45Q.htm",
    "edition": "2024",
    "raw_sha256": "1a5f12bac2314d5cad5bd99495ddf5dd9502d46bcbaf184841865d20f4fc2200",
    "source_current_through": "2025-01-06",
    "anchor": {
      "id": "qualified-facility",
      "locator": "26 USC 45Q(d), 2024 edition"
    }
  },
  "review": {
    "document_identity": "pending",
    "anchor": "pending",
    "claim_support": "not_reviewed",
    "current_law": "unknown"
  },
  "access": {
    "raw_publicly_available": "unknown",
    "redistribution_permission": "unknown"
  },
  "capabilities": {
    "can_cite_as_reviewed_clause": false,
    "can_claim_current_law": false
  }
}
```

示意字段 **raw_publicly_available** 及 **redistribution_permission** 待真实核验；即使 #104 的 Git 历史 HTML 可供当前候选消费者读取，也不意味着所有其他发行方的 PDF 可公开复制。样例从现有 packet 导出，不从两个地方编辑。

## 4. 导入不是审核：状态机和“失效”的精确定义

建议对每个文书版本维持彼此独立的维度，避免一个万能 confidence score：

- **acquisition** — 可接受状态：missing / archived / inaccessible；谁改变它：#107 的确定性采集日志
- **identity_review** — 可接受状态：pending / reviewed / rejected；谁改变它：人工核对文书标题、文号、发行方与政策关系
- **version_review** — 可接受状态：pending / reviewed / historical / unknown；谁改变它：人工确认版次、来源覆盖与法域；historical 不是“差”
- **locator_review** — 可接受状态：pending / reviewed / invalidated；谁改变它：原文段落/页码短引文与提取 hash 校验
- **claim_support_review** — 可接受状态：not_reviewed / reviewed / rejected；谁改变它：人工确认具体主张与具体原文的支持关系
- **public_access** — 可接受状态：public_raw / public_metadata_only / restricted / unknown；谁改变它：许可/访问审核，不随采集成功自动变化

“来源可引用”应是**派生判断**，不得由导入脚本写入一个可被误改写的 review 字段：

- **readable source reference**：有经过文书身份确认的官方 URL + 明确版次、出处和权限语义；
- **reviewed locator citation**：同一不可变 source version 的正文引用经复核且内容/抽取器未变化；
- **reviewed claim support**：某条具体事实与 locator 的支持关系另经复核；
- **current legal applicability**：不由上述任一项自动推出，始终需单独的法律时效/解释审核。

**失效规则**：同一 URL 响应新字节或新的 edition → 创建**新版本**，旧版本保持历史可追溯，不能沿袭旧版审核；仅 URL 搬迁而 raw SHA 相同 → 可增别名而不改变旧版；抽取器版本/规范化正文哈希改变 → 所依赖的 locator 审核失效；政策摘要文本改变 → 所关联的具体 claim support 需要再检查；许可变更 → 阻止/调整公开分发，但不抹去历史来源元数据。

## 5. HTML、PDF、报告三类具体转换

### 5.1 法规 HTML — 先复用 #104

- 输入：Git 受版本控制的 govinfo 2024 45Q 原文字节与 packet.json。
- 输出：已有 source_document JSON / normalized text / locator、hash、Schema + manifest link，适用时带单一 policy_id。
- 人审：校对 26 USC §45Q(d) 是否完整、是否与实际版次匹配。审核对象仅是**2024 历史文本与定位**，不自动审核现行法。
- 负例：200 错误页、抽取规则变化、raw hash 不同、重名锚点、审核尚 pending 时误称 reviewed。
- 停止：通过一个第三方独立消费者的读/校验/引用路径；不抽取整部法典。

### 5.2 跨法域法规 PDF / HTML — 验证可复用性

- 优先样本：英国 Energy Act 2023 正确的 **c.52** 及官方原始制定文本；或欧盟 Directive 2009/31/EC 的原始/整合版。正式下载、版次与条款审核前一律 pending。
- PDF locator 使用文件物理页（0-based page_index）、可见页码 page_label、准确引文、条款编号；检查 PDF 页码与印刷页码不一致的情况。源文件 PDF 哈希不等于抽取后文本哈希。
- 同一政策涉及多个法律/实施细则时，packet 独立保留文书身份和版次，静态索引按 policy_id 生成多来源关系；不得取第一份命中文件作为唯一原文。
- 停止：不为这一步设计通用多国家法规解析平台。确定两个不同官方发行格式确实需要什么提取差异。

### 5.3 GCCSI / 行业 PDF — 二次研究证据，非法律原文

- 样本候选：GCCSI《CCS Progress in China》（具体 PDF 版次、许可与归档实例待核实）。
- 元数据：报告标题/机构/作者/出版年月/版本/来源 URL + 文件原始 SHA、获取日期、语言与分发权限。
- 选**一处**真正可复核的报告文本主张或表格数字：记录 PDF 物理页、显示页码、表号或图号、数值及单位/年份/口径、原始短引文或表头/脚注。
- 报告句子仅可表达为“GCCSI 在某版本报告中报告/估计……”；即便它提及政策，也**不得**冒充“原始法律条款证明此事”。
- 未能确认许可时公开 report 引用 metadata + publisher URL + 寻址线索，不公开全文、批量片段或未经许可的 PDF；其公开原文可达性显示 restricted/unknown。
- 停止：同一数据契约能表达 secondary-report citation；不把图表当无需校对的纯文本段落。

### 5.4 ESG30 上游报告

- 正文和 PDF 版本的内容权威仍在 2601_ESG30 上游提交/版本；CCUS Policy Hub 的同步页面不产生新的报告原始版本。
- 引用报告时写明上游 commit/稿件版本与本地发布投影；论文里的法律引用如需上升为 primary evidence，必须独立定位其官方原文，不能“论文引文转引文”自动升级。

## 6. 静态发布到底如何组织：**不新增独立 API**

第一版建议用 #103/#104 已存在的 manifest / evidence 索引、schema、发布指纹、只读 CLI / HTTP 消费者，**不是**另建 /api/search：

```text
GET /ccus-policy-hub/data/manifest.json
  -> datasets.context / datasets.source_evidence (仅在 #103/#104 已合并时)
  -> schemas.context / schemas.source_evidence
  -> context/policies/{policy_id}.{lang}.json
  -> evidence/index.json
  -> evidence/source_document/{document_id}.json
  -> approved source bytes (where lawfully public) OR publisher URL + restricted flag
```

这是**逻辑路径说明**；最终准确文件名和 relative URL 由 #103/#104 当前代码和 manifest 生成，RFC **不得另行规定一套不兼容的新 URL**。

**发布器只做四件事**：

1. 对已存在的 SQLite policy ID 与经审核的 Git packet 做只读 join；找不到对应 policy ID 报错，不能猜；
2. 按 Schema 生成 source index / record / context references、明确类型、版本、gaps；未批准候选仍是候选，不能列为 reviewed；
3. 对每个公开产物计算 byte hash / source Git revision，产出已有 release metadata；不得把私有 Drive ID、秘密或受限原文字节混入产物；
4. 在真实 dist 验证：manifest → index → schema → record → anchor；链接相对 base path 正确；hash 和 review 等级准确。

**消费者行为**：外部 Agent 拿到公开 JSON 后，可引用来源凭条中同一 document/version/anchor 的 locator，保留 support 类型、review 状态和时效警告。Agent 的模型是否回答正确不由本仓库做产品验收。

### 允许发布什么？

- **仅有政策摘要** — public static 可以给出：结构化摘要、原 URL、source gaps、record_summary；不应声称：“经核验法律条款”
- **只有 Drive 原文归档** — public static 可以给出：允许公开的元数据/出处、acquisition 状态；不应声称：“公开可获取原文字节 / 文书已审”
- **已核验身份/版本，无锚点** — public static 可以给出：明确文书及版本、许可、来源 URL；不应声称：“已复核具体条款与政策结论”
- **已核验历史原文及 locator** — public static 可以给出：带版本、限定审核范围的可引用位置与历史警告；不应声称：“现行法律仍适用”
- **GCCSI PDF 统计/观点已核验** — public static 可以给出：具页码、报表口径的 secondary research citation；不应声称：“一手法规依据”
- **有权限限制的原文** — public static 可以给出：元数据、公开发行方 URL、rights/status/缺口；不应声称：把私有 Drive 链接当开放 CDN

## 7. 真实用户使用路径（不需要本站聊天）

**使用场景 A：外部 Agent 研究美国 45Q 如何定义某种设施。**

1. GET manifest，校验 release SHA / context / source evidence 的 Schema；
2. 按 policy ID 取 context bundle；读取 policy 摘要和可用的 source reference；
3. 取 source evidence，发现 2024 年版、§45Q(d) 引文、raw hash 和 anchor；
4. 如果 locator 尚为 draft → 输出“2024 年历史材料有该条款候选，但未人工复核，不能作为已核验证据”；如果真的通过审核，方可显示 reviewed locator；
5. 不将 2024 edition 当作 2026 current law，也不推断某项目已具备抵免资格。

**使用场景 B：外部 Agent 研究“中国 CCS 项目统计”报告。**

1. 在报告目录按报告标题、机构、版本发现 GCCSI 官方出版物；
2. 读取 approved secondary source record，精确到一处 PDF 页/图表/统计期/单位；
3. 输出“GCCSI X 年版、PDF p.N 的某表报告了该统计，见出版社原文”；禁止自动声称数字是法规规定或当前统计；
4. PDF 无分发权时用户通过官方 URL 自行访问，Agent 得到可公开的引用 metadata，不取得私有 Drive 凭证。

**最值得优先实现的 UI**（后续另开产品 PR）：一个简洁的来源证据卡片，展示标题/发布者、文书类型、版次、精确定位、审核强度、覆盖时间、原文访问状态。这个小卡片可同时服务人工阅读者和 Agent 的结构化 citation，优先于引入聊天界面。

## 8. 研究必须检验的五个设计分歧

- **Git 证据 packet vs SQLite 新来源表** — 默认建议：Git packet 是来源/版次/定位维护权威，SQLite 事实照旧；可能推翻它的实测证据：多文档审核维护实测发现一致性、查询或并发更新不可控
- **静态索引 vs 向量/RAG** — 默认建议：静态 manifest + 按政策/报告 ID 读取优先；外部 Agent 自己检索；可能推翻它的实测证据：真实消费者无法按已知 ID/目录找到相关材料且关键词检索也不够
- **PDF 通用分块 vs 页/表定位** — 默认建议：page + quote/table number，format-specific parser；可能推翻它的实测证据：真实 PDF 样本证明必须更细的布局结构才能可靠定位
- **私有 Drive 原件 vs 公共备份** — 默认建议：Drive 私有保存；可公有分发的受审原件再存 Git；可能推翻它的实测证据：权利许可、体积、检索效率等明确不同需求
- **自动抽取 + 审核 vs 自动 promoted verified** — 默认建议：解析器只建议候选；审核是明确人工决定；可能推翻它的实测证据：不接受用概率置信度代替证据身份/法律解释审查

如有不同意见，应在 PR 讨论回复中**点名争议编号或字段**，说明为什么它不能满足真实消费者需求，并将反例更新到 RFC，而不是扩建新的方案体系。

## 9. 分阶段实验（实施顺序由唯一 ROADMAP 维护）

**E0 / Contract alignment**：用 #103/#104 当前实际 manifest/index/schema 核对上述概念，产生字段 diff、对应 producer / consumer 文件位置。发现不一致，优先减少本 RFC 的新字段，不复制已有计算。

**E1 / HTML vertical slice**：复用 45Q 历史原文，独立消费者在本地 public 和真实发布 dist 上读取 source/anchor/警告。人审未完成时依旧可验证 draft 行为。验收覆盖 hash/anchor/extractor/version 负例。

**E2 / PDF secondary source**：取一份真实的 GCCSI PDF，保留官方原件/版次/许可，选一处页或表做保守抽取和人工核对；测试“同样能引用、但证据类型只能是 secondary_report”。

**E3 / 法域扩展与多文件**：对一个欧盟/英国政策定位完整、明确版本的正式法规；检验一个政策对应多份文书、旧版和新版并存、官方链接失效/新地址及历史原文可核验。

**E4 / Consumer contract**：从模拟第三方进程使用 public manifest + Schema + source_evidence，不访问私有 Drive/SQLite，不调用本站模型。给定 policy/report ID，输出 source/version/locator/review/currentness/access/gaps 全字段的可机读 citation receipt。失败时返回明确错误，而非成功空载荷。

### 可测的最低验收门禁

- [ ] 从 #107 实际 Drive 原文/审计可把**一份**经合法核验的 source-version packet 审批进入 Git；审批路径不通过 SQLite 隐式覆盖。
- [ ] PDF/HTML 两种格式都可定位精确引用；报告 source 的 type 不被误判为法规直接证据。
- [ ] 一个未经人工核验的来源、一个历史版、一个 restricted 原件，均不会被声明为 current verified clause。
- [ ] 新文书版次、新 raw hash 或新的提取器造成相应审核显式失效；旧版引用保持历史可查。
- [ ] 独立消费者通过真实 dist 下正确 manifest URL 和 Schema 成功读取所需数据；缺失文件、损坏哈希、断开的 source_ref 失败可见。
- [ ] public 产物没有私有 Drive ID、登录 token 或无权公开的原件全文。
- [ ] 证明新表/检索服务确属必要前不加；项目仍不实现站内 Agent 问答。

## 10. 持续讨论与决策日志

**记录规则**：PR Conversation 是主讨论记录；本节仅保存可归纳的**结论与其证据**，保留争论和被否决方案的链接。状态必须是 proposed / accepted / rejected / superseded，不能仅因提交文档便写 accepted。每次关键修改应追加日期、问题、备选方案、决定依据、具体变更 SHA、待验证反例；旧决定如果失效，只标 superseded，不悄悄改写历史。一个 PR 讨论到达真实实验验证、被用户确认的最小实现方向后，才将实施任务回填 docs/ROADMAP.md 并建立代码 PR。

- **D-001** — 问题：引用资产的维护权威；初始立场：原文/版次/locator 属 Git 证据 packet，已接受结构化事实仍是 SQLite；状态：proposed；所需证据：3 份真实来源的完整生产/消费回路
- **D-002** — 问题：公开 Agent 能拿到什么；初始立场：可读元数据 + 审核强度 + 版本 + locator；原文字节取决于许可；状态：proposed；所需证据：一份可公有、一份 restricted PDF 样例
- **D-003** — 问题：政策/文书关系怎样表达；初始立场：版本化 source 与现有 policy ID 的经审核显式关联；多对多，投影生成索引；状态：proposed；所需证据：两份文书服务同政策 / 一份文书对应两政策
- **D-004** — 问题：Citation 精度；初始立场：HTML 用原句/定位，PDF 用物理页 + 短引文/表号；不得只有 document URL；状态：proposed；所需证据：PDF 与 HTML 的独立消费测试
- **D-005** — 问题：是否要全文索引/向量检索；初始立场：不纳入本轮 P0/P1；先测试按 ID/目录取证；需求不足不加；状态：proposed；所需证据：实际外部 Agent 消费任务的检索失败日志
- **D-006** — 问题：Muse 分享页究竟有什么值得复用；初始立场：用户提供链接，**尚未可读取内容**，具体设计待验证；状态：open；所需证据：可见页面内容或来源明确的截图
- **D-007** — 问题：“审核通过”审核到哪一级；初始立场：文书身份、版次、定位、具体主张支持分别审核；状态：proposed；所需证据：一条 draft locator 与已审 locator 的反例演示

### 2026-10-30 / Round 0 — 初版问题定义

- **用户提出**：此前 #108 已给出架构判断，但“受治理的证据记录 + SQLite → 静态 JSON/Schema/Manifest”的具体做法仍不清楚；希望参照 Muse 页面开启逐轮论证，并**持续记录在新 PR**。
- **已核实代码基线**：main 已合并 #105/#108/#109/#110；#103/#104 尚为功能分支；#107 采集、#111 只读审计均为未合入的候选。#104 的现成 packet 真正具备 raw/normalized sha、extractor、anchor、draft review，因此第一轮不设计第二套来源系统。
- **本轮建议**：先完成 **citation receipt 的版本/定位/审查/权限含义**，再实现一份 HTML + 一份 PDF 的最小端到端数据路径；条件卡、RAG、问答和图谱不属于本站首个闭环。
- **没有完成**：Muse 具体页面内容审查；三份真实原文的身份/许可审核；PDF extractor 的跨版定位测试；线上消费发布。不会将这些标记为 shipped。

### 需要下一轮讨论的核心问题

1. **主产品形态**：你希望外部 Agent 首先按已知政策 ID 精准引用，还是需要像文献检索工具那样按自然语言从所有报告中发现具体数据段落？这两种需求会改变是否必须做全文检索，但不改变证据审核基础。
2. **报告引用粒度**：首个报告目标是“报告级目录 + 页码 + 原句”，还是“将表格统计作为可机器运算的数据点”？第二种需要多一层字段/单位/口径的人工核对。
3. **公开权限**：CCUS Policy Hub 希望只公开引文卡片/元数据，还是对版权允许的文件公开重现原始 PDF/HTML？需要逐份确认许可。

以上问题记录为**待决策**，不妨碍 E0/E1 的静态契约检查；本 PR 不自称已经获得用户批准的完整技术决定。

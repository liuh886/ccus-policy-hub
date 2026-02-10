<!-- File: governance/field_mapping_sqlite.md -->
# JSON → SQLite 字段映射表（Policy + Facility + i18n_dictionary）

> 目的：给 Agent 写 importer / standardizer / exporter / audit 用的“唯一对照表”。

---

## A) Policy（policy_database.json）核心映射（摘要）

> 详细字段建议沿用你现有 mapping；此处只强调与 i18n 强相关的字段与约束。

| JSON Path | SQLite | Notes / Rules |
|---|---|---|
| $.policies[].country | policies.country | 必须落库为 canonical English（Enum Sovereignty）；由 dict_country_alias 归一 |
| $.policies[].category | policies.category | 必须是英文枚举；UI 文案来自 ui_category |
| $.policies[].analysis.<axis> | policy_analysis | axis（incentive/statutory/market/strategic/mrv）UI 文案来自 ui_dimension |
| $.policies[].en.title/description/scope/tags | policy_i18n(lang='en') | narrative >= 200 的门禁仍有效 |
| $.policies[].zh.title/description/scope/tags | policy_i18n(lang='zh') | zh 非强制，但影响 Symmetry Score |

---

## B) Facility（facility_database.json）核心映射（摘要）

| JSON Path | SQLite | Notes / Rules |
|---|---|---|
| $.facilities[].country | facilities.country | canonical English；由 dict_country_alias 归一 |
| $.facilities[].status | facilities.status | 必须为英文枚举；UI 文案来自 ui_status |
| $.facilities[].capacity | facilities.capacity | MAX(announced, estimated)；范围字符串取最大值 |
| $.facilities[].en.sector/type/fateOfCarbon | facility_i18n(lang='en') | 值必须可被 dict_term_alias → dict_term 归一（否则 unmapped） |
| $.facilities[].zh.sector/type/fateOfCarbon | facility_i18n(lang='zh') | **建议不再人工写**：由导出阶段根据 dict_term.zh 自动生成（确保一致） |

---

## C) i18n_dictionary（src/data/i18n_dictionary.json）→ SQLite（SSOT）

> 现有结构包含：countries、sectors、types、fates、ui.categories、ui.dimensions、ui.status。

### C1. countries（国家归一：alias → canonical）
| JSON Path | SQLite | Example | Rule |
|---|---|---|---|
| $.countries.<alias> = <canonical> | dict_country_alias(alias, canonical) | "USA" → "United States" | 业务标准化必须用此表 |

### C2. sectors / types / fates（术语：alias → canonical + zh）
> JSON 当前是 `key -> zh`（其中 key 可能是 canonical 或 alias，如 "DAC"）。

**推荐 SQLite 结构：**
- dict_term(domain, canonical, zh)
- dict_term_alias(domain, alias, canonical)

| JSON Path | SQLite 写入规则 | Example |
|---|---|---|
| $.sectors.<key> = <zh> | 先 upsert dict_term(domain='sector', canonical=<key>, zh=<zh>)；再 upsert dict_term_alias(domain='sector', alias=<key>, canonical=<key>) | "Direct air capture"→"空气直接捕集 (DAC)"；"DAC"→同 zh |
| $.types.<key> = <zh> | domain='type' 同上 | "Full chain"→"全产业链" |
| $.fates.<key> = <zh> | domain='fate' 同上 | "Dedicated storage"→"永久封存" |

**重复 zh 组处理（必要）：**
- 如果同一 domain 出现多条不同 canonical 但 zh 相同（如 "Direct air capture" 与 "DAC"），必须生成报告：
  - `governance/reports/dict_duplicate_zh_groups.md`
- 后续通过“字典合并流程”把短别名指向语义更完整的 canonical（写入 dict_term_alias）

### C3. ui.categories（政策类别 UI 文案）
| JSON Path | SQLite | Example |
|---|---|---|
| $.ui.categories.<CategoryKey>.zh | ui_category(key, zh, en) | "Incentive" → zh:"经济激励" |
| $.ui.categories.<CategoryKey>.en | ui_category(key, zh, en) | "Incentive" → en:"Economic Incentive" |

### C4. ui.dimensions（FSRTM 维度 UI 文案）
| JSON Path | SQLite | Example |
|---|---|---|
| $.ui.dimensions.<axis>.label.zh | ui_dimension(key, label_zh, label_en, desc_zh, desc_en) | "mrv".label.zh → "技术核证" |
| $.ui.dimensions.<axis>.label.en | ui_dimension(...) | "mrv".label.en → "Technical" |
| $.ui.dimensions.<axis>.desc.zh | ui_dimension(...) | "mrv".desc.zh → "监测、报告与核查标准..." |
| $.ui.dimensions.<axis>.desc.en | ui_dimension(...) | "mrv".desc.en → "Monitoring, Reporting, and Verification..." |

### C5. ui.status（设施状态 UI 文案）
| JSON Path | SQLite | Example |
|---|---|---|
| $.ui.status.<StatusKey>.zh | ui_status(key, zh, en) | "Operational" → zh:"运行中" |
| $.ui.status.<StatusKey>.en | ui_status(key, zh, en) | "Operational" → en:"Operational" |

---

## D) 导出策略（SQLite SSOT → i18n_dictionary.json）

- 导出来源：仅 SQLite（dict_* / ui_* 表）
- 导出路径：`src/data/i18n_dictionary.json`
- 导出规则：稳定排序（deterministic），并把 JSON 标注为 generated（禁止手改）
- 标准化/审计：只能读取 SQLite 字典；JSON 仅为兼容产物

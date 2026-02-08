# CCUS Policy Hub 治理规范 (V5.2)

本设施的更新与维护，可以做增量更新，但不能随意删除内容或使用占位符替代，除非得到用户同意。

## 0. 治理层级与效力 (Hierarchy of Authority)

本项目的治理体系由以下四层构成，效力由高到低排列：

1.  **宪法 (`0_GOVERNANCE.md`)**：最高准则。定义底线、红线与枚举真理。冲突时以此为准。
2.  **蓝图 (`1_project_proposal.md`)**：业务定义。负责分类字典、评价模型与设计愿景。
3.  **任务系统 (`2_todolist.md`)**：动态状态。负责追踪治理缺口与当前操作优先级。
4.  **执行手册 (`SKILL_MASTER.md`)**：操作指令。将上述层级转化为人机可执行 SOP。

---

## 1. 数据资产标准 (Data Standards)

### 1.1 核心字段与 Schema 契约 (Schema Alignment)

所有数据变更必须严格对齐 `src/content/config.ts` 中的 Zod 定义。违背契约将导致构建失败。

#### **1.1.1 政策数据：四维切片模型 (Four-Dimensional Slicing Model)**

所有政策录入必须完成对原文的“全方位切片”，转化为以下四个结构化维度：

**A. 身份与属性切片 (Identity & Metadata)**

- **`id`**: 全局唯一 ID（Basename 对齐，如 `us-45q-ira`）。
- **`title`**: 政策官方全称。
- **`year`**: 发布年份（1900-2100）。
- **`category`**: 核心分类（`Incentive`, `Regulatory`, `Market`, `Strategic`, `Technical`）。
- **`status`**: 生命周期状态（`Active`, `Planned`, `Under development`, `Upcoming`, `Inactive`, `Superseded`）。
- **`reviewStatus`**: 审核状态（`draft`, `verified`）。
- **`description`**: **叙事核心 (Narrative Core)**。必须包含核心条款、背景及具体目标的实质性描述（200 字以上），支持 Markdown 格式。
- **`legalWeight`**: 法律效力等级（`Primary Legislation`, `Administrative Regulation`, `Departmental Rules`, `Technical Standard`, `Strategic Guidance`, `Guideline/Policy`）。
- **`scope`**: 管辖范围（`International`, `National`, `Sub-national`, `Regional`）。
- **`sectors`**: 覆盖行业列表（`Power`, `Industry`, `Hydrogen`, `DAC`, `Cement`, `Steel`）。

**B. FSRTM 效能切片 (Evaluative Intensity)**

- **物理结构**：对应 JSON 中的 `analysis` 对象，包含 5 个轴向：`incentive`, `statutory`, `market`, `strategic`, `mrv`。
- **内部契约 (Field Contract)**：
  - `score`: **量化值** (0-100)。必须对齐 1.3 节的分值锚点。
  - `label`: **摘要标签**。用极简短语描述核心特征。
  - `evidence`: **逻辑支撑**。必须解释为什么给这个分，严禁废话。
  - `citation`: **溯源证据**。得分 > 40 时必填，必须引用具体条款或 URL。

**C. 实质影响切片 (Strategic Intelligence)**

- **`impactAnalysis`**:
  - `economic`: 描述成本/补贴如何改变项目经济性（如降低 LCOE）。
  - `technical`: 描述对具体捕集/封存技术路径的选择性引导。
  - `environmental`: 描述预估的二氧化碳减排贡献。
- **`implementationDetails`**:
  - `authority`: 牵头执行机构（如 DOE, IRS, MEE）。
  - `mechanism`: 具体的政策执行工具（如 CfD, Tax Credit, 专项基金）。

**D. 谱系与关联切片 (Relational & Lineage)**

- **`evolution`**:
  - `supersedes`: 被该政策取代的旧政策 ID 列表。
  - `supersededBy`: 取代该政策的新政策 ID。
- **`clusters`**: 所属的重大政策丛林（如：Inflation Reduction Act, EU Green Deal）。
- **`relatedFacilities`**: 物理关联的设施 ID 列表。

#### **1.1.2 设施数据：IEA 2025 对齐协议 (IEA-Standard Ingestion Protocol)**

为确保与国际权威数据源的零损耗同步，设施录入必须遵守以下物理契约：

**A. 全量字段映射 (Zero-Loss Mapping)**
必须完整捕获 IEA 原始 Excel 的所有字段，并映射至以下 JSON 结构：

- **身份标识**: `id` (IEA 原始 ID), `name` (Project name), `partners` (合作方数组)。
- **产能量化**: `announcedCapacity` (宣布产能), `estimatedCapacity` (IEA 预估产能)。
- **生命周期**: `announcement`, `fid` (投资决策), `operation` (运营), `suspensionDate` (关停)。
- **技术属性**: `type` (项目类型), `sector` (行业), `fateOfCarbon` (碳去向), `hub` (所属集群)。
- **溯源链接**: `links` (Link 1 至 Link 7 的完整阵列)。

**B. 冲突解决与唯一性 (Conflict Resolution)**

- **ID 碰撞处理**：若 IEA 原始数据出现重复 ID，必须执行 **“后缀唯一化”**（如 `487-2`）。
- **产能一致性**：`capacity` 主字段必须取 `announcedCapacity` 与 `estimatedCapacity` 的 **最大值**。若原始值为范围字符串（如 `0.3-0.8`），必须通过正则提取 **最高数值**。

#### **1.1.3 权属与可追溯性 (Provenance & Accountability)**

每一条政策/设施对象必须包含 `provenance` 字段：

- **`author`**: 初始录入者（Agent ID 或人类用户名）。
- **`reviewer`**: 最后核证人。
- **`lastAuditDate`**: 最后一次治理审计通过的日期。

### 1.2 枚举值唯一性与映射契约 (Enum Sovereignty)

严禁在 JSON 数据库中使用非英文枚举值。

- **1.2.1 审核状态映射**：`draft` (草稿/待分析), `verified` (已核证)。
- **1.2.2 分类映射 (Category-to-Analysis Mapping)**：
  - `Incentive` -> `analysis.incentive`
  - `Regulatory` -> `analysis.statutory`
  - `Market` -> `analysis.market`
  - `Strategic` -> `analysis.strategic`
  - `Technical` -> `analysis.mrv`

### 1.3 FSRTM 5.0 评分与聚合契约 (Scoring Logic)

- **原子性评分**：Master JSON 中物理存储的唯一分值。
- **派生性聚合 (MAX Rule)**：国家治理能力 = `MAX(该国所有活跃政策的对应维度得分)`。禁止回写聚合分至单项政策。

### 1.4 地理空间治理标准 (GIS Sanity)

- **坐标抖动 (Jitter)**：同城项目应用 `±0.02` 度的随机偏移。
- **围栏校验**：
  - 中国：`lat: [18, 54], lng: [73, 135]`
  - 美国：`lat: [24, 49], lng: [-125, -66]`
- **精度声明**：精准点位标记 `precise`，非精准标记 `approximate`。

### 1.5 关联一致性契约 (Graph Integrity)

关联必须满足 **“双向对称性”**。政策引用设施，设施必须回指政策。由 `scripts/fix-relationships.cjs` 强制修复。

### 1.6 数据生命周期与完备度 (Data Lifecycle)

- **治理限制**：完备度低于 60% 的 `draft` 数据在 UI 上必须标记“Processing”，严禁参与聚合排名。

---

## 2. 工程治理流水线 (Governance Pipeline)

### 2.1 JSON 物理主权 (JSON Sovereignty)

- **SSOT**：Master JSON 是唯一真理。任何对 Markdown 的修改在 `pnpm sync` 时都会被 100% 覆盖。
- **透传原则**：同步脚本必须执行 **“零损耗透传 (Full Pass-through)”**，严禁在同步过程中过滤 Master JSON 中的有效字段。

---

## 7. 治理报告协议 (Governance Report Protocol)

自动化审计工具必须输出包含以下元数据的报告，作为 PR 合并的法定依据：

1. **Symmetry Score**: 双语 Basename 对齐率。
2. **Citation Density**: 得分 > 40 的维度的证据覆盖率。
3. **Spatial Compliance**: 坐标通过围栏校验的比例。
4. **Narrative Quality**: 政策描述字数达标率。

---

**最后更新日期**：2026-02-08
**治理版本**：Governance v5.2 (Full Restoration)

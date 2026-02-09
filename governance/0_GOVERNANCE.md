# CCUS Policy Hub 治理规范 (V6.0 - SQLite Sovereignty)

本设施的更新与维护，可以做增量更新，但不能随意删除内容或使用占位符替代，除非得到用户同意。

## Compatibility / Deprecation
- **已废弃介质**：`src/data/policy_database.json`, `src/data/facility_database.json` (不再作为真理源)。
- **已废弃脚本**：`scripts/fix-relationships.cjs`, `scripts/sync.cjs`, `scripts/standardize-facilities.mjs`。
- **替代方案**：统一使用 `pnpm manage db:*` 系列命令。

## 0. 治理层级与效力 (Hierarchy of Authority)

本项目的治理体系由以下四层构成，效力由高到低排列：

1.  **宪法 (`0_GOVERNANCE.md`)**：最高准则。定义底线、红线与枚举真理。冲突时以此为准。
2.  **蓝图 (`1_project_proposal.md`)**：业务定义。负责分类字典、评价模型与设计愿景。
3.  **任务系统 (`2_todolist.md`)**：动态状态。负责追踪治理缺口与当前操作优先级。
4.  **执行手册 (`SKILL_MASTER.md`)**：操作指令。将上述层级转化为人机可执行 SOP。

---

## 1. 数据资产标准 (Data Standards)

### 1.1 核心字段与 Schema 契约 (Schema Alignment)

所有数据变更必须严格对齐 `governance/db/schema.sql` 中的 Relational 定义以及 `src/content/config.ts` 中的 Zod 定义。

#### **1.1.1 政策数据：四维切片模型 (Four-Dimensional Slicing Model)**

所有政策录入必须完成对原文的“全方位切片”，转化为以下四个结构化维度：

**A. 身份与属性切片 (Identity & Metadata)**

- **`id`**: 全局唯一 ID（Basename 对齐，如 `us-45q-ira`）。
- **`title`**: 政策官方全称。
- **`year`**: 发布年份（1900-2100）。
- **`category`**: 核心分类（`Incentive`, `Regulatory`, `Market`, `Strategic`, `Technical`）。
- **`status`**: 生命周期状态（`Active`, `Planned`, `Under development`, `Upcoming`, `Inactive`, `Superseded`）。
- **`reviewStatus`**: 审核状态（`draft`, `verified`）。
- **`description`**: **叙事核心 (Narrative Core)**。必须包含核心条款、背景及具体目标的实质性描述（200 字以上）。
- **`legalWeight`**: 法律效力等级（`Primary Legislation`, `Administrative Regulation`, `Departmental Rules`, `Technical Standard`, `Strategic Guidance`, `Guideline/Policy`）。

**B. FSRTM 效能切片 (Evaluative Intensity)**

- **量化值** (0-100)。对齐 1.3 节的分值锚点。得分 > 40 时必填 `citation`。

**C. 实质影响切片 (Strategic Intelligence)**

- 包含 `economic`, `technical`, `environmental` 影响分析及 `authority`, `mechanism` 执行细节。

**D. 谱系与关联切片 (Relational & Lineage)**

- 包含 `evolution` (supersedes/supersededBy) 关系及 `relatedFacilities` 物理关联。

#### **1.1.2 设施数据：IEA 2025 对齐协议 (IEA-Standard Ingestion Protocol)**

必须完整捕获 IEA 原始 Excel 的所有字段，ID 碰撞处理执行 **“后缀唯一化”**（如 `487-2`）。

### 1.2 枚举值唯一性与映射契约 (Enum Sovereignty)

**严禁在 SQLite SSOT 中出现非 canonical 枚举；所有变体必须先进入 dict_term/dict_alias，再由 standardize 命令归一化。**

### 1.3 FSRTM 评分与聚合契约 (Scoring Logic)

- **原子性评分**：SQLite SSOT 中记录的唯一分值。
- **派生性聚合 (MAX Rule)**：国家治理能力 = `MAX(该国所有活跃政策的对应维度得分)`。

### 1.5 关联一致性契约 (Graph Integrity)

关联必须满足 **“双向对称性”**。政策引用设施，设施必须回指政策。由 `pnpm manage db:fix-relationships` 强制修复。

---

## 2. 工程治理流水线 (Governance Pipeline)

### 2.1 SQLite 物理主权 (SQLite Sovereignty)

- **SSOT**：`governance/db/ccus_master.sqlite` 是唯一真理。
- **Artifacts**：Markdown 文件与 `src/data/i18n_dictionary.json` 均为 generated artifacts（覆盖写）。
- **单向性**：严禁任何“从 artifacts 反向驱动标准化/审计/导入”的代码路径。

### 2.2 P0 安全门禁 (Safety Gates)

为确保 SSOT 的绝对稳定性，生产线必须通过以下门禁：

1.  **审计阻断导出 (Audit-Blocked Exports)**：若 `db:audit:deep` 未通过，禁止执行 `db:export:*`。
2.  **原子写盘 (Atomic Writes)**：数据库写入必须遵循 `tmp -> rename` 策略，防止写入中断导致损坏。
3.  **并发锁 (Concurrency Lock)**：通过 `governance/db/.lock` 机制确保同一时间只有一个治理进程操作 SSOT。

### 2.3 精干架构与自动化 (Lean Architecture & Automation)

- **无人工干预导出 (Zero-Intervention)**：所有前端所需数据（影响力分析、监管矩阵、设施叙事）必须由 `db:export:md` 自动生成。严禁导出后手动修补 Markdown。
- **临时文件治理 (Temp File Management)**：
    *   定期执行 `pnpm manage:db:clean` 清理冗余报告。
    *   `governance/reports/` 仅保留最新的审计日志与心跳文件。
- **工具链收敛**：所有维护逻辑必须集成至 `scripts/manage.mjs`。严禁在 `scripts/` 根目录下存放散乱的临时 JS 脚本（旧脚本必须移至 `archive/`）。

## 3. 前端交互与视觉治理 (UI/UX Governance)

### 3.1 界面冻结契约 (UI Design Freeze)

- **设计终态**：当前（2026-02-09）的前端界面设计、版面布局与交互逻辑已被视为满意状态。
- **重大变更门禁 (User Approval)**：严禁在未获得用户明确同意的情况下执行“重大修改”（包括但不限于：页面版面重构、主题色系大幅调整、核心交互组件替换）。
- **调试准则 (Debug Only)**：允许进行细粒度的 Debug、数据绑定修复与性能优化，前提是不破坏现有的视觉审美与操作习惯。

---

**最后更新日期**：2026-02-10
**治理版本**：Governance v6.2 (Lean Architecture)
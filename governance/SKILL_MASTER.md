# Skill: CCUS Policy Master (v5.1)

本设施的更新与维护，不能脱离 **`0_GOVERNANCE.md` (宪法)** 的指导与约束。可以做增量更新，但不能随意删除内容或使用占位符替代，除非得到用户同意。

## 0. 权限与依据 (Authority)

本 Skill 是对 **`0_GOVERNANCE.md` (宪法)** 在操作层面的全量实现。

- **强制动态参考**：执行本手册前，Agent 必须先读取 `0_GOVERNANCE.md` 中的最新标准。

## 1. 政策录入与切片工作流 (Policy SOP)

### 1.1 调研与提取

Agent 必须按照 **`0_GOVERNANCE.md` 1.1.1 节**定义的模型提取信息。

#### **提取协议 (JSON Template)**

输出结果必须严格遵循以下结构：

```json
{
  "identity": {
    "id": "slug",
    "title": "Full Name",
    "category": "Incentive/Regulatory/Market/Strategic/Technical",
    "status": "Active/...",
    "description": "200+ words substantive narrative...",
    "sectors": ["Sector A", "Sector B"]
  },
  "fsrtm_intensity": {
    "incentive": { "score": 0, "label": "", "evidence": "", "citation": "" },
    "statutory": { "score": 0, "label": "", "evidence": "", "citation": "" },
    "market": { "score": 0, "label": "", "evidence": "", "citation": "" },
    "strategic": { "score": 0, "label": "", "evidence": "", "citation": "" },
    "mrv": { "score": 0, "label": "", "evidence": "", "citation": "" }
  },
  "strategic_intelligence": {
    "impactAnalysis": { "economic": "", "technical": "", "environmental": "" },
    "implementationDetails": { "authority": "", "mechanism": "" }
  },
  "relational_context": {
    "evolution": { "supersedes": [], "clusters": [] },
    "relatedFacilities": []
  }
}
```

## 2. 设施维护生产线 (Facility Production Line)

任何从原始材料（如 IEA Excel）到数据库的转换必须强制按以下阶段执行，严禁跳步：

### 第一阶段：格式转换 (Ingestion)

- **Action**: 将原始 Excel 转换为初版 JSON。
  - **Source**: 读取 `governance/IEA CCUS Projects Database 2025.xlsx`。
  - **Script**: `scripts/master_excel_to_json.py`
  - **Process**: 运行 `scripts/geolocate_facilities.py`。
  - **Execute**: 运行 `scripts/fix-relationships.cjs`。
- **Note**: 此时允许存在非标准国家名和英文行业字段。

### 第二阶段：自动化治理 (Standardization) - [REUSABLE]

- **Script**: `scripts/standardize-facilities.mjs`
- **Command**: `pnpm manage:facilities:standardize`
- **实现功能**:
  1. 自动映射国家名变体（由 `i18n_dictionary.json` 驱动）。
  2. 自动补全 Null Island [0,0] 坐标为国家中心点（自愈）。
  3. 全量汉化行业 (Sector) 与碳去向字段。
  4. 物理剔除 Ghost Fields。

### 第三阶段：深度审计 (Deep Audit) - [REUSABLE]

- **Script**: `scripts/audit-facilities-deep.mjs`
- **Command**: `pnpm manage:facilities:audit`
- **门禁条件**: 必须 100% 通过国家名标准化率、空间合规率（无 [0,0]）以及 95% 以上的 I18n 覆盖率。

### 第四阶段：物理同步 (Sync)

- **Command**: `pnpm sync:all`
- **实现功能**: 将清洗后的 Master JSON 同步至前端 Markdown 内容层。

## 3. 治理工具箱清单 (Toolbox)

| 脚本/工具                          | 治理角色     | 物理状态                                  |
| :--------------------------------- | :----------- | :---------------------------------------- |
| `scripts/manage.mjs`               | 综合管理     | **持久化** (支持 check-links, new-policy) |
| `scripts/governance-heartbeat.mjs` | 健康监视     | **持久化** (生成质量报告)                 |
| `src/data/i18n_dictionary.json`    | 治理真理来源 | **持久化** (所有的标准化依据)             |

## 4. 临时脚本清理协议

- 任何完成特定数据修复任务的一次性脚本（如批量注入、坐标一次性修正），必须在任务完成后立即 **物理删除**。

---

**版本**：v5.2 (2026-02-08)
**地位**：CCUS 情报治理唯一指定执行手册

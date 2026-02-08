# Skill: CCUS Policy Data Manager

本 Skill 专门用于为 `CCUS-Policy-Hub` 数据库添加或更新政策数据。

## 核心原则 (Core Mandates)

1. **双语对称 (Bilingual Parity)**: 任何政策必须同时提供中文版 (`zh/`) 和英文版 (`en/`)。两个文件的 Slug（文件名）必须完全一致。
2. **事实核查 (Fact-check)**: 录入前必须使用 `google_web_search` 核实政策的最新状态、发布年份、主管机构以及关键激励数值。
3. **Schema 严谨性**: YAML Frontmatter 必须完全符合 `src/content/config.ts` 定义。

## 操作流程 (Workflow)

### 1. 调研阶段
使用 `google_web_search` 搜索目标政策。
- 确认官方名称（ZH/EN）。
- 确认发布年份及当前状态（有效/已废止）。
- 提取关键数值（如 45Q 的 $85/t）。

### 2. 准备文件
- **中文路径**: `src/content/policies/zh/<slug>.md`
- **英文路径**: `src/content/policies/en/<slug>.md`

### 3. YAML 规范 (Mandatory Fields)
```yaml
---
title: "政策全称"
country: "中国/USA/欧盟/International..."
year: 2024
status: "有效/计划中"
category: "经济激励/法律监管/市场机制/战略引导"
tags: ["标签1", "标签2"]
incentive_type: "Grants/Tax Credit/CfD..."
incentive_value: "具体数值说明"
mrv_requirement: "高/中/低"
sectors: ["Industrial", "Power", "Hydrogen", "Oil and Gas"]
description: "核心摘要（中/英对应）"
url: "官方链接"
source: "发布机构"
pubDate: 2024-01-01
---
```

### 4. 验证与构建
- 运行 `pnpm run build` 确认无 Schema 校验错误。
- 检查 `Pagefind` 索引是否已更新。

## 禁令 (Restrictions)
- 禁止在没有英文翻译的情况下录入中文政策。
- 禁止随意修改 `slug` 导致关联失效。
- 禁止使用虚假坐标（如果不确定，请标注 `precision: approximate`）。

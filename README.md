# CCUS Policy Hub

全球 CCUS 政策数据库与分析平台。

## 项目简介

构建一个覆盖全球范围且定期更新的"CCUS政策数据库"（CCUS-Policy-Hub），为政府决策者、行业从业者和研究人员提供一站式的CCUS政策信息平台。

## 技术栈

- **Framework**: Astro
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Package Manager**: pnpm

## 开发

```bash
pnpm install
pnpm dev
```

## 管理与自动化

- **创建新政策模板**: `pnpm manage:new zh/your-policy-id`
- **检查外部链接有效性**: `pnpm manage:check`
- **数据入库**: 通过 GitHub Issue 提交，审核后运行 `manage:new` 快速生成。

## 数据交付 (Professional Deliverables)

- **JSON API**: `/api/policies.json`
- **CSV 导出**: `/api/policies.csv` (在搜索页面可见)
- **学术引用**: 每个政策详情页底部均提供标准的 APA 引用格式复选框。
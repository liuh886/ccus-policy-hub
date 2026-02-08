# CCUS 技术栈与编码治理技能

## 1. 编码红线
* **UTF-8 No BOM**: 这是本项目唯一的法定编码。
* **严禁 PowerShell 重定向**: 禁止使用 `>` 或 `Set-Content` 生成文件，因为在 Windows 下这会导致 UTF-16 乱码。必须使用 Node.js `fs.writeFileSync`。

## 2. 工具链规范
* **pnpm**: 唯一的包管理工具。
* **Astro 5.x**: 核心框架，依赖 Content Layer 进行数据加载。
* **Zod**: 唯一的 Schema 校验引擎，所有字段变更必须先在 `src/content/config.ts` 中定义。

## 3. 自动化审计 (Automated Audit)
* 每次提交前建议运行 `node scripts/mega-audit.cjs` 进行全量 Schema 准入检查。

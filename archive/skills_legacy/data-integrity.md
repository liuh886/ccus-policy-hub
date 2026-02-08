# CCUS 数据库完整性治理技能 (V2.0)

## 1. 结构化契约 (The Schema Contract)
* **强制导出逻辑**: 所有从 JSON 到 Markdown 的导出必须经过 `scripts/sync.cjs`。
* **防御性填充 (Safe Fallbacks)**: 
  - 若 `location` 缺失，自动填充 `country`。
  - 若 `type` 缺失，自动填充 `CCUS Project`。
  - 若 `description` 缺失，自动生成基于模板的描述。
  - 确保 Zod Schema 中的 `Required` 字段在 MD 文件的 Frontmatter 中永远存在。

## 2. 导出流程铁律
每次修改数据后，必须**按顺序**执行以下指令：
1. `node scripts/sync.cjs` - 生成 100% 结构化文件。
2. `node scripts/mega-audit.cjs` - 物理扫描所有文件，确保 0 失败。

## 3. 编码红线
* 必须使用 `js-yaml` 的 `dump` 方法生成 YAML，严禁手动拼写 `---` 块，以防缩进或特殊字符导致解析失败。
* 编码强制为 **UTF-8 No BOM**。

## 4. 智力看板自动计算
* 政策页面的“治理体系覆盖效能”表格由同步脚本实时聚合计算，严禁手动修改统计数值。
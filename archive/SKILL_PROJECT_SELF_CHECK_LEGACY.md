# Skill: CCUS-Hub Quality Assurance & Self-Check

本 Skill 用于在 `CCUS-Policy-Hub` 项目进行任何数据录入、功能变更后的全量自检。

## 1. 中英双语一致性自检 (Bilingual Integrity)
- [ ] **对称性检查**：每一个 `src/content/policies/zh/` 下的文件，必须在 `src/content/policies/en/` 下有一个**同名**文件。
- [ ] **Slug 校验**：中英文文件的 Slug（文件名）必须完全一致，否则“查看英文版/查看中文版”跳转逻辑将失效。
- [ ] **导航路由**：检查 `NavBar.astro` 和 `LanguagePicker.astro`。切换语言时必须保留当前路径，严禁跳回首页。
- [ ] **翻译深度**：检查详情页的 Sidebars 和 Badges 是否已完全本地化（如 Mtpa, Capacity, Status）。

## 2. 数据标准化自检 (Data Standardization)
- [ ] **Schema 匹配**：YAML Frontmatter 必须符合 `src/content/config.ts`。
- [ ] **空值处理**：`commencementYear` 必须设置为 `.nullable().optional()` 以防止构建崩溃。
- [ ] **行业标签标准化**：`sectors` 字段必须使用标准词汇（如 "Power", "Industrial", "Hydrogen", "Oil and Gas"），严禁出现拼写错误。
- [ ] **状态词汇对照**：中文使用“运行中/计划中/建设中”，英文对应“Operational/Planned/Under construction”。

## 3. 空间位置与 GIS 严谨性 (Geospatial Sanity)
- [ ] **去中心化检查**：严禁大量点位堆叠在 `[35, 105]` (甘青边界) 或 `[0, 0]` (大西洋)。
- [ ] **精度声明**：对于非精确厂址点位，Markdown 中必须包含 `precision: approximate`。
- [ ] **行政边界校准**：
    - 四川项目点位经度应在 `102-108` 之间，纬度在 `28-32` 之间。
    - 吉林项目点位经度应在 `122-130` 之间。
    - 香港项目坐标应在 `[22.3, 114.1]` 附近。
- [ ] **微聚合检查**：同城/同省项目必须应用 `±0.05` 度的随机抖动，确保在地图上可被独立点击。

## 4. 逻辑关联与搜索引擎 (Logic & Search)
- [ ] **关联逻辑审计**：在设施详情页，检查“适用政策”是否严格符合“同国/国际标准”，而“他国同行业政策”是否被正确归类到“全球标杆参考”栏目。
- [ ] **Pagefind 过滤索引**：检查 `[slug].astro` 模板中是否包含 `data-pagefind-filter` 标签。
- [ ] **构建验证**：必须成功运行 `pnpm run build` 且无任何报错。

## 5. 常见 Trap 清单 (Known Pitfalls)
- **Trap 1**: 录入了中文政策忘了录入英文，导致 404。
- **Trap 2**: 在设施数据中使用了 `lang: zh` 但文件名带了 `-en` 这种不规范命名。
- **Trap 3**: 地图底图加载不出来（需确保 Esri 链路优先级高于 CartoDB）。
- **Trap 4**: 统计看板数值不跳动（检查 `index.astro` 的 `setupFiltering` 脚本是否被 View Transitions 中断）。

---
**提示**：在执行 `git commit` 前，请对照此清单进行地毯式核对。

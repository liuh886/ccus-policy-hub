# HANDOVER — CCUS Policy Hub 维护代理交接

> 交接时间：2026-09-23（报告 v3.5 同步：2026-09-24）｜ 交接分支：`main`
> （HEAD `09262497`，与 origin 同步）
> 工作区干净，仅 `main` 一条本地/远端分支，无开放 PR/Issue。
> **接手前必读**：`agent/ccus-ai-agent/AGENTS.md`（治理契约）→ `SAFETY.md` → 按任务类型读对应文档。

## 1. 项目一句话

CCUS Policy Hub：中英双语静态站（Astro 5 + Tailwind 4），内容来自 SQLite SSOT
（`agent/ccus-ai-agent/db/ccus_master.sqlite`）经治理管线导出为 markdown/public JSON。
**SQLite 是唯一可写权威源；markdown/public JSON 是发布产物，禁止手改。**

## 2. 本轮（2026-09-23 收敛）已完成

### 游离工作线收编

- 拆除悬置 worktree `ccus-q-wt`（分支 `feat/compare-quantile-and-timeline`，0 独有提交，
  6 文件未提交），移植为 4 个原子提交 → **PR #97 已合并** `3e79e9e7`
- **C1 方法论**：治理–部署四象限基准由中位数改为 **75 分位**（`BENCHMARK_QUANTILE=0.75`，
  新增线性插值 `quantile()`）；实测治理 84→90.75、部署 7.8→14.6 Mtpa，协同领先 7→3
- **C2 视觉**：时间线分组重排（左侧色条、虚线连接、紧凑间距）
- 自查修复：删除改 p75 后失效的 `median()` 死代码、修正过度承诺注释、修掉误暂存
  `HANDOVER.md` 的提交

### 开放 PR/Issue 收敛

- **PR #90** heatmap sticky 作用域修复 → 合并 `c9149cf2`
- **PR #80** 判定为已被 main 覆盖（两点 diff 证实）→ 关闭
- **PR #63** 悬置提案 → 关闭并删除分支
- **Issue #69**（schema `z.enum`）：迁移已执行归档、`config.ts` en 已收 enum、
  `categoryMap` 已删、`policy-taxonomy.test.mjs` 守卫在 → **关闭**
- **Issue #55**（政策覆盖复核）：7 项更正均已被 2026-09 数据质量批次吸收 → **关闭**
- **Issue #68**（字重/双分析）：Inter 改**可变字重** `wght@100..900`；新增
  `docs/observability.md` 记录 GA4 与 Cloudflare RUM 分工 → **关闭**

### 新增修复

- **schema 漂移**：`policy_facility_links` 的关系列（`link_type/confidence/…`）由
  `relationship-link-types-2026-09` 迁移加到了 DB，但 `schema.sql` 未同步 → 已补齐
  （`9de5f367`）。**新建库现在与线上 schema 一致。**
- `docs/ROADMAP.md` 刷新：T4 三项（#69、关系模型 Phase 2、内容深度）均已落地；
  仅剩内容深度尾部 41/129 条为编辑性 backlog

### 分支清理

- 删除本地 11 条陈旧分支（已合并/已关闭/临时），远端 25 条陈旧分支
  （全部对应已合并或已关闭 PR）。现仅 `main`。

### 本轮维护续（2026-09-23 复查）

- **ESG30 报告升级 v3.5**（`09262497`）：报告页由 v3.4 同步到 v3.5（37 页，
  2026-09-23，99 篇文献）。产物 `public/reports/2601_ESG30/*` 由守卫
  `.github/workflows/sync-esg30-report.yml` 自动同步（见 §3.1），本地只改元数据：
  文档 slug `esg30-report-3-4` → `esg30-report-3-5`（`src/content/docs/{zh,en}/`
  - `src/components/DocsIndex.astro`）、`scripts/sync-paper-report.mjs` 默认路径/版本号。
- **paper draft 指纹归一化**：`sync-paper-report.mjs` 哈希前统一 CRLF→LF，修复
  Windows 检出与远端 CI 内容相同却指纹不同（本机 `4136...` vs 远端 `fdb1...`）
  导致 pre-push `report:check` 误报。现本机与 CI 一致为 `fdb158965ae4145b`。
- **Windows 退出崩溃修复**：`logic/manage.mjs` 在 sql.js/WASM 使用后调用
  `process.exit()` 会触发 libuv 断言（`UV_HANDLE_CLOSING`，退出码 `0xC0000409`），
  令 `pnpm gen` 及 `db:stats`/`db:export:i18n`/`db:peek` 等命令**假失败**（写入其实
  已完成）。改为设置 `process.exitCode` 后自然退出 → `pnpm gen` 端到端恢复。仅
  Windows 触发，CI（Linux）不受影响。
- **陈旧计数修正**：`src/data/dataset_versions.json` 的 notes 由 `130 policies`
  更正为 `129`（与 DB/README/quality 一致），并随 `pnpm gen` 同步到
  `public/data/dataset-versions.json`。
- `docs/ROADMAP.md`：移除已完成的「Split `manage.mjs`」待办（转入 Done），并把
  analyze-block 计数由 `32 of 130` 更新为 `24 of 129`。
- **内容本地化指标**：`scripts/generate-quality-metrics.mjs` 新增
  `content_localization` 块（扫描 en 政策文件，区分可本地化内容的 CJK 泄漏与
  原生 `source` 原名），随 `quality_metrics.generated.json` / `public/data/quality.json`
  输出；`quality-metrics.test.mjs` 加守卫。实测：24 个含 CJK，其中 9 个为内容泄漏。
- **T2/T4 复核结论**：facilities 页面内嵌 payload 早已瘦身（`src/lib/mapPayload.mjs`，
  8 字段 ~221KB，锁定测试），`@ts-nocheck` 与 `light-editorial-capacity.css` 作用域
  也已就位——HANDOVER 原 T2/T4 条目为陈旧描述，已纠正。
- **修复 en 内容本地化泄漏**：迁移
  `migrations/2026-09/fix-en-content-localization-2026-09.mjs`（21 处，9 条政策），
  翻译混合语片段、中文法条引用与日文汉字；`content_localization.en_files_with_content_cjk`
  由 9 → 0（余 20 条仅 `source` 原名，属设计）。含测试 + manifest 记录。

## 3. 🔴 接手时需要注意的事

1. **有并行自动化在写 git**：本轮任务中途，某进程向 `main` 直推了 `e0370a72`，
   还一度把提交写进我的工作分支。若这不是你预期的行为，**务必排查**是哪个
   进程/计划任务在写仓库（本轮 pre-push 钩子会跑 `sync-paper-report`）。
   **2026-09-23 复查**：已知写入方为 `.github/workflows/sync-esg30-report.yml`
   （`github-actions[bot]`，每 6 小时检测 `liuh886/2601_ESG30` 变更后直推
   `public/reports/2601_ESG30` 与 `.esg30-sync.json`，最近一次 2026-09-23 17:01 UTC
   同步 v3.5 至 `11a289f2`）；`e0370a72` 的作者是 `liuh886`，更像本地手工/自动化提交，
   非该 workflow。
   - **手动同步首选跑 `pnpm report:sync`**：从本机最新 TeX/PDF 生成，避免与 bot
     抢推同一文件；推送前先 `git fetch` 并 rebase，若 bot 已同步同一版本，
     保留 bot 产物、只提交 `docs`/`slug` 等本地元数据改动。
   - **哈希归一化**：`sync-paper-report.mjs` 计算 paper draft 指纹前统一
     CRLF→LF。Windows 检出（CRLF）与远端 CI（LF）内容相同时指纹一致，
     不再误报漂移（本轮修复前本机 `4136...` vs 远端 `fdb1...` 即此原因）。
2. **受保护文件**：`agent/ccus-ai-agent/DESIGN.md` 是用户自己的内容，
   **不要提交、不要回退**。
3. **commitlint 标题 ≤100 字符**（踩过多次）。
4. 本地 Windows + `core.autocrlf=true`：写审计/比较类代码必须做换行归一化。
5. PowerShell 里做字符串替换极易翻车，**优先用 Edit 工具或写 .ps1/.mjs 脚本**。
6. `git add -A` 会带上未跟踪的 `HANDOVER.md`，**提交前用显式路径 add**。
7. 每次提交前跑：`pnpm test` + `pnpm exec astro check` + `pnpm build`。

## 4. 下一步任务（按优先序）

> 注：原 T1「manage.mjs 拆分」已在 2026-09-08 完成（`af5d3667` 拆为
> `logic/commands/*` + `logic/db.mjs`，`3428a554` 补心脏路径测试），本清单已重排。

### T1. i18n 词典三套并行收敛（中）

- 三套：`src/i18n/ui.ts`、~48 处组件内 `isEn ? :` 三元、组件自带 copy 对象
  （`governanceCopy.mjs` 等）。方向：全部收编进共享 copy 模块。
- 注意：`scripts/lib/i18n-translate.mjs`（DB 词典往返）是**数据层**机制，勿混淆。
- `governanceWorkspaceVisuals.mjs` 有模块级可变状态 + innerHTML 拼接，收敛时顺手治理。

### T2. facilities.json 瘦身（中）

- `scripts/generate-public-data.mjs` 生成；地图组件经 `getMapPayload()` 消费页面内嵌
  JSON（`#facility-map-data`）。
- ⚠️ `public/data/facilities.json` 是对外 AI 接口（有 JSON Schema），**只瘦身页面内嵌
  payload**，或走接口版本化。

### T3. 内容深度尾部（编辑性，低）

- `docs/policy-content-depth-report.md`：41/129 待改进（3 high、38 medium），
  critical 已归零。纯编辑排期，无 schema/审批门槛。

### T4. 小尾巴（低优先）

- `FacilityMap.astro`/`CapacityTrend.astro` 的 `@ts-nocheck` 区域 typed 化
- `light-editorial-capacity.css` 全站加载但仅首页用，可作用域收窄
- `home.css` 的 `!important` 残留（Issue #68 P3-2，机会性清理）

## 5. 验证基线（当前全绿命令）

```powershell
pnpm test                    # 192/192
pnpm exec astro check        # 0 errors / 0 warnings / 0 hints (201 files)
pnpm build                   # ~10-17s, 2604 pages
pnpm manage:db:audit:deep    # PASS
pnpm manage:db:audit:policy-consistency  # PASS
```

CI：`ci.yml`（build job 全量 + governed-data job 按改动 scope 触发）；`deploy.yml`
在 main 推送后部署 Pages（含 Cloudflare beacon 注入，需仓库变量
`CLOUDFLARE_WEB_ANALYTICS_TOKEN`）。

## 6. 历史背景（避免重复踩坑）

- 曾有两名 agent 并行做 IEA 刷新，产生重复劳动与悬置 worktree；本轮又发现一条
  悬置 worktree。**开工前先 `git worktree list` + 检查远端分支**。
- 曾有一轮外部 review 指出：stub 删除与调用方清理必须同一原子提交；共享抽取不要
  与使用方改动分离提交；commit message 不要过度承诺。
- 用户偏好：直接、密度高的中文汇报；动手前重大治理变更必须先问。

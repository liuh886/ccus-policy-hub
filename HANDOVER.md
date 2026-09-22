# HANDOVER — CCUS Policy Hub 维护代理交接

> 交接时间：2026-09-23 ｜ 交接分支：`main`（HEAD `3b6f287b`，与 origin 同步）
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

## 3. 🔴 接手时需要注意的事

1. **有并行自动化在写 git**：本轮任务中途，某进程向 `main` 直推了 `e0370a72`，
   还一度把提交写进我的工作分支。若这不是你预期的行为，**务必排查**是哪个
   进程/计划任务在写仓库（本轮 pre-push 钩子会跑 `sync-paper-report`）。
2. **受保护文件**：`agent/ccus-ai-agent/DESIGN.md` 是用户自己的内容，
   **不要提交、不要回退**。
3. **commitlint 标题 ≤100 字符**（踩过多次）。
4. 本地 Windows + `core.autocrlf=true`：写审计/比较类代码必须做换行归一化。
5. PowerShell 里做字符串替换极易翻车，**优先用 Edit 工具或写 .ps1/.mjs 脚本**。
6. `git add -A` 会带上未跟踪的 `HANDOVER.md`，**提交前用显式路径 add**。
7. 每次提交前跑：`pnpm test` + `pnpm exec astro check` + `pnpm build`。

## 4. 下一步任务（按优先序）

### T1. manage.mjs 拆分（大工程，最优先）

- 现状：`agent/ccus-ai-agent/logic/manage.mjs` 仍偏大，混合 SqlJsDatabase 适配器、
  命令路由、20+ 命令实现；`logic/db.mjs` 已抽出（`DB_PATH`/`SCHEMA_PATH`）。
- 目标：`logic/commands/*.mjs`（按 import/export/standardize/audit/geocode 分）。
- **必须同时补测试**（现心脏路径零测试）：`dbExportMd`、`dbImportMdReverse`、
  `dbAuditDeep`。参考 `migrations/2026-07/migrate-policy-lifecycle-2026-07.test.mjs`
  的"从 schema.sql 重建内存库"模式。
- 验证：拆分后 `pnpm manage:db:audit:deep` 必须 PASS +
  `pnpm manage:db:audit:policy-consistency` 后 `git diff --exit-code` 干净。

### T2. i18n 词典三套并行收敛（中）

- 三套：`src/i18n/ui.ts`、~48 处组件内 `isEn ? :` 三元、组件自带 copy 对象
  （`governanceCopy.mjs` 等）。方向：全部收编进共享 copy 模块。
- 注意：`scripts/lib/i18n-translate.mjs`（DB 词典往返）是**数据层**机制，勿混淆。
- `governanceWorkspaceVisuals.mjs` 有模块级可变状态 + innerHTML 拼接，收敛时顺手治理。

### T3. facilities.json 瘦身（中）

- `scripts/generate-public-data.mjs` 生成；地图组件经 `getMapPayload()` 消费页面内嵌
  JSON（`#facility-map-data`）。
- ⚠️ `public/data/facilities.json` 是对外 AI 接口（有 JSON Schema），**只瘦身页面内嵌
  payload**，或走接口版本化。

### T4. 内容深度尾部（编辑性，低）

- `docs/policy-content-depth-report.md`：41/129 待改进（3 high、38 medium），
  critical 已归零。纯编辑排期，无 schema/审批门槛。

### T5. 小尾巴（低优先）

- `FacilityMap.astro`/`CapacityTrend.astro` 的 `@ts-nocheck` 区域 typed 化
- `light-editorial-capacity.css` 全站加载但仅首页用，可作用域收窄
- `home.css` 的 `!important` 残留（Issue #68 P3-2，机会性清理）

## 5. 验证基线（当前全绿命令）

```powershell
pnpm test                    # 190/190
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

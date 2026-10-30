# 资料发现 E0：实际观测与来源样本（2026-10-30）

本轮结论：**静态 HTTP 索引可以由纯 Node 消费；1.4.0 全站英文漏召回在隔离的 1.5.2 对照中消失，但中文与语言选择仍有缺口，暂不接入生产。** 本文是 #112 的实验记录，不是新路线图或已批准的接口。没有修改生产检索、SQLite、采集器或证据审核状态。

## 固定输入与实验边界

- 仓库：RFC 分支 `0b2c77b7`；Pagefind **1.4.0**，Node **24.3.0**，Playwright CLI **0.1.22** / 本机 Edge，无用户登录会话。
- 在该 checkout 上生成现有内容并执行 Astro build，输出隔离在忽略目录；构建记录为 2,560 个生成页面、102.81 秒。目录另含现有公开 HTML，Pagefind `addDirectory.page_count` 为 2,561。两者不是同一个统计口径。
- 冻结的 HTML 路径/字节树 SHA-256：`191cb7d1c8ac49ae6db636f1dfa2a5432b097c49a5dfbca0c9b280625293e762`。先完成构建，再生成两组索引；构建过程中的不完整索引不用于本表。
- 额外输入仅三条**合成记录**：英文历史草稿法条、中文报告目录、受限报告的合法元数据。没有把实际 GCCSI 原文、私有文件 ID 或 PDF 页面放进公开投影。
- 原始日志、实验脚本、浏览器结果与 PDF 渲染保存在本机忽略目录。PDF 页面图像和提取全文不提交。以下代码与输入足以重做核心对照；字节量、耗时是本机观测，不是性能承诺。

| 索引                       | HTML 输入数（API 返回） | 额外合成记录 | 输出文件数 |  输出字节 |  索引耗时 |
| -------------------------- | ----------------------: | -----------: | ---------: | --------: | --------: |
| 现有 HTML baseline         |                   2,561 |            0 |      2,663 | 7,017,789 | 17,812 ms |
| 同一 HTML + custom records |                   2,561 |            3 |      2,671 | 7,019,028 | 19,783 ms |

基线 `pagefind-entry.json` SHA-256：`5e77bb9e69639c08cf79729a03795cfa107819fcf8c3da83a031f2835888483b`；第一次增强索引为 `3a732ada781c134d10fe873700f2ab7dcac6e0f5fe3826c9c9079fb437b3be7d`。后续修正 URL 的索引是单独对照，不冒用这些校验值。

## Node 消费路径与 URL 负例

已安装包 `import('pagefind')` 只导出 `createIndex/close`，它是构建 API；不能据此声称支持运行时搜索。不过**生成的公开 `pagefind.js`** 可以下载为本地 ESM，再显式配置 HTTP `basePath`、站点 `baseUrl` 和语言，查询同一 HTTP 索引。本轮实际完成了 SDK、元数据、WASM、分片与结果页面的 HTTP 读取，不依赖网站私有运行时。

- 未配置地址就从文件导入运行时：相对 `/pagefind/pagefind-entry.json` 在 Node 中解析失败。这不证明 Node 不可用。
- 配置完整 HTTP 地址后：三记录 HTML 对照的 `45Q qualified facility` 命中 1 条，结果链接 HTTP 200；7 次请求、90,266 字节响应体、230 ms，包括 SDK 和结果页。全站对照为 9 次请求、973,730 字节、182 ms，其中结果 HTML 占 746,713 字节；索引及 SDK 响应体为 227,017 字节。均为冷进程、本地 HTTP 单次观测，不含协议开销。
- 初始 custom record URL 写成 `/ccus-policy-hub/research/e0/law/`，运行时又配置 `baseUrl=/ccus-policy-hub/`，结果出现双前缀并实际返回 404。
- 改为站点相对记录 URL `/research/e0/law/` 后，三记录对照结果解析到正确的单前缀地址并返回 200。生产投影必须校验解析后的地址，不能只校验输入 URL。
- Node 原生 ESM 不能直接把任意 HTTP URL 当作普通模块导入；本实验先下载公开 SDK 再导入，索引仍通过 HTTP 读取。这是消费者适配，不是 REST `/search` 服务，也尚不是版本化的发布契约。

最小运行时复现（索引通过本地 HTTP 服务提供；以下指向站点相对 URL 已修正的实验索引）：

```js
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const site = 'http://127.0.0.1:8765/ccus-policy-hub/';
const index = new URL('html-only/pagefind/', site);
const sdk = await (await fetch(new URL('pagefind.js', index))).text();
const file = path.resolve('pagefind-experiment.mjs');
await fs.writeFile(file, sdk);
const search = await import(pathToFileURL(file));
await search.options({ basePath: index.href, baseUrl: site, language: 'en' });
const result = await search.search('45Q qualified facility');
console.log(await Promise.all(result.results.slice(0, 5).map((r) => r.data())));
```

该代码只用于自己控制的实验服务；生产消费者还需要固定 release/SDK 校验值和 URL 范围。不能因本地试验成功便把未固定版本的任意远程 JS 作为消费契约。

## 浏览器查询与召回阻塞

下表为现有全站 HTML baseline 的实际结果数。它们是**候选命中数量，不是正确率、已审引文数量或相关资料覆盖率**。

| 查询                     | 英文索引 | 中文索引 | 已观察到的限制                                              |
| ------------------------ | -------: | -------: | ----------------------------------------------------------- |
| `45Q qualified facility` |        1 |        2 | 英文首项是政策列表页，不能当作 #104 历史原文命中            |
| `Class VI primacy`       |      582 |       89 | 英文 top-5 包含设施及法国政策，不能按命中数声称找到目标法规 |
| `CCS Progress in China`  |        2 |        1 | 现有 HTML 命中不代表已索引实际 GCCSI PDF                    |
| `咸水层 二氧化碳封存`    |        0 |        5 | 未实现跨语言召回或经过审核的别名映射                        |
| `2009/31/EC`             |       10 |      111 | 编号查询仍须核对具体结果身份，不能据数量判断精确匹配        |

**可重复的关键失败**：

1. 三记录独立索引中，`45Q qualified facility` 能命中合成法条。
2. 将相同三记录加入完整 HTML 索引后，该查询只返回原有政策列表页；过滤 `kind=source_passage` 得到 0 条，但单词 `45Q` 加同一过滤器可命中合成法条。
3. 将 custom records 改为 `addHTMLFile`，或仅清理 custom content 中句号/逗号，加入完整语料后仍复现漏召回。因此目前不能把原因归结为 custom API 或标点，也不能靠换一种投影便宣称已修复。
4. URL 前缀修正后的索引和独立 Node 客户端同样复现；不是只在浏览器显示层观察到的问题。

初步排查时尚未定位分词、词干/前缀或分片行为，后续版本对照如下。没有证据要求引入向量检索、新后端或新数据库。

### 后续隔离对照：1.5.2 修复方向及剩余缺口

仅在本机忽略目录安装 `pagefind@1.5.2`，用同一冻结 HTML 和三条合成记录重建索引，SDK/WASM/索引均使用匹配版本；仓库依赖和锁文件未变。

| 同一英文查询 + `kind=source_passage` | 结果 | 结果页       | 审核状态                   |
| ------------------------------------ | ---: | ------------ | -------------------------- |
| 1.4.0 全站增强索引                   |    0 | 无           | 未晋级                     |
| 1.5.2 全站增强索引，独立 Node        |    1 | HTTP 200     | draft                      |
| 1.5.2 全站增强索引，浏览器           |    1 | 单一站点前缀 | draft；verified 过滤仍为 0 |

Node 的 1.5.2 定向查询单次为 193 ms、11 次 HTTP 请求、219,913 字节响应体（含 SDK、分片和结果页）；不是跨机器性能基准。1.5.2 entry SHA 为 `922385252fdd2eb7e1d548ab49536b2372d1183755610e158281dee521b4f2a1`，SDK SHA 为 `252d272bd34d483d19a752060f6a065114d15ab12c42d8f905ca565e2768a009`。

[官方 1.5.0 发布说明](https://github.com/Pagefind/pagefind/releases/tag/v1.5.0) 明确列出词干对应错误分片、只加载首个匹配分片等漏召回修复。**推断**：本轮现象与这些已知问题一致；版本对照证明这个负例可消除，但没有定位到其中某一个源码修复，不能宣称所有召回问题已解决。

进一步用合成单词、1,000/1,500 个重复文档作对照均未触发漏召回。对实际 HTML 作删除式缩减，50 次探测后仍保留 922 个页面的失败组合；没有得到一个最小单文件复现，因此不会把某个页面或中文资料本身归因为错误来源。

两个剩余限制阻止直接升级/接入：

- 1.5.2 浏览器中文目录过滤中，`合成`、`咸水层` 能找到合成记录，而 `二氧化碳封存` 及其分词查询为 0；改为 HTML 投影仍复现。浏览器 `Intl.Segmenter('zh')` 将该词组分成 `二氧化碳` / `封存`。尚未核对生成词典与查询分词的一致性，不把中英文查询数的变化当作质量提升。
- 1.5.2 普通 Node 客户端传 `options.language='zh'` 后仍返回与英文相同的五组结果；生成 SDK 的初始化会以语言自动检测覆盖该值。该参数不能作为稳定的跨版本语言选择合同。1.4.0 示例中实验性传入的 language 也不应升格为正式接口；外部 Agent 的中文/跨语言消费仍需独立验证。

建议下一步先准备**单独的依赖升级回归候选**，固定词干/分片负例、中文分词和语言选择检查，再谈发现构建插件。D-009/D-010 继续 proposed；这轮没有授权或执行生产升级。

## 审核、权限与结果完整性负例

- `45Q` + `kind=source_passage, review=draft` 命中 1 条合成草稿；`review=verified` 命中 0 条。没有自动生成已审证据。
- `access=restricted` 可以找到元数据记录；禁止公开的合成正文从未传入索引。解压并解析修正后全站增强索引的 **2,563 份 fragment**，两个保留测试标记的逐字出现次数均为 **0**。这只验证本轮受控输入，不能外推成所有私有资料已通过许可审核。
- 未加引号的 `RESTRICTED_FULLTEXT_SENTINEL` 查询产生大量宽泛命中，另一个长测试词甚至匹配到已有页面的单字母。**搜索命中本身不是泄露证明**。精确短语对照为 0，且已检查解压片段；权限检查必须检查实际输出字节。
- 合成 URL 无重复记录；前缀错误产生的孤儿链接已实际测到。尚未完成真实版本混用、中文译句冒充英文原句、release SHA 失配等 E2 负例，不能宣布 E2 完成。

## 三种真实来源：身份与 locator 实测

此表是机器及视觉检查记录，不是人工签署的文书/版次/主张审核。

| 来源                 | 实际输入与核验                                                                                                                                                                                                                    | 定位与证据边界                                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 历史 45Q HTML        | 复用 #104 `us-45q-usc-2024`，raw SHA `1a5f12bac2314d5cad5bd99495ddf5dd9502d46bcbaf184841865d20f4fc2200`；独立现有消费者读取 6 bundles、48 references、1 source，已审锚点为 0                                                      | 2024 年版，覆盖截止 2025-01-06；45Q(d) 定位为 UTF-16 offsets 8139–9207；历史草稿，现行性未核验，发布 release 本次未验证                                                              |
| 英国 Energy Act 2023 | 官方原始 PDF 在线字节与本地文件完全一致；5,319,583 bytes，494 物理页；raw SHA `2dbf9edc060777a2d775c80f1e93b9f63f85e185e6d5a100e2283d32610c71fa`                                                                                  | 视觉核对物理页 **24** = 印刷页 **4**，section 2；官方文书为 **2023 chapter 52**。既有记录链接中的 chapter 67 不能据此自动改库；法案当前修订/生效、具体主张和逐文件再分发仍待治理审核 |
| GCCSI 英文报告       | 官方发布页标题为 _CCS Progress in China – A Status Report_，当前下载链接文件为 `CCUS-Progress-in-China.pdf`；12,777,865 bytes、32 物理页；在线 SHA 与本地相同：`60991a814ab98ef9fa5dd3b96ea47785a560b27c3028689ca6e9f5506baf92e4` | 视觉核对物理页 **16** = 印刷页 **6**，Figure 1-3，短标题 “CCUS technology system”；只能作为二手报告材料，不能证明某法律条款。全文再分发/公开全文索引许可未确认，保持 metadata-only   |

来源链接：[历史 45Q 原文](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapA-partIV-subpartD-sec45Q.htm)、[英国原始法案 PDF](https://www.legislation.gov.uk/ukpga/2023/52/pdfs/ukpga_20230052_en.pdf)、[GCCSI 发布页](https://www.globalccsinstitute.com/publications/ccs-progress-in-china-a-status-report/)、[本次实际匹配的英文 PDF](https://www.globalccsinstitute.com/wp-content/uploads/2025/10/CCUS-Progress-in-China.pdf)。发布页写明 2023-03-17，下载目录却含 `2025/10`；目录年份不能作为报告版次。

附带发现：本地 `CCS-Progress-in-China-CN.pdf` 为 44 页，封面实际是《中国二氧化碳捕集利用与封存（CCUS）年度报告（2023）》，SHA `af6d5d28755ba415bdc3d8046bb16e8e761228aada513bb76d2a7c9cff172b94`。视觉核对物理页 15 = 印刷页 7。它与英文报告的标题、页数和排版不同，**尚未建立经过审核的翻译/版本关系**。旧的 [中文 PDF 地址](https://www.globalccsinstitute.com/wp-content/uploads/2023/03/CCS-Progress-in-China-CN.pdf) 本次返回 HTTP 200、`text/html`，不匹配本地 PDF。没有以 HTML 覆盖原始 PDF。

## 最小建索引对照的复现输入

在锁定依赖并完成 `pnpm gen`、`pnpm exec astro build` 后，以同一个冻结的 `dist` 比较。输出到自行选择的临时目录；不要把实验索引部署到站点。

```js
import * as pagefind from 'pagefind';

const records = [
  {
    url: '/research/e0/law/',
    language: 'en',
    content:
      'Synthetic statute 45Q qualified facility. Fixture only, historical draft.',
    meta: {
      title: 'Synthetic 45Q law',
      kind: 'source_passage',
      review: 'draft',
    },
    filters: { kind: ['source_passage'], review: ['draft'] },
  },
  {
    url: '/research/e0/report/',
    language: 'zh',
    content: '合成报告 咸水层 二氧化碳封存 研究目录',
    meta: { title: '合成中文报告', kind: 'catalog', review: 'draft' },
    filters: { kind: ['catalog'], review: ['draft'] },
  },
  {
    url: '/research/e0/restricted/',
    language: 'en',
    content: 'Synthetic restricted report metadata only.',
    meta: {
      title: 'Synthetic restricted report',
      kind: 'catalog',
      access: 'restricted',
      review: 'draft',
    },
    filters: { kind: ['catalog'], access: ['restricted'], review: ['draft'] },
  },
];
try {
  for (const variant of ['only-three', 'mixed']) {
    const { index, errors } = await pagefind.createIndex();
    if (errors.length) throw new Error(errors.join('; '));
    if (variant === 'mixed') {
      const added = await index.addDirectory({ path: 'dist' });
      if (added.errors.length) throw new Error(added.errors.join('; '));
    }
    for (const record of records) {
      const added = await index.addCustomRecord(record);
      if (added.errors.length) throw new Error(added.errors.join('; '));
    }
    const written = await index.writeFiles({
      outputPath: `/tmp/ccus-e0/${variant}/pagefind`,
    });
    if (written.errors.length) throw new Error(written.errors.join('; '));
    await index.deleteIndex();
  }
} finally {
  await pagefind.close();
}
```

Windows 可将示意 `/tmp/ccus-e0` 换成自己的临时目录。对两组索引使用相同英语运行时查询 `45Q qualified facility` 与 `45Q`，再加 `kind=source_passage` 过滤。服务端需提供对应实验目标页面和冻结 HTML 路径，避免把测试服务器缺页误记成索引的孤儿链接。

## 对 RFC 的影响

- **D-009 仍 proposed**：构建 API 能加入记录，URL 规则已实测；1.5.2 隔离对照消除一个英文漏召回负例，中文回归仍待解决，不批准生产插件。
- **D-010 仍 proposed，补充可行性证据**：Node 可下载公开 SDK 并从 HTTP 索引查询，无须新增 REST 服务；还缺 release 固定、真实候选目录与消费契约测试。
- **D-011 仍 proposed**：本轮只用合成文本测试索引输出。真实 GCCSI 仅核验元数据、字节和页面，没有获得全文发布许可。
- **E0 已执行但整体未通过**；三种来源的身份/定位预检已执行，**E1 真实三条目录投影与 E2 引用闭环尚未完成**。PDF 页码、翻译关系、许可和审核需要独立字段，但本轮不新增正式 schema，也不把机器检查写成 human review。

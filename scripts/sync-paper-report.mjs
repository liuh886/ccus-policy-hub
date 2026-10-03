import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import {
  verifyReportFile,
  verifyReportStructure,
} from './lib/report-structure.mjs';
import {
  preprocessTex,
  texCaptionForLabel,
  texCaptionToText,
} from './lib/tex-preprocess.mjs';

// 仓库根目录：以脚本自身位置推导，不依赖调用者的 CWD。
// 历史上所有路径都走 path.resolve('public/reports', ...)，一旦从子目录或
// 绝对路径调用就会把产物写到错误位置（CI 里表现为"文件不见了"）。
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

/**
 * sync-paper-report.mjs
 *
 * 一键可复用的学术报告转换与同步管道：
 * 1. 支持从 GitHub 仓库（通过 gh api）或本机路径读取 .tex 源码与配图
 * 2. 自动调用 pandoc (--number-sections) 编译为带严谨章节编号的结构化语义 HTML
 * 3. 自动解析 \begin{thebibliography}，将正文空缺引用修复为标准 [1], [2, 3] 可点击链接
 * 4. 注入即时浮窗气泡 (Citation Tooltip)、跳转高亮反馈与文末编号式参考文献列表
 * 5. 同步或生成原版 PDF 交付物（页数自动识别）
 * 6. 注入现代学术级 UI 框架（交互式目录、图片全屏放大、深浅色模式、BibTeX 一键复制等）
 * 7. 写出 assets-manifest.json（每个交付素材的来源 + 指纹），供 report:verify 复检
 *
 * 用法:
 *   node scripts/sync-paper-report.mjs [选项]
 *     默认（远端权威）：从 ESG30 远端仓库取 tex/配图/PDF，产出与 CI 逐字节一致。
 *     日常循环「编辑 → push 到 ESG30 → pnpm report:sync」用的就是这个模式。
 *
 *     --repo <owner/name>     ESG30 源仓库，默认 liuh886/2601_ESG30
 *     --slug <slug>           报告 slug，默认 2601_ESG30
 *     --local                 改用本机 tex/配图/PDF（起草预览；产物与线上不一致）
 *     --local-tex <path>      指定本机 TeX（隐含 --local）
 *     --local-pdf <path>      指定本机已构建 PDF
 *     --out-dir <path>        产物输出目录，默认 public/reports/<slug>
 *     --skip-pdf              不重新获取 PDF，沿用输出目录中已有的（快速迭代 HTML 用）
 *   node scripts/sync-paper-report.mjs --check
 *     --check: 环境无关的漂移检查。比对已提交页面内的 paper-source 指纹、PDF 与结构体检，
 *              不一致则以退出码 1 报告。不需要 pandoc，也不下载素材。
 *   node scripts/sync-paper-report.mjs --check --strict
 *     --strict: 额外在临时目录整页重新生成并逐字节比对（含素材清单与 PDF）。
 *              要求本机 Pandoc 版本与生成已提交产物时一致。
 *
 * 环境变量:
 *   ESG30_LOCAL_DIR    本机 ESG30 工作目录（替代历史硬编码盘符）
 *   GH_TOKEN           访问私有 ESG30 仓库的 token（CI 用）
 */

const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
}

const repo = getArg('--repo', 'liuh886/2601_ESG30');
const slug = getArg('--slug', '2601_ESG30');
const localTex = getArg('--local-tex', null);
const checkMode = args.includes('--check');
const skipPdf = args.includes('--skip-pdf');

/**
 * 本机素材根目录。可用环境变量 ESG30_LOCAL_DIR 覆盖，避免把某个人的盘符写死在脚本里
 * （换机器/换盘符时 CI 与本机会走不同分支，是此前多处"图没更新"类问题的温床）。
 */
const localRootDir =
  process.env.ESG30_LOCAL_DIR ||
  'D:/Documents/zhihaol/100_Project/2601_ESG30/ESG30';

/**
 * 素材来源模式：**默认远端权威**，与 CI 完全一致。
 *
 * 采用的日常循环是「编辑 → push 到 ESG30 仓库 → report:sync」，
 * 所以默认走远端：本机产物 == CI 产物 == 线上发布物，三者不会分叉。
 * 起草阶段想用本机 tex/配图时显式加 --local（产物与线上不一致，属预期）。
 *
 * 历史事故：CI 上探测不到本机素材目录，而目标目录里已有从 git 检出的旧图，
 * 于是走"文件已存在就跳过"分支——远端图更新了也不会被拉取，页面永远用旧图。
 * 因此默认必须是远端权威，而不是"本机优先、缺失再回退"。
 */
const localFirst = args.includes('--local') || !!localTex;
const remoteOnly = !localFirst;

const committedHtmlPath = path.resolve(
  repoRoot,
  'public/reports',
  slug,
  'index.html'
);
// --out-dir 让调用方（主要是 report:parity）把产物写到指定目录，
// 避免为了隔离输出而伪造 slug —— slug 会渗进页面里的 canonical URL 与评论存储键。
const outDirOverride = getArg('--out-dir', null);
const outDir = outDirOverride
  ? path.resolve(outDirOverride)
  : checkMode
    ? fs.mkdtempSync(path.join(os.tmpdir(), `ccus-report-check-${slug}-`))
    : path.resolve(repoRoot, 'public/reports', slug);
const outDataDir = path.join(outDir, 'data');
fs.mkdirSync(outDataDir, { recursive: true });

console.log(`[sync-paper-report] 开始处理报告: ${slug}`);
console.log(
  `[sync-paper-report] 目标输出目录: ${outDir}${checkMode ? ' (check 模式，仅临时目录)' : ''}`
);
console.log(
  `[sync-paper-report] 素材来源模式: ${
    remoteOnly
      ? '远端权威（与 CI 一致）'
      : `本机草稿 (${localRootDir})，缺失时回退远端`
  }`
);

const defaultLocalTex = path.join(localRootDir, 'paper_draft.tex');
const defaultLocalOutputDir = path.join(localRootDir, 'output');
const defaultLocalDataDir = path.join(localRootDir, 'data');

/**
 * 统一的所有权边界：所有取内容的动作都走这里，避免把路径/引号拼进 shell 字符串。
 * 历史上用 execSync(`python -c "...${path}..."`) 下载二进制，在 Windows 依赖单引号/双引号
 * 嵌套、在 CI 又依赖 `python` 恰好存在——两个环境都只是"碰巧能用"。这里改成 argv 直传。
 */
function ghApiToFile(remotePath, destPath) {
  const res = spawnSync(
    'gh',
    [
      'api',
      `repos/${repo}/contents/${remotePath}`,
      '-H',
      'Accept: application/vnd.github.v3.raw',
    ],
    { encoding: 'buffer', maxBuffer: 512 * 1024 * 1024 }
  );
  if (res.error || res.status !== 0 || !res.stdout || !res.stdout.length) {
    const why = res.error
      ? res.error.message
      : (res.stderr || Buffer.alloc(0)).toString('utf8').trim() ||
        `exit ${res.status}`;
    return { ok: false, error: why };
  }
  fs.writeFileSync(destPath, res.stdout);
  return { ok: true, bytes: res.stdout.length };
}

function ghApiToText(remotePath) {
  const res = spawnSync(
    'gh',
    [
      'api',
      `repos/${repo}/contents/${remotePath}`,
      '-H',
      'Accept: application/vnd.github.v3.raw',
    ],
    { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }
  );
  if (res.error || res.status !== 0 || !res.stdout) {
    const why = res.error
      ? res.error.message
      : (res.stderr || '').trim() || `exit ${res.status}`;
    throw new Error(why);
  }
  return res.stdout;
}

function sha256File(filePath) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(filePath))
    .digest('hex')
    .slice(0, 16);
}

// 在候选文件名中挑选版本号最高的 PDF（如 v3.6 高于 v3.5）
function pickLatestPdfName(names) {
  const filtered = names.filter((n) =>
    /^ESG30_dMRV_Report_v[\d.]+\.pdf$/.test(n)
  );
  if (!filtered.length) return null;
  const versionOf = (n) =>
    n
      .match(/v([\d.]+)\.pdf$/)[1]
      .split('.')
      .map((x) => parseInt(x, 10) || 0);
  filtered.sort((a, b) => {
    const va = versionOf(a);
    const vb = versionOf(b);
    for (let i = 0; i < Math.max(va.length, vb.length); i++) {
      const d = (va[i] || 0) - (vb[i] || 0);
      if (d) return d;
    }
    return 0;
  });
  return filtered[filtered.length - 1];
}

// 本机 output/ 下版本号最高的已构建 PDF（避免硬编码版本号同步到旧 PDF）
const defaultLocalPdf = (() => {
  if (!fs.existsSync(defaultLocalOutputDir)) return null;
  const latest = pickLatestPdfName(fs.readdirSync(defaultLocalOutputDir));
  return latest ? path.join(defaultLocalOutputDir, latest) : null;
})();
// 本机已构建 PDF 路径（可用 --local-pdf 覆盖；传不存在路径可强制走远端拉取/编译）
const localPdfPath = getArg('--local-pdf', null) || defaultLocalPdf;
// 远端（ESG30 仓库）中已构建 PDF 的位置；本地无 PDF 时（如 CI）从此处拉取。
// 传 'latest' 或该路径不存在时，自动在 output/ 下挑选版本号最高的 PDF。
const pdfRemotePath = getArg('--pdf-remote-path', 'latest');

let texContent = '';

// --- 1. 获取 TeX 源码与配图 ---
// texSource 决定后续所有素材的来源：拿的是本机 tex 就用本机 data/，保证同一快照；
// 拿的是远端 tex 就必须用远端 data/，否则会出现"文字是新的、图还是旧的"。
let texSource = null;
const candidateLocalTex = remoteOnly
  ? null
  : localTex || (fs.existsSync(defaultLocalTex) ? defaultLocalTex : null);
if (candidateLocalTex && fs.existsSync(candidateLocalTex)) {
  texSource = 'local';
  console.log(
    `[sync-paper-report] 优先使用本机最新 TeX 源码: ${candidateLocalTex}`
  );
  texContent = fs.readFileSync(candidateLocalTex, 'utf8');
} else {
  texSource = 'remote';
  console.log(`[sync-paper-report] 从 GitHub 仓库获取 TeX 源码: ${repo}...`);
  try {
    texContent = ghApiToText('paper_draft.tex');
    console.log(
      `[sync-paper-report] 成功获取 TeX 源码，字符数: ${texContent.length}`
    );
  } catch (err) {
    if (checkMode) {
      console.warn(
        `[sync-paper-report][check] ⚠️ 无法获取 paper draft 源码（本机 TeX 与 GitHub 均不可用），跳过漂移检查。`
      );
      process.exit(0);
    }
    console.error(
      `[sync-paper-report] ❌ 从 ${repo} 获取 paper_draft.tex 失败: ${err.message}`
    );
    console.error(
      `[sync-paper-report]    默认模式只信任远端仓库（与 CI 一致）。若你是离线起草、想用本机 tex 生成预览，请改用：`
    );
    console.error(
      `[sync-paper-report]      node scripts/sync-paper-report.mjs --local --skip-pdf`
    );
    console.error(
      `[sync-paper-report]    （注意：--local 产出的页面与线上不一致，CI 的 report:parity 会判为漂移。）`
    );
    process.exit(1);
  }
}

/**
 * 起草分歧预警：默认模式下产物基于**远端** tex。若本机还有未推送的草稿，
 * 必须明确告知，否则会出现"我明明改了、页面却没变"的困惑。
 */
function warnIfLocalDraftDiverges() {
  // 只在"远端权威"模式下提醒：此时产物基于远端，本机未推送的草稿不会体现在页面上。
  // --local 模式下本机就是来源，无需提醒；check 模式只做只读比对，不打扰。
  if (!remoteOnly || checkMode) return;
  const localPath = localTex || defaultLocalTex;
  if (!localPath || !fs.existsSync(localPath)) return;
  const localSha = crypto
    .createHash('sha256')
    .update(fs.readFileSync(localPath, 'utf8').replace(/\r\n/g, '\n'))
    .digest('hex')
    .slice(0, 16);
  if (localSha === texSha) {
    console.log(
      `[sync-paper-report] 本机草稿与远端一致 (${texSha})，产物即线上将发布的版本。`
    );
    return;
  }
  console.warn(
    `[sync-paper-report] ⚠️  本机草稿与远端不一致：local=${localSha} / remote=${texSha}`
  );
  console.warn(
    `[sync-paper-report]    本次产物基于**远端**（= 线上将发布的版本）。若要让线上反映本机草稿：`
  );
  console.warn(`[sync-paper-report]      1) 先把 ${localPath} 推送到 ${repo}`);
  console.warn(`[sync-paper-report]      2) 再跑 \`pnpm report:sync\``);
  console.warn(
    `[sync-paper-report]    若只是想本机预览（产物与线上不一致，CI 会判为漂移）：`
  );
  console.warn(`[sync-paper-report]      pnpm report:sync:local`);
}

// 源码指纹：用于在页面内标注所依据的 paper draft 版本，并支撑 --check 漂移比对。
// 先归一化换行（CRLF -> LF），使本机 Windows 检出与远端 CI 得到一致的指纹。
const texContentNormalized = texContent.replace(/\r\n/g, '\n');
const texSha = crypto
  .createHash('sha256')
  .update(texContentNormalized)
  .digest('hex')
  .slice(0, 16);
console.log(`[sync-paper-report] paper draft sha256(前16位): ${texSha}`);
warnIfLocalDraftDiverges();

/**
 * --check（默认模式）是环境无关的漂移检查，只需要 tex 指纹。
 * 先做完指纹比对再拉素材，避免每次 pre-push / CI 都白白下载几 MB 图片与 PDF。
 */
if (checkMode && !args.includes('--strict')) {
  const fail = (msg) => {
    console.error(`[sync-paper-report][check] ❌ ${msg}`);
    process.exit(1);
  };

  if (!fs.existsSync(committedHtmlPath)) {
    fail(`未找到已提交页面: ${committedHtmlPath}`);
  }
  const committedHtml = fs.readFileSync(committedHtmlPath, 'utf8');
  const stampMatch = committedHtml.match(
    /<meta name="paper-source" content="paper_draft\.tex sha256:([0-9a-f]+)"\s*\/>/
  );
  if (!stampMatch) {
    fail(
      `已提交页面缺少 paper-source 溯源标记，无法确认其对应的 paper draft 版本。请运行 \`pnpm report:sync\`。`
    );
  }
  if (stampMatch[1] !== texSha) {
    fail(
      `已提交页面基于 paper draft sha256:${stampMatch[1]}，而最新为 sha256:${texSha}。请运行 \`pnpm report:sync\`。`
    );
  }

  const committedPdf = path.join(
    path.dirname(committedHtmlPath),
    'paper_draft.pdf'
  );
  if (fs.existsSync(committedPdf)) {
    let refPdf = null;
    let tmpRefPdf = null;
    const localRef =
      !remoteOnly && fs.existsSync(localPdfPath || '') ? localPdfPath : null;
    if (localRef) {
      refPdf = localRef;
    } else {
      try {
        const remotePdf =
          pdfRemotePath && pdfRemotePath !== 'latest'
            ? pdfRemotePath
            : resolveLatestRemotePdf();
        if (remotePdf) {
          tmpRefPdf = path.join(
            os.tmpdir(),
            `ccus-report-ref-${Date.now()}.pdf`
          );
          fetchRemoteBinary(remotePdf, tmpRefPdf);
          refPdf = tmpRefPdf;
        }
      } catch (err) {
        console.warn(
          `[sync-paper-report][check] ⚠️ 无法取得参考 PDF，跳过 PDF 比对: ${err.message}`
        );
      }
    }
    if (refPdf && fs.existsSync(refPdf)) {
      const same = fs
        .readFileSync(committedPdf)
        .equals(fs.readFileSync(refPdf));
      if (!same) {
        fail(
          `已提交 paper_draft.pdf 与最新交付 PDF 不一致。请运行 \`pnpm report:sync\`。`
        );
      }
    }
    if (tmpRefPdf && fs.existsSync(tmpRefPdf)) fs.unlinkSync(tmpRefPdf);
  }

  // 结构体检：指纹一致但版面损坏（例如手工改坏产物、或生成脚本回归）也要拦住。
  // CI 的 report:verify 走同一条规则。
  const structureProblems = verifyReportFile(
    committedHtmlPath,
    texContentNormalized
  );
  if (structureProblems.length) {
    console.error(
      `[sync-paper-report][check] ❌ 已提交页面结构自检未通过（${structureProblems.length} 项）：`
    );
    for (const p of structureProblems) console.error(`  · ${p}`);
    process.exit(1);
  }

  console.log(
    `[sync-paper-report][check] ✅ 已提交页面与最新 paper draft 一致 (paper draft sha256:${texSha})`
  );
  process.exit(0);
}

// 提取 TeX 中引用到的配图
const referencedImages = [
  ...new Set(
    [...texContent.matchAll(/\\includegraphics(?:\[.*?\])?\{([^}]+)\}/g)].map(
      (m) => m[1]
    )
  ),
];
console.log(`[sync-paper-report] 检测到引用图片:`, referencedImages);

/**
 * 配图获取：按"与 tex 同源优先"的顺序解析，并把每个文件的来源与指纹登记进清单。
 * 关键修正：远端优先模式下，若最终落到"目标目录里已有旧文件"这一兜底分支，
 * 说明远端素材没取到——直接失败，而不是把旧图当新图发布。
 */
const assetManifest = [];
{
  const unresolved = [];
  for (const relImg of referencedImages) {
    const destImgPath = path.join(outDir, relImg);
    fs.mkdirSync(path.dirname(destImgPath), { recursive: true });

    // 候选来源，按优先级：tex 同源目录 -> 本机 data -> 远端 -> 目标目录已有文件
    const localDataCand = path.join(defaultLocalDataDir, path.basename(relImg));
    const candidates = [
      texSource === 'local' && fs.existsSync(localDataCand)
        ? { kind: 'local', from: localDataCand }
        : null,
      !remoteOnly && texSource === 'remote' && fs.existsSync(localDataCand)
        ? { kind: 'local', from: localDataCand }
        : null,
      { kind: 'remote', from: relImg },
      fs.existsSync(relImg) &&
      path.resolve(relImg) !== path.resolve(destImgPath)
        ? { kind: 'local', from: relImg }
        : null,
      fs.existsSync(destImgPath) && fs.statSync(destImgPath).size > 0
        ? { kind: 'existing', from: destImgPath }
        : null,
    ].filter(Boolean);

    let placed = null;
    const failures = [];
    for (const cand of candidates) {
      if (cand.kind === 'remote') {
        const r = ghApiToFile(relImg, destImgPath);
        if (r.ok) {
          placed = { source: 'remote', bytes: r.bytes };
          break;
        }
        failures.push(`remote(${r.error})`);
        continue;
      }
      try {
        if (path.resolve(cand.from) === path.resolve(destImgPath)) {
          placed = { source: 'existing', bytes: fs.statSync(destImgPath).size };
          break;
        }
        fs.copyFileSync(cand.from, destImgPath);
        placed = { source: 'local', bytes: fs.statSync(destImgPath).size };
        break;
      } catch (err) {
        failures.push(`${cand.kind}(${err.message})`);
      }
    }

    if (!placed) {
      unresolved.push(relImg);
      console.error(
        `[sync-paper-report] ❌ 无法获取配图 ${relImg}；尝试过: ${failures.join(', ') || '(无可用来源)'}`
      );
      continue;
    }
    if (placed.source === 'existing') {
      const msg =
        `[sync-paper-report] ⚠️ 配图 ${relImg} 未能从${texSource === 'local' ? '本机' : '远端'}数据源取得，` +
        `沿用目标目录中已有文件（可能是旧版本）。`;
      if (remoteOnly) unresolved.push(relImg);
      console.warn(msg);
    }
    assetManifest.push({
      path: relImg.replace(/\\/g, '/'),
      source: placed.source,
      bytes: placed.bytes,
      sha256: sha256File(destImgPath),
    });
  }

  if (unresolved.length) {
    if (remoteOnly) {
      console.error(
        `[sync-paper-report] ❌ 远端优先模式下有 ${unresolved.length} 张配图只能沿用旧文件，已中止：` +
          unresolved.join(', ')
      );
      process.exit(1);
    }
    console.warn(
      `[sync-paper-report] ⚠️ 有 ${unresolved.length} 张配图使用兜底来源，产物可能与 paper draft 不一致。`
    );
  }

  const bySource = assetManifest.reduce((acc, a) => {
    acc[a.source] = (acc[a.source] || 0) + 1;
    return acc;
  }, {});
  console.log(`[sync-paper-report] 配图来源统计: ${JSON.stringify(bySource)}`);
}

// --- 2. 提取 TeX 元数据 ---
function extractMeta(regex, fallback = '') {
  const m = texContent.match(regex);
  return m ? m[1].trim() : fallback;
}

const docTitle =
  extractMeta(/\\title\{([^}]+)\}/) || 'CCUS 规模化的治理组合与 dMRV 证据基础';
const docAuthor = extractMeta(/\\author\{([^}]+)\}/) || '课题组';
const docDate = extractMeta(/\\date\{([^}]+)\}/) || '2026年9月15日';
const reportType =
  extractMeta(/\\newcommand\{\\ReportType\}\{([^}]+)\}/) || '课题研究报告';
const reportVersion =
  extractMeta(/\\newcommand\{\\ReportVersion\}\{([^}]+)\}/) || 'v3.6';
const programName =
  extractMeta(/\\newcommand\{\\ProgramName\}\{([^}]+)\}/) ||
  'ESG30 青年学者计划（二期）';

// 提取摘要
let abstractText = '';
const absMatch = texContent.match(
  /\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/
);
if (absMatch) {
  abstractText = absMatch[1].replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, '').trim();
}
if (!abstractText) {
  abstractText =
    '碳捕集、利用与封存（CCUS）是难减排工业深度脱碳的重要路径。本报告探讨从单点示范走向跨主体产业协作过程中，政策设计与数字化可信证据（dMRV）的协同路径。';
}

// 提取关键词
let keywordsText = '';
const kwMatch = texContent.match(/\\textbf\{关键词[：:]\}\s*([^\n\\]+)/);
if (kwMatch) {
  keywordsText = kwMatch[1].trim();
} else {
  keywordsText = 'CCUS；集群治理；产业协作；能源惩罚；dMRV；产业信用基础设施';
}

// 提取所有 \bibitem 键值对
const bibItemsMap = new Map();
const bibMatch = texContent.match(
  /\\begin\{thebibliography\}[\s\S]*?\\end\{thebibliography\}/
);
const rawKeys = bibMatch
  ? [...bibMatch[0].matchAll(/\\bibitem\{([^}]+)\}/g)].map((m) => m[1].trim())
  : [];
console.log(`[sync-paper-report] 解析到 ${rawKeys.length} 条原始参考文献键名`);

// --- 3. 编译或同步 PDF ---
const pdfDest = path.join(outDir, 'paper_draft.pdf');
let pdfSource = null;

function fetchRemoteBinary(remotePath, destPath) {
  const r = ghApiToFile(remotePath, destPath);
  if (!r.ok) throw new Error(r.error);
  return r.bytes;
}

// 解析 ESG30 仓库 output/ 下版本号最高的已构建 PDF
function resolveLatestRemotePdf() {
  const res = spawnSync(
    'gh',
    ['api', `repos/${repo}/contents/output`, '--jq', '.[].name'],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
  );
  if (res.error || res.status !== 0 || !res.stdout) {
    throw new Error(
      res.error
        ? res.error.message
        : (res.stderr || '').trim() || `exit ${res.status}`
    );
  }
  const names = res.stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const latest = pickLatestPdfName(names);
  return latest ? `output/${latest}` : null;
}

// 构建 PDF：先本机已构建产物，再远端已构建产物，最后才本机 xelatex 兜底。
// 顺序与 tex/配图一致：远端优先模式下不读本机产物，保证与 CI 同源。
// 所有获取都先落到 .staged 临时文件再 rename，避免中途失败破坏已提交产物。
if (skipPdf) {
  if (fs.existsSync(pdfDest)) {
    pdfSource = 'existing';
    console.log(
      `[sync-paper-report] --skip-pdf：沿用现有 ${path.relative(repoRoot, pdfDest)}（${(fs.statSync(pdfDest).size / 1024 / 1024).toFixed(2)} MB）`
    );
  } else {
    console.warn(
      `[sync-paper-report][warn] --skip-pdf 且目标位置没有 paper_draft.pdf，页面将不带下载入口。`
    );
  }
} else {
  const staged = path.join(outDir, '.paper_draft.pdf.staged');
  const commitStaged = (source) => {
    fs.renameSync(staged, pdfDest);
    pdfSource = source;
  };

  if (!remoteOnly && localPdfPath && fs.existsSync(localPdfPath)) {
    fs.copyFileSync(localPdfPath, staged);
    commitStaged('local');
    console.log(
      `[sync-paper-report] 同步本机已构建原版 PDF: ${localPdfPath} (${(fs.statSync(pdfDest).size / 1024 / 1024).toFixed(2)} MB)`
    );
  }

  if (!pdfSource) {
    try {
      const remotePdf =
        pdfRemotePath && pdfRemotePath !== 'latest'
          ? pdfRemotePath
          : resolveLatestRemotePdf();
      if (remotePdf) {
        fetchRemoteBinary(remotePdf, staged);
        if (fs.statSync(staged).size > 0) {
          commitStaged('remote');
          console.log(
            `[sync-paper-report] 已从 ${repo} 拉取 PDF: ${remotePdf} (${(fs.statSync(pdfDest).size / 1024 / 1024).toFixed(2)} MB)`
          );
        }
      } else {
        console.warn(
          `[sync-paper-report][warn] ${repo}/output 下未找到符合 ESG30_dMRV_Report_v*.pdf 的已构建 PDF。`
        );
      }
    } catch (err) {
      console.warn(`[sync-paper-report] 从远端拉取 PDF 失败:`, err.message);
    }
  }

  if (!pdfSource) {
    // 最后兜底：本机 xelatex 现编。注意其字节与 ESG30 官方构建不同，会触发 PDF 漂移告警，
    // 因此只作为"本机没有现成产物"的应急手段，并显式提示来源差异。
    const checkXe = spawnSync('xelatex', ['--version']);
    if (checkXe.status === 0) {
      console.log(
        `[sync-paper-report] 未取得现成 PDF，检测到本机 xelatex，正在本地构建（字节将与 ESG30 官方构建不同）...`
      );
      const tempTex = path.join(outDir, 'source.tex');
      fs.writeFileSync(tempTex, texContent, 'utf8');
      try {
        for (const pass of [1, 2]) {
          console.log(`[sync-paper-report] 编译 PDF 第 ${pass} 遍...`);
          spawnSync(
            'xelatex',
            [
              '-interaction=nonstopmode',
              `-output-directory=${outDir}`,
              tempTex,
            ],
            { stdio: 'ignore' }
          );
        }
        const genPdf = path.join(outDir, 'source.pdf');
        if (fs.existsSync(genPdf) && fs.statSync(genPdf).size > 0) {
          fs.copyFileSync(genPdf, staged);
          commitStaged('local-build');
          console.log(
            `[sync-paper-report] PDF 本地构建成功: ${pdfDest} (${(fs.statSync(pdfDest).size / 1024 / 1024).toFixed(2)} MB)`
          );
        }
      } finally {
        for (const ext of ['.tex', '.aux', '.log', '.out', '.toc']) {
          const f = path.join(outDir, 'source' + ext);
          if (fs.existsSync(f)) fs.unlinkSync(f);
        }
      }
    }
  }

  if (fs.existsSync(staged)) fs.unlinkSync(staged);

  if (!pdfSource) {
    console.error(
      `[sync-paper-report] ❌ 未取得 paper_draft.pdf（来源模式: ${remoteOnly ? '仅远端' : '本机优先'}），已中止。`
    );
    process.exit(1);
  }
}

/**
 * 从 PDF 解析实际页数，供模板文案使用；解析失败返回 null（模板会省略页数），
 * 避免硬编码页数随版本漂移。三种方式全部走 argv 直传，不把路径拼进 shell 字符串：
 * 历史实现用 execSync(`python -c "...${path}..."`)，在 Windows 依赖引号嵌套、
 * 在 CI 依赖 `python` 恰好在 PATH 上，两个环境都只是碰巧能用。
 */
const PY_PDF_PAGES =
  'import importlib.util,sys;' +
  'mod=__import__("pypdf") if importlib.util.find_spec("pypdf") else __import__("PyPDF2");' +
  'print(len(mod.PdfReader(sys.argv[1]).pages))';

function detectPdfPageCount(pdfPath) {
  if (!pdfPath || !fs.existsSync(pdfPath)) return null;

  // 1) pdfinfo（poppler-utils；CI 已安装）
  const info = spawnSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
  if (!info.error && info.status === 0 && info.stdout) {
    const m = info.stdout.match(/Pages:\s*(\d+)/);
    if (m) return parseInt(m[1], 10);
  }

  // 2) python / python3（argv 传参，无引号问题）
  for (const py of ['python', 'python3']) {
    const r = spawnSync(py, ['-c', PY_PDF_PAGES, pdfPath], {
      encoding: 'utf8',
    });
    if (r.error || r.status !== 0 || !r.stdout) continue;
    const n = parseInt(r.stdout.trim(), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }

  console.warn(
    `[sync-paper-report][warn] 未能解析 PDF 页数（缺 pdfinfo / python），页面将不显示页数。`
  );
  return null;
}
const pdfPageCount = detectPdfPageCount(pdfDest);
if (pdfPageCount) {
  console.log(`[sync-paper-report] PDF 实际页数识别为 ${pdfPageCount} 页`);
}

// 素材清单落盘：记录每个交付素材的来源与指纹。
// 用途：(a) report:verify 能发现"页面文字没变、但配图被手工替换"这类指纹比对抓不到的问题；
//      (b) --check --strict 可逐项比对素材，避免静默沿用旧图/旧 PDF。
{
  if (pdfSource && fs.existsSync(pdfDest)) {
    assetManifest.push({
      path: 'paper_draft.pdf',
      source: pdfSource,
      bytes: fs.statSync(pdfDest).size,
      sha256: sha256File(pdfDest),
    });
  }
  const manifestPath = path.join(outDir, 'assets-manifest.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        slug,
        texSha,
        texSource,
        remoteOnly,
        pandocVersion: pandocVersion(),
        generatedAt: new Date().toISOString(),
        assets: assetManifest,
      },
      null,
      2
    ) + '\n',
    'utf8'
  );
  console.log(
    `[sync-paper-report] 素材清单已写入 ${path.relative(repoRoot, manifestPath)}（${assetManifest.length} 项）`
  );
}

/** 记录生成时的 Pandoc 版本：--check --strict 的整页比对依赖版本一致，需可追溯 */
function pandocVersion() {
  const r = spawnSync('pandoc', ['--version'], { encoding: 'utf8' });
  if (r.error || r.status !== 0 || !r.stdout) return null;
  const m = r.stdout.match(/^pandoc\s+(\S+)/m);
  return m ? m[1] : null;
}

// --- 4. 调用 Pandoc (--number-sections) 编译为 HTML ---
console.log(
  `[sync-paper-report] 调用 Pandoc 进行 TeX -> HTML 语法转换 (启用 --number-sections 与 --wrap=none)...`
);

// TeX 预处理（\shortstack 折叠 / longtable 重复表头 / 中文方括号保护）已抽到
// lib/tex-preprocess.mjs：这几条规则对应实测确认的 Pandoc 缺陷，且历史上正是
// 因为内联在脚本里无法单测，一处 label 硬编码就让作者改名后产出"缺表头"页面。
const preprocessResult = preprocessTex(texContent);
const preprocessedTex = preprocessResult.tex;
console.log(
  `[sync-paper-report] TeX 预处理：折叠 ${preprocessResult.shortstackCount} 处 shortstack，` +
    `longtable ${preprocessResult.longtableCount} 个（修正 ${preprocessResult.longtableTouched} 个），` +
    `方括号保护 ${preprocessResult.bracketGuardCount} 处`
);

const tempTexPath = path.join(outDir, '_temp_build.tex');
fs.writeFileSync(tempTexPath, preprocessedTex, 'utf8');

const tempHtmlPath = path.join(outDir, '_temp_body.html');
try {
  // argv 直传：路径含空格/中文时不依赖 shell 引号，Windows 与 Linux 行为一致。
  const pandoc = spawnSync(
    'pandoc',
    [
      tempTexPath,
      '--number-sections',
      '--mathjax',
      '--wrap=none',
      '-o',
      tempHtmlPath,
    ],
    { stdio: 'inherit' }
  );
  if (pandoc.error || pandoc.status !== 0) {
    throw new Error(
      pandoc.error ? pandoc.error.message : `pandoc 退出码 ${pandoc.status}`
    );
  }
} catch (e) {
  console.error(`[sync-paper-report] Pandoc 转换失败:`, e.message);
  process.exit(1);
}

// Pandoc 在 Windows 上会输出 CRLF。统一归一化为 LF，使本机生成结果与
// CI（Linux）逐字节一致——否则 --check --strict 的整页比对与 git diff 都会被行尾噪声淹没，
// 也违反仓库的 `* text=auto eol=lf` 约定。
let bodyHtml = fs.readFileSync(tempHtmlPath, 'utf8').replace(/\r\n/g, '\n');
fs.unlinkSync(tempTexPath);
fs.unlinkSync(tempHtmlPath);

// 修正相对图片路径
bodyHtml = bodyHtml.replace(/src="data\//g, 'src="./data/');

// --- 4.1 通用排版工具 ---
// 这些工具被图、表、附录、图文摘要共用，保证全站注释与卡片结构只有一套实现。

/**
 * 版面改写命中登记表。
 * 历史上所有改写都是“正则静默 no-op”：TeX 改版后一旦失配就原样跳过、不报错，
 * 页面因此静默腐烂并直接上线（如图 2 丢失图头、图文摘要卡片整体消失）。
 * 现在每处结构性改写都必须登记预期命中数，写盘前统一核对，对不上就硬失败。
 */
const qcStats = [];
function expectHits(name, actual, expected) {
  qcStats.push({ name, actual, expected });
}

// 注释前缀：既匹配裸文本“注：”，也匹配 Pandoc 生成的 <em>注：</em> / <strong>口径与筛选说明：</strong>
const NOTE_LEAD_RE =
  /^(?:<strong>|<em>)?\s*(注|口径(?:与筛选)?说明)\s*[：:]\s*(?:<\/strong>|<\/em>)?\s*/;

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '');
}

// 判断一个块级片段是否是“注释段落”（用于把紧随表格/图之后的说明纳入统一注释组件）
function isNoteBlock(html) {
  return (
    /^\s*<(p|div)\b[^>]*>/.test(html) &&
    NOTE_LEAD_RE.test(stripHtml(html).trim())
  );
}

/**
 * 规范化注释正文：剥离冗余的“注：”（已由 note-tag 承载），
 * 把“口径与筛选说明”等语义标签保留为加粗前导，使图注与表注语义一致。
 */
function normalizeNote(html) {
  const out = html
    .trim()
    .replace(/^\s*<p[^>]*>([\s\S]*)<\/p>\s*$/, '$1')
    .trim();
  const lead = out.match(NOTE_LEAD_RE);
  if (!lead) return out;
  // \textit{注：…} 会被 Pandoc 整体包成 <em>…</em>，剥离前缀后尾部会残留一个 </em>
  const rest = out
    .slice(lead[0].length)
    .replace(/<\/(?:em|strong)>\s*$/, '')
    .trim();
  return lead[1] === '注'
    ? rest
    : `<strong class="note-lead">${lead[1]}</strong>${rest}`;
}

/**
 * 全站唯一的注释渲染器：图注用 .figure-notes，表注用 .table-notes-footer，
 * 两者内部结构（note-tag + note-text）完全一致；空注释不输出任何容器。
 */
function renderNote(inner, containerClass) {
  const text = (inner || '').trim();
  if (!text) return '';
  return `
      <div class="${containerClass}">
        <span class="note-tag">注</span>
        <div class="note-text">${text}</div>
      </div>`;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// HTML 属性值转义：图题/表题会进入 alt 与 title，必须防止引号破坏属性
function attr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// 定位与 from 处 div 配对的结束位置（返回 </div> 之后的下标）。
// 用于"某附录是否只包含一张表卡片"这类结构判定，必须按嵌套深度配对而不是
// 非贪婪正则——卡片内部还有多层 div。
function findDivEnd(str, from) {
  let depth = 0;
  for (let i = from; i < str.length; i++) {
    if (str.startsWith('<div', i) && !/[a-zA-Z-]/.test(str[i + 4] || ''))
      depth++;
    else if (str.startsWith('</div>', i)) {
      depth--;
      if (depth === 0) return i + 6;
    }
  }
  return -1;
}

// 附录识别：以 TeX 中 \appendix 之后的 \section 数量为准，把正文末尾同样数量的顶层章节
// 映射为附录 A/B/C…，脚本内不再硬编码章节号与标题。
const appendixSectionLetters = (() => {
  const marker = texContent.indexOf('\\appendix');
  if (marker === -1) return {};
  const count = (texContent.slice(marker).match(/\\section\{/g) || []).length;
  if (!count) return {};
  const topSections = [
    ...bodyHtml.matchAll(/<h1\s+data-number="(\d+)"[^>]*>/g),
  ].map((m) => m[1]);
  if (topSections.length < count) {
    console.warn(
      `[sync-paper-report] ⚠️ TeX 中 \\appendix 之后有 ${count} 个章节，但正文仅解析出 ${topSections.length} 个顶层章节，附录编号将跳过。`
    );
    return {};
  }
  const map = {};
  topSections.slice(-count).forEach((num, i) => {
    map[num] = String.fromCharCode(65 + i);
  });
  console.log(
    `[sync-paper-report] 识别到 ${count} 个附录章节: ${Object.entries(map)
      .map(([num, letter]) => `${num}->附录 ${letter}`)
      .join(', ')}`
  );
  return map;
})();

// 把 Pandoc 生成的伪数学标记清洗为原生 HTML（下标/度数），消除公式渲染延迟与抖动。
// 必须早于表格与图形的规范化步骤，否则表头单元格内的 \(_2\) 会残留。
bodyHtml = bodyHtml.replace(
  /<span\s+class="math inline">\s*\\?\(_2\\?\)\s*<\/span>/g,
  '<sub>2</sub>'
);
bodyHtml = bodyHtml.replace(
  /<span\s+class="math inline">\s*\\?\((\^\\circ|\\circ)\\?\)\s*<\/span>/g,
  '°'
);
bodyHtml = bodyHtml.replace(/\\\(_2\\\)/g, '<sub>2</sub>');
bodyHtml = bodyHtml.replace(/\\\((\^\\circ|\\circ)\\\)/g, '°');

// --- 学术图规范化：通用卡片 + 自动图号 ---
// 不再为每张图硬编码正则：图号按文档顺序分配，图内注释段落被吸收进统一的注释组件，
// 因此 TeX 增删图片或调整 caption 文案都不会导致图头丢失。
const figureNumbering = new Map(); // fig label -> { badge, title }
{
  let figureSeq = 0;
  bodyHtml = bodyHtml.replace(
    /<figure\b([^>]*)>([\s\S]*?)<\/figure>/g,
    (match, attrs, inner) => {
      const idM = attrs.match(/id="([^"]+)"/);
      const imgM = inner.match(/<img\b[^>]*\ssrc="([^"]+)"[^>]*\/?>/);
      if (!idM || !imgM) {
        console.warn(
          `[sync-paper-report] ⚠️ 图形 ${idM ? idM[1] : '(无 id)'} 结构异常（缺少 id 或 img），已跳过规范化。`
        );
        return match;
      }
      figureSeq += 1;
      const badge = `图 ${figureSeq}`;
      const captionM = inner.match(/<figcaption>([\s\S]*?)<\/figcaption>/);
      const title = captionM ? captionM[1].trim() : '';
      // 图内注释：Pandoc 把 \begin{minipage} 里的“注：…”排成 <p>，位于 figcaption 之前
      const noteHtml = (
        inner.match(/<p\b[^>]*>(?:(?!<\/p>)[\s\S])*?<\/p>/g) || []
      )
        .filter(isNoteBlock)
        .map(normalizeNote)
        .join(' ');
      if (!title) {
        console.warn(`[sync-paper-report] ⚠️ ${idM[1]} 缺少 figcaption。`);
      }
      figureNumbering.set(idM[1], { badge, title });
      const alt = attr(title || badge);
      return `
    <figure class="academic-figure" id="${idM[1]}">
      <div class="figure-header">
        <div class="figure-title-group">
          <span class="figure-label">${badge}</span>
          <span class="figure-title">${title}</span>
        </div>
        <span class="figure-tip">🔍 点击放大</span>
      </div>
      <div class="figure-img-wrap">
        <img src="${imgM[1]}" alt="${alt}" loading="lazy" />
      </div>
      ${renderNote(noteHtml, 'figure-notes')}
    </figure>`;
    }
  );
  // landscape 包裹层只服务于 TeX 横向排版，在 HTML 中无意义，直接摊平/剥离避免残留
  bodyHtml = bodyHtml.replace(
    /<div class="landscape">(\s*<figure class="academic-figure"[\s\S]*?<\/figure>)\s*<\/div>/g,
    '$1'
  );
  bodyHtml = bodyHtml.replace(
    /(<section\b[^>]*?)\s+class="landscape"([^>]*>)/g,
    '$1$2'
  );
  expectHits(
    '学术图卡片化',
    figureNumbering.size,
    (texContent.match(/\\begin\{figure\}/g) || []).length
  );
  console.log(
    `[sync-paper-report] 已规范化 ${figureNumbering.size} 张图：${[
      ...figureNumbering.entries(),
    ]
      .map(([k, v]) => `${k}=${v.badge}`)
      .join(', ')}`
  );
}

// --- 表格排版：通用卡片化 + 自动表号 ---
console.log(`[sync-paper-report] 正在统一表格卡片、表号与注释排版...`);

// 1. 移除 Pandoc 误生成的内联 table width 限制 (例如 style="width:12%;") 和 col 限制
bodyHtml = bodyHtml.replace(/<table[^>]*style="[^"]*"[^>]*>/g, '<table>');
bodyHtml = bodyHtml.replace(/<col style="width:[^"]*" \/>/g, '<col />');

/**
 * 逐表专属 tweak：只声明“视觉差异化”所必需的内容（表格 class、横向滚动控件、说明 pill）。
 * 表头、表号、注释、锚点一律由下方通用引擎生成，脚本内不再维护 label->表号 的硬编码映射，
 * 因此 TeX 新增表格时不会出现“有引用、无表号”的断层。
 */
const tableTweaks = {
  // 全球治理对标矩阵：7 列超宽表，需要横向滚动视口与左右滚动按钮
  'tab:governance_benchmark': {
    tableClass: 'table-benchmark',
    wrapperClass: 'table-responsive-wrapper table-benchmark-wrapper',
    wrapperId: 'benchmark-table-wrapper',
    breakout: true,
    controls: '左右滑动查看全部法域',
    scrollHintId: 'table-scroll-hint-pill',
  },
  // 附录 B 关键主张—证据边界映射矩阵
  'tab:claims_evidence_mapping': {
    tableClass: 'standard-table table-claims-mapping',
    hint: (inner) => `${countDataRows(inner)} 项核心论断与证据映射`,
  },
  // 附录 A 全球 CCUS 项目分布与统计口径数据表
  'tab:global_ccus_distribution': {
    tableClass: 'table-dist-data',
    hint: '全球 6 大重点法域及其他地区汇总',
  },
};

/**
 * 表头单元格归一化：\shortstack 在预处理阶段被折叠为空格分隔，Pandoc 会渲染成
 * 一串相邻的 <strong> 片段，这里还原为 <br/> 换行并去掉内层 <strong>，
 * 使多行表头（如“已运行 / 项目记录数”）保持可读。
 */
function normalizeHeaderCells(inner) {
  return inner.replace(/<th\b([^>]*)>([\s\S]*?)<\/th>/g, (m, attrs, cell) => {
    const joined = cell
      .replace(/<\/strong>\s*<strong>/g, '<br/>')
      .replace(/<\/?strong>/g, '');
    return `<th${attrs}>${joined}</th>`;
  });
}

// 统计 tbody 数据行数（不含表头），用于“共 N 项”类说明 pill
function countDataRows(inner) {
  const body = inner.match(/<tbody>([\s\S]*)<\/tbody>/);
  return body ? (body[1].match(/<tr\b/g) || []).length : 0;
}

/**
 * 通用表头提升：若表格没有 <thead>，且 <tbody> 首行的所有单元格都是 <strong> 包裹，
 * 则把该行提升为 <thead>（longtable / tabularx 在 Pandoc 中的典型输出形态）。
 * 这样 TeX 侧即使新增表格也不会渲染出“无表头”的裸表。
 */
function ensureThead(inner) {
  if (/<thead>/.test(inner)) return inner;
  const bodyM = inner.match(/<tbody>([\s\S]*)<\/tbody>/);
  if (!bodyM) return inner;
  const rowM = bodyM[1].match(/^\s*(<tr\b[\s\S]*?<\/tr>)/);
  if (!rowM) return inner;
  const cells = [...rowM[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(
    (c) => c[1]
  );
  if (
    !cells.length ||
    !cells.every((c) => /^\s*<strong>[\s\S]*<\/strong>\s*$/.test(c))
  ) {
    return inner;
  }
  const thRow = rowM[1].replace(
    /<td\b([^>]*)>([\s\S]*?)<\/td>/g,
    '<th$1>$2</th>'
  );
  return inner.replace(
    bodyM[0],
    `<thead>\n            ${thRow}\n          </thead>\n          <tbody>${bodyM[1].slice(
      rowM[0].length
    )}</tbody>`
  );
}

// 3. 通用表格引擎：按文档顺序扫描全部 <table>，自动分配表号
//    （正文按章“表 N-x”，附录按“附录 X 表”），吸收紧随其后的注释段落，
//    并复用 Pandoc 生成的锚点（<div id="tab:*"> 或 <span id="tab:*">），不产生嵌套空壳。
const tableNumbering = new Map(); // label -> 表号文案
const tableTitleByLabel = new Map();

function topSectionNumberAt(index) {
  const before = bodyHtml.slice(0, index);
  let last = null;
  for (const m of before.matchAll(/<h1\s+data-number="([^"]+)"/g)) last = m[1];
  return last;
}

function badgeForTable(sectionNumber, chapterCounters) {
  const letter = sectionNumber && appendixSectionLetters[sectionNumber];
  if (letter) return `附录 ${letter} 表`;
  const chapter = sectionNumber && sectionNumber.match(/^(\d+)$/);
  if (!chapter) return null;
  const n = (chapterCounters.get(chapter[1]) || 0) + 1;
  chapterCounters.set(chapter[1], n);
  return `表 ${chapter[1]}-${n}`;
}

{
  const blocks = [];
  const re = /<table\b[^>]*>([\s\S]*?)<\/table>/g;
  let m;
  while ((m = re.exec(bodyHtml))) {
    blocks.push({
      start: m.index,
      end: m.index + m[0].length,
      inner: m[1],
    });
  }

  // 表号依赖文档顺序，必须正序算出全部元信息
  const chapterCounters = new Map();
  const metas = blocks.map((b) => {
    const capM = b.inner.match(/<caption>([\s\S]*?)<\/caption>/);
    let inner = capM ? b.inner.replace(capM[0], '') : b.inner;

    // 向前吸收锚点：<div id="tab:X">…<table> 或 <p><span id="tab:X"></span></p><table>
    const before = bodyHtml.slice(0, b.start);
    let regionStart = b.start;
    let label = null;
    let hadDivWrapper = false;
    const divM = before.match(/<div id="(tab:[^"]+)">\s*$/);
    const spanM = divM
      ? null
      : before.match(/<p><span id="(tab:[^"]+)"[^>]*><\/span><\/p>\s*$/);
    if (divM) {
      label = divM[1];
      hadDivWrapper = true;
      regionStart = b.start - divM[0].length;
    } else if (spanM) {
      label = spanM[1];
      regionStart = b.start - spanM[0].length;
    }

    // 计算需要闭合的包裹层深度（tab:X 外层 div + landscape/center 外层 div）
    let depth = hadDivWrapper ? 1 : 0;
    const outerM = bodyHtml
      .slice(0, regionStart)
      .match(/(?:<div class="(?:landscape|center)">\s*)+$/);
    if (outerM) {
      depth += (outerM[0].match(/<div /g) || []).length;
      regionStart -= outerM[0].length;
    }

    // 向后吸收注释段落与配对的闭合标签。
    // 注释可能落在 </table> 与 </div> 之间（对标表）或 </div> 之后（附录 A），
    // 两种顺序都要覆盖，否则注释会漏到正文里，形成版式不一致。
    let cursor = b.end;
    const notes = [];
    let closed = 0;
    for (;;) {
      const rest = bodyHtml.slice(cursor);
      const noteM = rest.match(/^\s*(<p\b[^>]*>[\s\S]*?<\/p>)/);
      if (noteM && isNoteBlock(noteM[1])) {
        notes.push(normalizeNote(noteM[1]));
        cursor += noteM[0].length;
        continue;
      }
      if (closed >= depth) break;
      const closeM = rest.match(/^\s*<\/div>/);
      if (!closeM) break;
      cursor += closeM[0].length;
      closed++;
    }
    if (closed < depth) {
      console.warn(
        `[sync-paper-report] ⚠️ 表格 ${label || '(无 label)'} 的包裹层未闭合，已按原样保留剩余标记。`
      );
    }

    // Pandoc 丢 caption 时回读 TeX（float 外的 \captionof 会被整段丢弃）
    let title = capM ? capM[1].trim() : '';
    if (!title && label) {
      const texCaption = texCaptionForLabel(texContent, label);
      if (texCaption) {
        title = texCaptionToText(texCaption);
        console.log(
          `[sync-paper-report] 已从 TeX 回读 ${label} 的表题: ${title}`
        );
      }
    }

    return {
      regionStart,
      regionEnd: cursor,
      inner: normalizeHeaderCells(ensureThead(inner)),
      title,
      noteHtml: notes.join(' '),
      label,
      badge: label
        ? badgeForTable(topSectionNumberAt(b.start), chapterCounters)
        : null,
    };
  });

  // 逆序替换，避免前面的替换影响后面的偏移
  for (let i = metas.length - 1; i >= 0; i--) {
    const meta = metas[i];
    const label = meta.label;
    const tweak = label ? tableTweaks[label] : null;
    const tableClass = (tweak && tweak.tableClass) || 'standard-table';
    const wrapperClass =
      (tweak && tweak.wrapperClass) || 'table-responsive-wrapper';
    const title = meta.title;

    if (!label) {
      console.warn(
        `[sync-paper-report] ⚠️ 存在无 \\label 的表格（caption="${title}"），将不注入表号锚点。`
      );
    }
    if (!title) {
      console.warn(
        `[sync-paper-report] ⚠️ 表格 ${label || '(无 label)'} 缺少 caption，将以空标题渲染。`
      );
    }
    if (!meta.badge) {
      console.warn(
        `[sync-paper-report] ⚠️ 表格 ${label || '(无 label)'} 未能确定表号（未识别所属章节）。`
      );
    }
    if (label && meta.badge) {
      tableNumbering.set(label, meta.badge);
      tableTitleByLabel.set(label, title);
    }

    const hint =
      tweak && tweak.hint
        ? typeof tweak.hint === 'function'
          ? tweak.hint(meta.inner)
          : tweak.hint
        : null;

    const controlsHtml =
      tweak && tweak.controls
        ? `
        <div class="table-card-controls">
          <span class="table-scroll-hint-pill"${
            tweak.scrollHintId ? ` id="${tweak.scrollHintId}"` : ''
          }>↔️ ${tweak.controls}</span>
          <div class="table-nav-btns">
            <button type="button" class="table-nav-btn" id="btn-scroll-table-left" title="向左滚动表格" aria-label="向左滚动">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button type="button" class="table-nav-btn" id="btn-scroll-table-right" title="向右滚动表格" aria-label="向右滚动">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>`
        : hint
          ? `<span class="table-scroll-hint-pill">${hint}</span>`
          : '';

    const cardHtml = `
    <div class="table-container-card${
      tweak && tweak.breakout ? ' table-breakout' : ''
    }"${label ? ` id="${label}"` : ''}>
      <div class="table-card-toolbar">
        <div class="table-card-title-group">
          ${meta.badge ? `<span class="table-badge">${meta.badge}</span>` : ''}
          <span class="table-title">${title}</span>
        </div>
        ${controlsHtml}
      </div>
      <div class="${wrapperClass}"${
        tweak && tweak.wrapperId ? ` id="${tweak.wrapperId}"` : ''
      }>
        <table class="${tableClass}">
          ${meta.inner}
        </table>
      </div>
      ${renderNote(meta.noteHtml, 'table-notes-footer')}
    </div>
  `;
    bodyHtml =
      bodyHtml.slice(0, meta.regionStart) +
      cardHtml +
      bodyHtml.slice(meta.regionEnd);
  }

  expectHits('表格卡片化', metas.length, countContentTables(texContent));
  console.log(
    `[sync-paper-report] 已卡片化 ${metas.length} 张表：${[
      ...tableNumbering.entries(),
    ]
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}`
  );
}

// TeX 中真正会产生表格的环境数量（tabular/tabularx/longtable），用于校验卡片化是否漏表。
// 封面 titlepage 内的 tabular 只是元数据排版（Pandoc 会整体丢弃），不计入内容表。
function countContentTables(tex) {
  const content = tex.replace(
    /\\begin\{titlepage\}[\s\S]*?\\end\{titlepage\}/g,
    ''
  );
  return (
    (content.match(/\\begin\{tabular\*?\}/g) || []).length +
    (content.match(/\\begin\{tabularx\}/g) || []).length +
    (content.match(/\\begin\{longtable\}/g) || []).length
  );
}

// 4. 图表交叉引用：按实际分配的图号/表号统一改写为可点击锚点。
//    TeX 原文写作“表~\ref{...}”“图~\ref{...}”，Pandoc 会生成独立链接，
//    因此需连同前置的“表/图/附录 X 表”一并替换，避免出现“表 表 2-1”式重复。
//    链接文字既可能是 Pandoc 解析出的序号，也可能是未解析的 [tab:xxx] 占位符。
function rewriteCrossRefs(entries, cssClass) {
  for (const [refLabel, { badge, title }] of entries) {
    bodyHtml = bodyHtml.replace(
      new RegExp(
        `(?:附录\\s*[A-Z]\\s*表|表|图)?[\\s\\u00a0]*<a\\s+href="#${escapeRegExp(
          refLabel
        )}"[^>]*>\\s*(?:\\d+|\\[[^\\]]*\\])\\s*<\\/a>`,
        'g'
      ),
      `<a href="#${refLabel}" class="${cssClass}" title="${attr(
        `点击查看${badge} ${title}`
      )}">${badge}</a>`
    );
  }
}
const tableRefs = [...tableNumbering.entries()].map(([k, badge]) => [
  k,
  { badge, title: tableTitleByLabel.get(k) || '' },
]);
rewriteCrossRefs(tableRefs, 'table-ref-link');
rewriteCrossRefs([...figureNumbering.entries()], 'fig-ref-link');
console.log(
  `[sync-paper-report] 已改写 ${tableNumbering.size + figureNumbering.size} 组图表交叉引用`
);

// --- 5. 深度处理参考文献与正文引用关联 ---
console.log(`[sync-paper-report] 正在构建精确参考文献引用索引与链接网络...`);

// 提取 Pandoc 输出中的 <div class="thebibliography">
const theBibMatch = bodyHtml.match(
  /<div class="thebibliography">([\s\S]*?)<\/div>/
);
let referencesHtml = '';

if (theBibMatch) {
  const pTags = [...theBibMatch[1].matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) =>
    m[1].trim()
  );

  // 建立 key -> { index, html, cleanText } 映射
  rawKeys.forEach((key, idx) => {
    const rawP = pTags[idx] || '';
    // 去除开头的 <span>99</span> 之类
    const cleanHtml = rawP.replace(/^<span>\d+<\/span>\s*/, '');
    const cleanText = cleanHtml.replace(/<[^>]+>/g, '');
    bibItemsMap.set(key, {
      index: idx + 1,
      key,
      html: cleanHtml,
      cleanText,
    });
  });

  // 构建全新的、带编号与反向锚点的参考文献列表
  const refListItems = rawKeys
    .map((key) => {
      const item = bibItemsMap.get(key);
      return `
      <div class="ref-item" id="ref-${key}">
        <div class="ref-badge-col">
          <span class="ref-badge">[${item.index}]</span>
        </div>
        <div class="ref-content-col">
          <div class="ref-body">${item.html}</div>
          <div class="ref-actions">
            <a href="#cite-return-${key}" class="ref-back-link" title="返回正文引用位置">↩ 返回正文</a>
          </div>
        </div>
      </div>
    `;
    })
    .join('\n');

  referencesHtml = `
    <section id="references-container" class="references-container">
      <h1 class="unnumbered" id="参考文献">
        参考文献 (References)
      </h1>
      <div class="references-list">
        ${refListItems}
      </div>
    </section>
  `;

  // 用全新的参考文献列表替换掉 Pandoc 的原始 thebibliography
  bodyHtml = bodyHtml.replace(
    /<div class="thebibliography">[\s\S]*?<\/div>/,
    referencesHtml
  );
}

// 替换正文中的空白引用 <span class="citation" data-cites="...">
let citationReplaceCount = 0;
// 每个文献键仅输出一次返回锚点，避免同一引文多处出现时产生重复 id 或断裂的反向链接
const returnAnchoredKeys = new Set();
bodyHtml = bodyHtml.replace(
  /<span\s+class="citation"\s+data-cites="([^"]+)">[\s\S]*?<\/span>/g,
  (match, citesStr) => {
    const keys = citesStr.trim().split(/\s+/);
    const validItems = keys.map((k) => bibItemsMap.get(k)).filter(Boolean);

    if (validItems.length === 0) {
      return `<span class="citation-unknown">[?]</span>`;
    }

    citationReplaceCount++;
    // 按引文序号从小到大排序
    validItems.sort((a, b) => a.index - b.index);

    // 格式化为紧凑合并上标，单个方括号包围：如 [1] 或 [80, 81] 或 [1, 2, 4, 34]
    const linksHtml = validItems
      .map((item) => {
        let returnAnchor = '';
        if (!returnAnchoredKeys.has(item.key)) {
          returnAnchoredKeys.add(item.key);
          returnAnchor = `id="cite-return-${item.key}"`;
        }
        return `<a class="cite-ref" href="#ref-${item.key}" data-cite="${item.key}" data-index="${item.index}" ${returnAnchor} title="${item.cleanText}">${item.index}</a>`;
      })
      .join('<span class="cite-sep">, </span>');

    return `<sup class="citation-cluster">[${linksHtml}]</sup>`;
  }
);

console.log(
  `[sync-paper-report] 成功将 ${citationReplaceCount} 处引用链接化，已连接至 ${bibItemsMap.size} 篇文献条目！`
);

// --- 6. 附录体系重构与关键术语/缩略语高阶排版 ---
console.log(
  `[sync-paper-report] 正在重塑附录体系 (${Object.keys(appendixSectionLetters)
    .map((num) => appendixSectionLetters[num])
    .join('/')}) 与规范化术语词典...`
);

// 1. 把正文末尾的附录章节重编号为 附录 A/B/C…
//    章节号与标题均取自 Pandoc 输出本身（appendixSectionLetters 已在前面按 TeX 的
//    \appendix 位置推导），脚本内不再硬编码章节号与标题，改版不会失配。
const appendixHeadings = [];
for (const [num, letter] of Object.entries(appendixSectionLetters)) {
  const re = new RegExp(
    `<h1\\s+data-number="${num}"([^>]*)><span class="header-section-number">${num}<\\/span>([\\s\\S]*?)<\\/h1>`
  );
  const m = bodyHtml.match(re);
  if (!m) {
    console.warn(
      `[sync-paper-report] ⚠️ 未找到章节 ${num} 的顶层标题，附录 ${letter} 编号跳过。`
    );
    continue;
  }
  const title = m[2].trim();
  bodyHtml = bodyHtml.replace(
    re,
    `<h1 data-number="附录 ${letter}" id="appendix-${letter.toLowerCase()}" class="appendix-h1"><span class="header-section-number">附录 ${letter}</span>${title ? ` ${title}` : ''}</h1>`
  );
  appendixHeadings.push({ letter, title });
}
expectHits(
  '附录重编号',
  appendixHeadings.length,
  Object.keys(appendixSectionLetters).length
);

/**
 * 消除“附录标题与其唯一表格 caption 语义重复”的视觉冗余。
 * 典型场景：附录 A 的章节名“全球 CCUS 项目分布与统计口径”与其表格 caption
 * “全球 CCUS 已运行及预计于 2026 年底前投运的在建项目记录分布”上下堆叠，
 * 读者会看到两个标题描述同一张表。规则：若某附录正文只包含一张表格卡片、
 * 没有其它段落，则章节标题只保留编号，标题语义交由表格卡片承载。
 */
for (const { letter } of appendixHeadings) {
  const headRe = new RegExp(
    `<h1 data-number="附录 ${letter}"[^>]*>[\\s\\S]*?<\\/h1>`
  );
  const hm = bodyHtml.match(headRe);
  if (!hm || hm.index === undefined) continue;
  const afterHead = hm.index + hm[0].length;
  const sectionEnd = bodyHtml.indexOf('</section>', afterHead);
  if (sectionEnd === -1) continue;
  const inner = bodyHtml.slice(afterHead, sectionEnd);
  const cardCount = (inner.match(/<div class="table-container-card"/g) || [])
    .length;
  const cardStart = inner.search(/<div class="table-container-card"/);
  if (cardCount !== 1 || cardStart === -1) continue;
  const cardEnd = findDivEnd(inner, cardStart);
  if (cardEnd === -1) continue;
  if (
    inner.slice(0, cardStart).trim() !== '' ||
    inner.slice(cardEnd).trim() !== ''
  ) {
    continue;
  }
  bodyHtml =
    bodyHtml.slice(0, hm.index) +
    `<h1 data-number="附录 ${letter}" id="appendix-${letter.toLowerCase()}" class="appendix-h1"><span class="header-section-number">附录 ${letter}</span></h1>` +
    bodyHtml.slice(afterHead);
  console.log(
    `[sync-paper-report] 附录 ${letter} 仅含一张表，章节标题已精简为“附录 ${letter}”，标题语义由表格卡片承载。`
  );
}

// 2. 重构术语/缩略语附录（description 环境 -> 可分类、可检索的紧凑学术规范表）
//    Pandoc 会丢弃 \item[词条] 的方括号标签（只剩释义），因此术语名与释义必须回到 TeX 原文提取；
//    这里按 \begin{description}…\end{description} 定位，不再硬编码章节标题，改版不会失配。
const descStart = texContent.indexOf('\\begin{description}');
const descEnd =
  descStart === -1 ? -1 : texContent.indexOf('\\end{description}', descStart);
if (descStart !== -1 && descEnd !== -1) {
  const termsSection = texContent.slice(descStart, descEnd);
  const termMatches = [
    ...termsSection.matchAll(/\\item\[([^\]]+)\]([\s\S]*?)(?=\\item\[|$)/g),
  ];

  if (termMatches.length > 0) {
    console.log(
      `[sync-paper-report] 成功提取到 ${termMatches.length} 个关键术语与缩略语，正在重构为紧凑学术规范表...`
    );

    let abbrCount = 0;
    let conceptCount = 0;

    const glossaryRows = termMatches
      .map((m) => {
        const rawName = m[1]
          .trim()
          .replace(/\\&/g, '&')
          .replace(/CO\$_2\$/g, 'CO<sub>2</sub>');
        let cleanDesc = m[2]
          .trim()
          .replace(/\\_/g, '_')
          .replace(/\\\$/g, '$')
          .replace(/CO\$_2\$/g, 'CO<sub>2</sub>')
          .replace(/CO\s*\\\(_{\s*2\s*}\\\)/g, 'CO<sub>2</sub>')
          .replace(/\\textbf\{([^{}]+)\}/g, '<strong>$1</strong>')
          .replace(/\\textit\{([^{}]+)\}/g, '<em>$1</em>')
          .replace(
            /\\url\{([^{}]+)\}/g,
            '<a href="$1" target="_blank" rel="noopener">$1</a>'
          )
          .replace(/\\cite\{[^{}]+\}/g, '')
          .replace(/\s+/g, ' ');

        const isAbbr =
          /^[A-Za-z0-9&/–-]{2,8}$/.test(rawName) ||
          [
            'VM0049',
            'NZIA',
            'DAS',
            'EOR',
            'CCER',
            'T&S',
            'RaC',
            'API',
            'FEED',
            'TIER',
            'AER',
            'NSTA',
            'MMV',
            'PISC',
            'MRV',
            'dMRV',
          ].includes(rawName);

        if (isAbbr) {
          abbrCount++;
        } else {
          conceptCount++;
        }

        const badgeText = isAbbr ? '缩略语' : '学术概念';
        const badgeClass = isAbbr ? 'badge-abbr' : 'badge-concept';
        const typeKey = isAbbr ? 'abbr' : 'concept';

        let lead = '';
        let sep = '';
        let rest = cleanDesc;

        if (cleanDesc.includes('；')) {
          const parts = cleanDesc.split('；');
          lead = parts[0].trim();
          sep = '；';
          rest = parts.slice(1).join('；').trim();
        } else if (cleanDesc.includes('，') && isAbbr) {
          const firstComma = cleanDesc.indexOf('，');
          lead = cleanDesc.slice(0, firstComma).trim();
          sep = '，';
          rest = cleanDesc.slice(firstComma + 1).trim();
        }

        const leadHtml = lead
          ? `<strong class="term-lead">${lead}</strong>${sep} `
          : '';
        const searchKeywords = `${rawName} ${lead} ${rest}`
          .toLowerCase()
          .replace(/"/g, '&quot;');

        return `
            <tr class="glossary-row" data-type="${typeKey}" data-keywords="${searchKeywords}">
              <td class="col-term-name">
                <span class="term-code">${rawName}</span>
              </td>
              <td class="col-term-type">
                <span class="glossary-badge ${badgeClass}">${badgeText}</span>
              </td>
              <td class="col-term-desc">
                ${leadHtml}<span class="term-body">${rest}</span>
              </td>
            </tr>`;
      })
      .join('\n');

    const newGlossaryHtml = `
  <div class="glossary-card-container" id="glossary-container">
    <div class="glossary-toolbar">
      <div class="glossary-filter-group" role="tablist" aria-label="术语分类过滤">
        <button type="button" class="glossary-tab active" data-filter="all" role="tab" aria-selected="true">全部 (${termMatches.length})</button>
        <button type="button" class="glossary-tab" data-filter="abbr" role="tab" aria-selected="false">缩略语 (${abbrCount})</button>
        <button type="button" class="glossary-tab" data-filter="concept" role="tab" aria-selected="false">核心学术概念 (${conceptCount})</button>
      </div>
      <div class="glossary-search-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="glossary-search" placeholder="搜索术语、缩写或释义..." aria-label="搜索术语">
        <button type="button" id="glossary-search-clear" style="display: none;" title="清空搜索" aria-label="清空搜索">✕</button>
      </div>
    </div>
    <div class="glossary-table-wrap" id="glossary-scroll-wrap">
      <table class="glossary-table" id="glossary-table">
        <thead>
          <tr>
            <th style="width: 175px;">术语 / 缩写</th>
            <th style="width: 88px;">类别</th>
            <th>规范全称与核心释义说明</th>
          </tr>
        </thead>
        <tbody id="glossary-tbody">
          ${glossaryRows}
        </tbody>
      </table>
      <div id="glossary-empty" class="glossary-empty" style="display: none;">
        未检索到与 "<span id="glossary-empty-query"></span>" 匹配的术语或缩略语
      </div>
    </div>
    <div class="glossary-footer">
      <span id="glossary-count-text">显示全部 ${termMatches.length} 项术语与缩略语规范</span>
      <button type="button" id="glossary-toggle-expand" class="glossary-btn-expand" title="切换完整展开与紧凑视图">
        <span id="glossary-expand-text">展开全部 (${termMatches.length} 项)</span>
        <svg id="glossary-expand-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
  </div>`;

    // 精确替换 description 块本身（description 内不含嵌套 div，非贪婪匹配即完整块），
    // 避免误伤其它同类容器。
    const descBlockRe = /<div class="description">[\s\S]*?<\/div>/;
    const descHit = descBlockRe.exec(bodyHtml);
    if (!descHit) {
      console.warn(
        `[sync-paper-report] ⚠️ 未在正文中定位到 description 容器，术语表未替换。`
      );
    } else {
      bodyHtml =
        bodyHtml.slice(0, descHit.index) +
        newGlossaryHtml +
        bodyHtml.slice(descHit.index + descHit[0].length);
      expectHits('术语表替换', 1, 1);
    }
  }
}

// --- 7. 视觉与版式深度精修 (Visual Hierarchy & Component Upgrades) ---
console.log(
  `[sync-paper-report] 正在执行正文版式精修（图文摘要卡片、阶段路线图与政策建议标题）...`
);

// 1. 移除 Pandoc 冗余 titlepage 与重复关键词，注入高保真图文摘要卡片 (Graphical Abstract)
// 图片文件名不再硬编码：TeX 侧从“图文摘要2.png”改到“图文摘要4.png”时，
// 旧实现整条正则失配 -> titlepage 空壳残留、卡片消失、关键词重复、注掉进正文。
// 现在按“titlepage + 关键词段 + 首张图文摘要图片”的结构识别，与文件名无关。
const gaRegex =
  /<div class="titlepage">[\s\S]*?<\/div>\s*<p><strong>关键词[：:]<\/strong>[\s\S]*?<\/p>\s*(<p><img\b[^>]*\ssrc="([^"]+)"[^>]*\/?><\/p>)(?:\s*(<p\b[^>]*>[\s\S]*?<\/p>))?/;
const gaMatched = gaRegex.test(bodyHtml);
if (!gaMatched) {
  console.warn(
    `[sync-paper-report] ⚠️ 未定位到图文摘要区（titlepage/关键词/首图），页面将保留 Pandoc 默认摘要块。`
  );
}
bodyHtml = bodyHtml.replace(gaRegex, (match, imgTag, src, trailingP) => {
  const gaNoteHtml =
    trailingP && isNoteBlock(trailingP)
      ? renderNote(normalizeNote(trailingP), 'figure-notes ga-notes')
      : '';
  return `
<div class="graphical-abstract-card" id="graphical-abstract">
  <div class="ga-header">
    <div class="ga-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      <span>图文摘要 (Graphical Abstract)</span>
    </div>
    <span class="ga-tip">🔍 点击图片可放大高清原图</span>
  </div>
  <div class="ga-img-wrap">
    <img src="${src}" alt="${attr('CCUS 规模化治理与 dMRV 架构图文摘要')}" />
  </div>${gaNoteHtml}
</div>`;
});
expectHits('图文摘要卡片', gaMatched ? 1 : 0, 1);

// 2. 重构阶段描述为“三阶段演化路线图” (.roadmap-container)
//    阶段标题直接取自 \paragraph 小标题原文，不再在脚本里另写一份文案。
//    必须在剥离 \paragraph 伪编号之前执行：编号是本步骤唯一的定位依据。
const roadmapStageRe =
  /<h4\s+data-number="(\d+)\.0\.0\.(\d+)"[^>]*>([\s\S]*?)<\/h4>\s*<p>([\s\S]*?)<\/p>/g;
const roadmapStages = [];
let rm;
while ((rm = roadmapStageRe.exec(bodyHtml))) {
  roadmapStages.push({
    num: Number(rm[2]),
    title: rm[3]
      .replace(/<span\s+class="header-section-number">[\s\S]*?<\/span>/, '')
      .replace(/[。.]\s*$/, '')
      .trim(),
    desc: rm[4],
    start: rm.index,
    end: rm.index + rm[0].length,
  });
}
const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

if (roadmapStages.length >= 2) {
  const cards = roadmapStages
    .map((s, i) => {
      const n = i + 1;
      return `
      <div class="roadmap-card stage-${n}">
        <div class="roadmap-step">
          <span class="step-num">${String(n).padStart(2, '0')}</span>
          <span class="step-phase">阶段${CN_NUM[i] || n}</span>
        </div>
        <div class="roadmap-content">
          <h4 class="stage-title">${s.title}</h4>
          <p class="stage-desc">${s.desc}</p>
        </div>
      </div>`;
    })
    .join('\n');
  const roadmapHtml = `
    <div class="roadmap-container">
${cards}
    </div>
  `;
  // 用收集到的区间整体替换，避免正则再写一遍章节号
  bodyHtml =
    bodyHtml.slice(0, roadmapStages[0].start) +
    roadmapHtml +
    bodyHtml.slice(roadmapStages[roadmapStages.length - 1].end);
  expectHits('三阶段路线图', roadmapStages.length, 3);
}

// 3. 将伪 4 级标题（TeX \paragraph，Pandoc 编号形如 1.4.0.1）还原为无编号小标题。
//    LaTeX 的 \paragraph 本身不带编号，"1.4.0.1" 这类编号是 --number-sections 的产物，
//    直接显示既冗余又难看，因此移除编号徽标、保留标题文字。
let unnumberedParagraphs = 0;
bodyHtml = bodyHtml.replace(
  /<h4\s+data-number="\d+\.\d+\.0\.\d+"([^>]*)>([\s\S]*?)<\/h4>/g,
  (match, attrs, inner) => {
    unnumberedParagraphs++;
    const title = inner
      .replace(/<span\s+class="header-section-number">[\s\S]*?<\/span>/, '')
      .trim();
    return `<h4${attrs}>${title}</h4>`;
  }
);
console.log(
  `[sync-paper-report] 已还原 ${unnumberedParagraphs} 个 \\paragraph 小标题（移除伪编号）`
);

// 4. 统一政策建议章节标题的版式与间距（不注入冗余编号徽章）
//    按标题语义（以“政策建议”开头）识别，不再硬编码章节号与 Pandoc 生成的 id。
let policyHeadings = 0;
bodyHtml = bodyHtml.replace(
  /<h2\s+data-number="([^"]+)"([^>]*)><span\s+class="header-section-number">[^<]*<\/span>\s*([^<]*政策建议[^<]*)<\/h2>/g,
  (m, num, attrs, title) => {
    policyHeadings++;
    return `
      <h2 data-number="${num}"${attrs} class="policy-rec-heading">
        <span class="header-section-number">${num}</span>
        <span class="policy-title">${title.trim()}</span>
      </h2>
    `;
  }
);
console.log(`[sync-paper-report] 已统一 ${policyHeadings} 个政策建议标题版式`);

// 7. 美化文末 Footnotes 脚注容器
bodyHtml = bodyHtml.replace(
  /<section id="footnotes"[\s\S]*?<hr \/>/,
  `
  <section id="footnotes" class="footnotes footnotes-end-of-document" role="doc-endnotes">
    <div class="footnotes-header">
      <span class="footnotes-title">📑 脚注说明 (Footnotes)</span>
    </div>
`
);

// ============================================================================
// 结构自检（写盘前的硬门禁）
//
// 背景：本脚本过去所有版面改写都是“正则静默 no-op”——TeX 改版后一旦失配就
// 原样跳过、不报错、不计数，导致页面静默腐烂并直接上线。已实际发生过的后果：
//   · 图文摘要卡片整体消失（文件名从 图文摘要2.png 改为 图文摘要4.png）
//   · 图 2 丢失图头（img 与 figcaption 之间多了“注：”段落）
//   · 表 5-1 无表头（新表未登记进硬编码映射）
// 现在改为两道闸：(1) 上面各步骤登记的命中数必须与 TeX 实际数量一致；
// (2) 由 lib/report-structure.mjs 对最终正文做结构体检。
// 任何一项不通过即退出码 1，绝不产出页面。
// ============================================================================

// 统计字数
const pureText = bodyHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, '');
const charCount = pureText.length;
const readMinutes = Math.max(1, Math.round(charCount / 800));

// --- 6. 生成现代学术级 HTML 模板 ---
const template = `<!DOCTYPE html>
<html lang="zh-CN" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${docTitle} | CCUS Policy Hub</title>
  <meta name="description" content="${programName}：${docTitle}" />
  <meta name="paper-source" content="paper_draft.tex sha256:${texSha}" />
  
  <!-- MathJax 3 实时渲染公式 -->
  <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml-full.js" id="MathJax-script" async></script>
  
  <!-- 现代精美学术字体 -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;600;700;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  
  <style>
    :root {
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-serif: 'Noto Serif SC', 'Source Han Serif SC', Georgia, serif;
      --font-mono: 'JetBrains Mono', monospace;
      
      --bg-primary: #ffffff;
      --bg-secondary: #f8fafc;
      --bg-tertiary: #f1f5f9;
      --text-main: #1e293b;
      --text-muted: #64748b;
      --text-light: #94a3b8;
      --border-color: #e2e8f0;
      --brand-blue: #2563eb;
      --brand-blue-hover: #1d4ed8;
      --brand-emerald: #059669;
      --card-bg: #ffffff;
      --table-header: #f8fafc;
      --table-stripe: #fafbfd;
      --table-border: #e2e8f0;
      --popover-bg: #0f172a;
      --popover-text: #f8fafc;
      --highlight-flash: rgba(37, 99, 235, 0.15);
    }

    [data-theme="dark"] {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-tertiary: #334155;
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --text-light: #64748b;
      --border-color: #334155;
      --brand-blue: #3b82f6;
      --brand-blue-hover: #60a5fa;
      --brand-emerald: #10b981;
      --card-bg: #1e293b;
      --table-header: #1e293b;
      --table-stripe: #151e2e;
      --table-border: #334155;
      --popover-bg: #1e293b;
      --popover-text: #f1f5f9;
      --highlight-flash: rgba(59, 130, 246, 0.25);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-primary);
      color: var(--text-main);
      font-family: var(--font-sans);
      line-height: 1.85;
      font-size: 16.5px;
      transition: background-color 0.2s, color 0.2s;
    }

    /* 可访问性：键盘焦点环与文本选区配色 */
    :focus-visible {
      outline: 2px solid var(--brand-blue);
      outline-offset: 2px;
      border-radius: 3px;
    }
    ::selection {
      background: rgba(37, 99, 235, 0.22);
    }
    [data-theme="dark"] ::selection {
      background: rgba(59, 130, 246, 0.38);
    }

    /* 顶部滚动进度指示条 */
    #progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      height: 3.5px;
      background: linear-gradient(90deg, #2563eb, #10b981);
      width: 0%;
      z-index: 9999;
      transition: width 0.08s ease-out;
    }

    /* 顶部导航 Navbar */
    .navbar {
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(12px);
      background-color: rgba(255, 255, 255, 0.88);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 2rem;
    }
    [data-theme="dark"] .navbar {
      background-color: rgba(15, 23, 42, 0.88);
    }
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: var(--text-main);
      font-weight: 700;
      font-size: 1.05rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(37, 99, 235, 0.1);
      color: var(--brand-blue);
      border: 1px solid rgba(37, 99, 235, 0.2);
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.9rem;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid var(--border-color);
      background: var(--bg-primary);
      color: var(--text-main);
      transition: all 0.15s ease;
    }
    .btn:hover {
      background: var(--bg-tertiary);
    }
    .btn-primary {
      background: var(--brand-blue);
      color: #ffffff;
      border-color: var(--brand-blue);
    }
    .btn-primary:hover {
      background: var(--brand-blue-hover);
    }

    /* 移动端点导航收敛：图标优先、单行不换行、隐藏冗余文字 */
    @media (max-width: 768px) {
      .navbar {
        padding: 0.5rem 0.85rem;
        gap: 0.5rem;
        flex-wrap: nowrap;
      }
      .nav-brand {
        gap: 0.45rem;
        font-size: 0.95rem;
        min-width: 0;
        white-space: nowrap;
      }
      .nav-brand .badge { display: none; }
      .nav-actions { gap: 0.4rem; flex-shrink: 0; }
      .navbar .btn {
        padding: 0.45rem;
        min-width: 38px;
        min-height: 38px;
        justify-content: center;
        gap: 0;
      }
      .btn-label { display: none; }
      .reading-stats { flex-wrap: wrap; row-gap: 0.45rem; }
      .ga-header { flex-wrap: wrap; }
      .figure-header { flex-wrap: wrap; }
    }
    .brand-text-short { display: none; }
    @media (max-width: 400px) {
      .nav-brand .brand-text { display: none; }
      .nav-brand .brand-text-short { display: inline; }
    }

    /* 主布局 Layout */
    .container {
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      position: relative;
    }

    /* 左侧大纲导航 (TOC) */
    .toc-sidebar {
      width: 320px;
      flex-shrink: 0;
      position: sticky;
      top: 57px;
      height: calc(100vh - 57px);
      overflow-y: auto;
      padding: 2.2rem 1.5rem 2rem 2rem;
      border-right: 1px solid var(--border-color);
      transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1),
                  padding 0.28s cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 0.2s ease;
    }
    @media (max-width: 1024px) {
      .toc-sidebar { display: none !important; }
      #btn-toggle-toc { display: none !important; }
      #btn-float-expand-toc { display: none !important; }
    }
    body.toc-collapsed .toc-sidebar {
      width: 0 !important;
      min-width: 0 !important;
      padding: 0 !important;
      border-right-color: transparent !important;
      overflow: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      visibility: hidden;
    }
    .toc-title {
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      font-weight: 700;
      margin-bottom: 1.2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .toc-collapse-icon-btn {
      background: none;
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      border-radius: 0.375rem;
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .toc-collapse-icon-btn:hover {
      color: var(--brand-blue);
      border-color: var(--brand-blue);
      background: var(--bg-secondary);
    }
    .floating-toc-tab {
      position: fixed;
      left: 0;
      top: 100px;
      z-index: 50;
      display: none;
      align-items: center;
      gap: 6px;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-left: none;
      padding: 0.5rem 0.75rem 0.5rem 0.55rem;
      border-radius: 0 0.5rem 0.5rem 0;
      box-shadow: 2px 4px 14px rgba(0, 0, 0, 0.08);
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--brand-blue);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .floating-toc-tab:hover {
      background: var(--bg-secondary);
      transform: translateX(3px);
      box-shadow: 3px 6px 18px rgba(37, 99, 235, 0.18);
    }
    .toc-nav ul {
      list-style: none;
      padding-left: 0;
    }
    .toc-nav li {
      margin-bottom: 0.35rem;
    }
    .toc-nav a {
      display: block;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.88rem;
      line-height: 1.45;
      padding: 0.35rem 0.6rem;
      border-radius: 0.375rem;
      transition: all 0.15s ease;
      border-left: 2px solid transparent;
    }
    .toc-nav a:hover {
      color: var(--brand-blue);
      background: var(--bg-secondary);
    }
    .toc-nav a.active {
      color: var(--brand-blue);
      font-weight: 600;
      background: rgba(37, 99, 235, 0.08);
      border-left-color: var(--brand-blue);
    }
    .toc-nav .toc-h1 {
      font-weight: 600;
      color: var(--text-main);
    }
    .toc-nav .toc-h2 {
      padding-left: 1.3rem;
      font-size: 0.82rem;
    }
    .toc-nav .toc-h3 {
      padding-left: 2.2rem;
      font-size: 0.78rem;
      color: var(--text-light);
    }

    /* 正文主区域 */
    .article-wrap {
      flex: 1;
      min-width: 0;
      padding: 3.5rem 4.5rem 6rem;
      max-width: 980px;
      margin: 0 auto;
      transition: max-width 0.28s cubic-bezier(0.4, 0, 0.2, 1), padding 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    }
    body.toc-collapsed .article-wrap {
      max-width: 1320px;
      padding: 3.5rem 3.5rem 6rem;
    }
    @media (max-width: 768px) {
      .article-wrap {
        padding: 1.5rem 1.25rem 4rem;
      }
      .graphical-abstract-card, .academic-figure, figure {
        max-width: 100%;
        margin: 1.75rem auto;
      }
      .ga-img-wrap img, .figure-img-wrap img, figure img, p img {
        max-height: 380px;
      }
    }

    /* 报告封面 Hero */
    .paper-hero {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 2.5rem;
      margin-bottom: 3rem;
    }
    .paper-type {
      color: var(--brand-blue);
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.6rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .paper-title {
      font-family: var(--font-serif);
      font-size: 2.25rem;
      font-weight: 900;
      line-height: 1.35;
      color: var(--text-main);
      margin-bottom: 1.3rem;
    }
    .paper-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      font-size: 0.92rem;
      color: var(--text-muted);
      margin-bottom: 1.5rem;
    }
    .meta-item strong {
      color: var(--text-main);
    }
    .reading-stats {
      display: inline-flex;
      gap: 1rem;
      font-size: 0.82rem;
      color: var(--text-muted);
      background: var(--bg-tertiary);
      padding: 0.35rem 0.8rem;
      border-radius: 0.5rem;
      margin-bottom: 2rem;
    }
    .reading-stats span {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .reading-stats svg {
      color: var(--brand-blue);
      flex-shrink: 0;
    }

    /* 锚点跳转时为吸顶导航预留空间，避免目标内容被遮挡 */
    figure, .academic-figure, .table-container-card, .graphical-abstract-card,
    .references-container, .glossary-card-container {
      scroll-margin-top: 72px;
    }

    /* 移动端封面版式：标题与元信息更紧凑 */
    @media (max-width: 768px) {
      .paper-hero {
        padding-bottom: 1.75rem;
        margin-bottom: 2.25rem;
      }
      .paper-title {
        font-size: 1.6rem;
        line-height: 1.42;
        margin-bottom: 1rem;
      }
      .paper-meta {
        gap: 0.4rem 1.25rem;
        font-size: 0.88rem;
        margin-bottom: 1.25rem;
      }
    }

    /* 摘要卡片 */
    .abstract-box {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-left: 4px solid var(--brand-blue);
      border-radius: 0.75rem;
      padding: 1.5rem 1.75rem;
      margin-bottom: 2rem;
    }
    .abstract-title {
      font-weight: 700;
      font-size: 1rem;
      color: var(--brand-blue);
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .abstract-content {
      font-size: 0.96rem;
      color: var(--text-main);
      line-height: 1.85;
      text-align: justify;
    }
    .keywords {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px dashed var(--border-color);
      font-size: 0.88rem;
      color: var(--text-muted);
    }

    /* 正文标准学术排版 */
    .article-content {
      font-family: var(--font-serif);
      font-size: 17px;
      color: var(--text-main);
    }
    .article-content h1 {
      font-family: var(--font-sans);
      font-size: 1.65rem;
      font-weight: 800;
      margin-top: 3.5rem;
      margin-bottom: 1.25rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--border-color);
      color: var(--text-main);
      scroll-margin-top: 80px;
      display: flex;
      align-items: baseline;
    }
    .article-content h2 {
      font-family: var(--font-sans);
      font-size: 1.35rem;
      font-weight: 700;
      margin-top: 2.5rem;
      margin-bottom: 1rem;
      color: var(--text-main);
      scroll-margin-top: 80px;
      display: flex;
      align-items: baseline;
    }
    .article-content h3 {
      font-family: var(--font-sans);
      font-size: 1.12rem;
      font-weight: 600;
      margin-top: 2rem;
      margin-bottom: 0.75rem;
      color: var(--text-main);
      scroll-margin-top: 80px;
      display: flex;
      align-items: baseline;
    }
    /* \\paragraph 级小标题（TeX 中本身不带编号） */
    .article-content h4 {
      font-family: var(--font-sans);
      font-size: 1.02rem;
      font-weight: 700;
      margin-top: 1.75rem;
      margin-bottom: 0.6rem;
      padding-left: 0.75rem;
      border-left: 3px solid var(--brand-blue);
      color: var(--text-main);
      line-height: 1.5;
      scroll-margin-top: 80px;
    }
    .article-content h4 + p {
      margin-top: 0;
    }
    /* 路线图卡片内的阶段标题不重复左侧色条 */
    .roadmap-content h4.stage-title {
      border-left: none;
      padding-left: 0;
      margin-top: 0;
      font-size: 1.05rem;
    }

    /* 章节数字徽章样式 (Header Number Badge) */
    .header-section-number {
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--brand-blue);
      margin-right: 0.65rem;
      font-size: 0.9em;
      flex-shrink: 0;
    }
    h1 .header-section-number {
      background: rgba(37, 99, 235, 0.08);
      padding: 0.15rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.85em;
    }

    .article-content p {
      margin-bottom: 1.45rem;
      line-height: 1.95;
      text-indent: 2em;
      text-align: justify;
    }
    .article-content ul, .article-content ol {
      margin-bottom: 1.45rem;
      padding-left: 2rem;
    }
    .article-content li {
      margin-bottom: 0.5rem;
      line-height: 1.85;
    }

    /* 图表 Figure 通用约束与居中排版 */
    figure {
      max-width: 900px;
      margin: 2.75rem auto;
      text-align: center;
      position: relative;
    }
    figure img, p img {
      max-width: 100%;
      max-height: 560px;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 0.5rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      border: 1px solid var(--border-color);
      display: block;
      margin: 0 auto;
      cursor: zoom-in;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    figure img:hover, p img:hover {
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.14);
    }
    figcaption {
      font-family: var(--font-sans);
      font-size: 0.88rem;
      font-weight: 500;
      color: var(--text-muted);
      margin-top: 0.85rem;
      text-align: center;
    }

    /* 表格容器与现代数据表排版 */
    .table-container-card {
      background: var(--card-bg);
      border: 1px solid var(--table-border);
      border-radius: 0.75rem;
      margin: 2.75rem 0;
      overflow: hidden;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .table-container-card:hover {
      box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.08);
    }
    [data-theme="dark"] .table-container-card {
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.35);
    }

    /* 卡片顶部工具栏 */
    .table-card-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem;
      background: var(--table-header);
      border-bottom: 1px solid var(--table-border);
    }
    .table-card-title-group {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .table-badge {
      background: var(--brand-blue);
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
      font-family: var(--font-mono);
      letter-spacing: 0.02em;
    }
    .table-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-main);
      font-family: var(--font-sans);
    }
    .table-card-controls {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .table-scroll-hint-pill {
      font-size: 0.75rem;
      color: var(--text-muted);
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-family: var(--font-sans);
      transition: all 0.2s ease;
    }
    .table-nav-btns {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .table-nav-btn {
      width: 28px;
      height: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.375rem;
      border: 1px solid var(--border-color);
      background: var(--bg-primary);
      color: var(--text-main);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .table-nav-btn:hover:not(:disabled) {
      background: var(--brand-blue);
      color: #ffffff;
      border-color: var(--brand-blue);
    }

    .table-responsive-wrapper {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin: 2.5rem 0;
      border-radius: 0.75rem;
      border: 1px solid var(--table-border);
      background: var(--card-bg);
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
    }
    .table-benchmark-wrapper {
      margin: 0 !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      scroll-behavior: smooth;
    }

    /* 精美平滑自定义横向滚动条 */
    .table-responsive-wrapper::-webkit-scrollbar,
    .table-benchmark-wrapper::-webkit-scrollbar {
      height: 6px;
    }
    .table-responsive-wrapper::-webkit-scrollbar-track,
    .table-benchmark-wrapper::-webkit-scrollbar-track {
      background: var(--bg-tertiary);
    }
    .table-responsive-wrapper::-webkit-scrollbar-thumb,
    .table-benchmark-wrapper::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 999px;
    }
    [data-theme="dark"] .table-responsive-wrapper::-webkit-scrollbar-thumb,
    [data-theme="dark"] .table-benchmark-wrapper::-webkit-scrollbar-thumb {
      background: #475569;
    }
    .table-responsive-wrapper::-webkit-scrollbar-thumb:hover,
    .table-benchmark-wrapper::-webkit-scrollbar-thumb:hover {
      background: var(--brand-blue);
    }

    /* 宽屏下横向扩展显示 (Breakout) */
    @media (min-width: 1280px) {
      .table-breakout {
        margin-left: -5vw;
        margin-right: -5vw;
        width: calc(100% + 10vw);
        max-width: 1380px;
      }
    }
    body.toc-collapsed .table-breakout {
      margin-left: 0;
      margin-right: 0;
      width: 100%;
      max-width: 100%;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-family: var(--font-sans);
      font-size: 0.88rem;
      min-width: 780px;
    }
    table caption {
      font-family: var(--font-sans);
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-main);
      padding: 1rem 1.25rem 0.6rem;
      text-align: left;
      background: var(--table-header);
      border-bottom: 1px solid var(--table-border);
    }
    th {
      background-color: var(--table-header);
      color: var(--text-main);
      font-weight: 700;
      padding: 0.85rem 1rem;
      border-bottom: 2px solid var(--table-border);
      text-align: left;
      font-size: 0.86rem;
    }
    td {
      padding: 0.8rem 1rem;
      border-bottom: 1px solid var(--table-border);
      color: var(--text-main);
      line-height: 1.65;
    }
    tr:nth-child(even) td {
      background-color: var(--table-stripe);
    }
    tr:hover td {
      background-color: rgba(37, 99, 235, 0.04);
    }

    /* 针对全球 CCUS 治理对标表 (tab:governance_benchmark) 专属紧凑对标排版 */
    .table-benchmark {
      min-width: 1220px !important;
      width: 100% !important;
      border-collapse: collapse;
      table-layout: fixed;
    }
    /* 首行：表头整体紧凑高密度 */
    .table-benchmark th {
      padding: 0.52rem 0.75rem !important;
      font-size: 0.82rem !important;
      line-height: 1.35 !important;
      background-color: var(--table-header);
      color: var(--text-main);
      border-bottom: 2px solid var(--table-border);
      font-weight: 700;
      white-space: nowrap;
    }
    /* 首列：窄一点 (从 180px 窄缩至 112px)，且固定置顶 */
    .table-benchmark th:first-child,
    .table-benchmark td:first-child {
      width: 112px !important;
      min-width: 112px !important;
      max-width: 112px !important;
      font-size: 0.8rem !important;
      line-height: 1.35 !important;
      padding: 0.55rem 0.65rem !important;
      font-weight: 700;
      background: var(--bg-tertiary);
      color: var(--text-main);
      position: sticky;
      left: 0;
      z-index: 10;
      border-right: 1px solid var(--table-border);
      box-shadow: 4px 0 8px -2px rgba(0, 0, 0, 0.07);
      white-space: normal;
      word-break: break-word;
    }
    [data-theme="dark"] .table-benchmark th:first-child,
    [data-theme="dark"] .table-benchmark td:first-child {
      background: #1e293b;
      box-shadow: 4px 0 8px -2px rgba(0, 0, 0, 0.35);
    }
    /* 其它 6 国列：每个法域分配 185px (紧凑舒适) */
    .table-benchmark th:not(:first-child),
    .table-benchmark td:not(:first-child) {
      width: 185px !important;
      min-width: 185px !important;
      vertical-align: top;
      font-size: 0.81rem !important;
      line-height: 1.55 !important;
      padding: 0.6rem 0.8rem !important;
      border-bottom: 1px solid var(--table-border);
      border-right: 1px solid var(--border-color);
    }
    .table-benchmark th:not(:first-child) {
      text-align: left;
    }
    .table-benchmark tr:nth-child(even) td:not(:first-child) {
      background-color: var(--table-stripe);
    }
    .table-benchmark tr:hover td:not(:first-child) {
      background-color: rgba(37, 99, 235, 0.04);
    }

    /* 表格卡片底部说明 */
    .table-notes-footer {
      padding: 0.85rem 1.25rem;
      background: var(--bg-secondary);
      border-top: 1px solid var(--table-border);
      font-size: 0.8rem;
      color: var(--text-muted);
      line-height: 1.65;
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }
    .table-notes-footer .note-tag {
      background: var(--border-color);
      color: var(--text-main);
      padding: 0.15rem 0.45rem;
      border-radius: 0.25rem;
      font-size: 0.72rem;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .table-notes-footer .note-text {
      flex: 1;
    }

    /* 附录 A 全球 CCUS 项目分布与统计口径数据表专属样式 */
    .table-dist-data {
      width: 100% !important;
      border-collapse: collapse;
      min-width: 820px;
    }
    .table-dist-data th {
      text-align: center;
      padding: 0.65rem 0.8rem;
      font-size: 0.84rem;
      line-height: 1.35;
      background: var(--table-header);
      border-bottom: 2px solid var(--table-border);
      font-weight: 700;
    }
    .table-dist-data th:first-child {
      text-align: left;
    }
    .table-dist-data td {
      padding: 0.75rem 0.8rem;
      font-size: 0.88rem;
      border-bottom: 1px solid var(--table-border);
    }
    .table-dist-data td:not(:first-child) {
      text-align: center;
      font-variant-numeric: tabular-nums;
      font-family: var(--font-mono);
      font-size: 0.86rem;
    }
    .table-dist-data tr:last-child td {
      background: var(--bg-tertiary);
      font-weight: 700;
      border-top: 2px solid var(--table-border);
      border-bottom: none;
    }

    /* 卡片内表格滚动容器：去掉与卡片重复的边框/外边距，避免双层框与空档 */
    .table-container-card .table-responsive-wrapper {
      margin: 0;
      border: none;
      border-radius: 0;
      box-shadow: none;
    }

    /* 附录 B 关键主张与证据边界映射表专属样式 */
    .table-claims-mapping {
      width: 100% !important;
      border-collapse: collapse;
      min-width: 920px;
      table-layout: fixed;
    }
    /* 四列宽度比例：表头由 ensureThead 从 TeX 提升而来，比例统一在 CSS 维护 */
    .table-claims-mapping th:nth-child(1) { width: 22%; }
    .table-claims-mapping th:nth-child(2) { width: 26%; }
    .table-claims-mapping th:nth-child(3) { width: 24%; }
    .table-claims-mapping th:nth-child(4) { width: 28%; }
    .table-claims-mapping th {
      background: var(--table-header);
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
      font-weight: 700;
      border-bottom: 2px solid var(--table-border);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
    }
    .table-claims-mapping td {
      padding: 0.95rem 1.1rem;
      font-size: 0.88rem;
      line-height: 1.65;
      vertical-align: top;
      border-bottom: 1px solid var(--table-border);
    }
    .table-claims-mapping td:first-child {
      font-weight: 600;
      color: var(--text-main);
      background-color: rgba(37, 99, 235, 0.02);
    }
    [data-theme="dark"] .table-claims-mapping td:first-child {
      background-color: rgba(59, 130, 246, 0.04);
    }
    .table-claims-mapping td:nth-child(2) {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .table-claims-mapping td:nth-child(3) {
      font-size: 0.85rem;
    }
    .table-claims-mapping td:nth-child(4) {
      font-size: 0.85rem;
      line-height: 1.6;
    }

    .table-ref-link {
      color: var(--brand-blue);
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    /* --- 核心优化：高保真超紧凑学术引文系统 (Ultra-Compact Citation System) --- */
    .citation-cluster {
      font-family: var(--font-sans);
      font-size: 0.72em;
      vertical-align: super;
      line-height: 0;
      margin: 0 1px;
      color: var(--brand-blue);
      letter-spacing: -0.01em;
      user-select: none;
    }
    .cite-ref {
      display: inline;
      color: var(--brand-blue);
      text-decoration: none;
      font-weight: 600;
      padding: 0 1px;
      margin: 0;
      transition: color 0.15s ease, background-color 0.15s ease;
      cursor: pointer;
    }
    .cite-ref:hover {
      color: var(--brand-blue-hover);
      text-decoration: underline;
      background: rgba(37, 99, 235, 0.1);
      border-radius: 2px;
    }
    .cite-sep {
      color: var(--text-muted);
      margin: 0 1px;
      font-weight: 400;
    }

    /* 悬浮即时引用卡片 (Citation Popover) */
    #citation-popover {
      position: absolute;
      display: none;
      max-width: 420px;
      padding: 0.85rem 1.1rem;
      background: var(--popover-bg);
      color: var(--popover-text);
      font-family: var(--font-sans);
      font-size: 0.84rem;
      line-height: 1.55;
      border-radius: 0.6rem;
      box-shadow: 0 12px 30px -5px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      pointer-events: auto;
      border: 1px solid var(--border-color);
      transition: opacity 0.15s ease;
    }
    #citation-popover .popover-index {
      color: #60a5fa;
      font-family: var(--font-mono);
      font-weight: 700;
      margin-right: 0.4rem;
    }
    #citation-popover a {
      color: #93c5fd;
      word-break: break-all;
    }

    /* 文末参考文献容器与条目紧凑排版 */
    .references-container {
      margin-top: 4rem;
      padding-top: 2rem;
      border-top: 2px solid var(--border-color);
    }
    .references-list {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      margin-top: 1.25rem;
    }
    .ref-item {
      display: flex;
      gap: 0.85rem;
      padding: 0.5rem 0.85rem;
      border-radius: 0.5rem;
      background: var(--bg-secondary);
      border: 1px solid transparent;
      font-family: var(--font-sans);
      font-size: 0.84rem;
      line-height: 1.55;
      transition: all 0.2s ease;
      scroll-margin-top: 90px;
    }
    .ref-item:hover {
      border-color: var(--border-color);
      background: var(--bg-tertiary);
    }
    .ref-item:target, .ref-item.highlight-flash {
      background: var(--highlight-flash);
      border-color: var(--brand-blue);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
      animation: pulse-border 1.5s ease-out;
    }
    @keyframes pulse-border {
      0% { transform: scale(1.01); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }
    .ref-badge {
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--brand-blue);
      background: rgba(37, 99, 235, 0.08);
      padding: 0.12rem 0.4rem;
      border-radius: 0.3rem;
      font-size: 0.78rem;
      white-space: nowrap;
      height: fit-content;
      margin-top: 1px;
    }
    .ref-content-col {
      flex: 1;
    }
    .ref-body {
      color: var(--text-main);
      text-indent: 0;
    }
    .ref-body a {
      color: var(--brand-blue);
      word-break: break-all;
    }
    .ref-actions {
      margin-top: 0.25rem;
    }
    .ref-back-link {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-decoration: none;
      font-weight: 500;
    }
    .ref-back-link:hover {
      color: var(--brand-blue);
      text-decoration: underline;
    }

    /* 图片灯箱 Lightbox */
    #lightbox-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(8px);
      z-index: 10000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      cursor: zoom-out;
    }
    #lightbox-modal img {
      max-width: 95%;
      max-height: 90vh;
      border-radius: 0.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    /* 移动端目录抽屉 */
    .mobile-toc-btn {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 40;
      display: none;
      padding: 0.65rem 1.1rem;
      border-radius: 9999px;
      box-shadow: 0 10px 25px rgba(37, 99, 235, 0.3);
    }
    @media (max-width: 1024px) {
      .mobile-toc-btn { display: inline-flex; }
    }
    #mobile-drawer {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.4);
      z-index: 999;
      display: none;
    }
    .drawer-panel {
      position: absolute;
      right: 0;
      top: 0;
      width: 80%;
      max-width: 340px;
      height: 100%;
      background: var(--bg-primary);
      padding: 2rem 1.5rem;
      overflow-y: auto;
    }

    /* 附录特殊标识与分割样式（克制版：字号与字重低于正文一级标题） */
    .appendix-h1 {
      font-size: 1.32rem !important;
      font-weight: 700 !important;
      margin-top: 3.25rem !important;
      margin-bottom: 1rem !important;
      padding-bottom: 0.45rem !important;
      border-bottom: 1.5px dashed var(--brand-emerald) !important;
    }
    .appendix-h1 .header-section-number {
      background: rgba(16, 185, 129, 0.1) !important;
      color: var(--brand-emerald) !important;
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 0.375rem;
      padding: 0.1rem 0.45rem;
      font-size: 0.82em;
    }
    .toc-section-divider {
      font-family: var(--font-sans);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--brand-emerald);
      margin: 1.6rem 0 0.5rem 0.5rem;
      padding-top: 0.85rem;
      border-top: 1px dashed var(--border-color);
      list-style: none;
    }

    /* 附录 A–D 与参考文献：默认折叠 + 小型展开按钮 */
    .article-content h1 .collapse-toggle {
      margin-left: auto;
      align-self: center;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.22rem 0.62rem;
      border: 1px solid var(--border-color);
      border-radius: 999px;
      background: var(--bg-secondary);
      color: var(--brand-blue);
      font-family: var(--font-sans);
      font-size: 0.74rem;
      font-weight: 600;
      line-height: 1.4;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .article-content h1 .collapse-toggle:hover {
      background: var(--bg-tertiary);
      border-color: var(--brand-blue);
    }
    .article-content h1 .collapse-toggle svg {
      transition: transform 0.2s ease;
    }
    .article-content h1 .collapse-toggle[aria-expanded="false"] svg {
      transform: rotate(-90deg);
    }
    .collapsible-body.is-collapsed {
      display: none;
    }

    /* 附录 C：关键术语与缩略语紧凑学术规范表 (Glossary Table) */
    .glossary-card-container {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      margin: 1.5rem 0 2.75rem;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
    }
    .glossary-toolbar {
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      padding: 0.65rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .glossary-filter-group {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: var(--bg-tertiary);
      padding: 0.2rem;
      border-radius: 0.5rem;
    }
    .glossary-tab {
      background: transparent;
      border: 1px solid transparent;
      padding: 0.25rem 0.65rem;
      border-radius: 0.35rem;
      font-family: var(--font-sans);
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .glossary-tab:hover {
      color: var(--text-main);
    }
    .glossary-tab.active {
      background: var(--bg-primary);
      color: var(--brand-blue);
      border-color: var(--border-color);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    }
    .glossary-search-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .glossary-search-wrap svg {
      position: absolute;
      left: 0.65rem;
      color: var(--text-muted);
      pointer-events: none;
    }
    #glossary-search {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 0.45rem;
      padding: 0.32rem 1.8rem 0.32rem 2rem;
      font-family: var(--font-sans);
      font-size: 0.82rem;
      color: var(--text-main);
      width: 220px;
      transition: all 0.2s ease;
      outline: none;
    }
    #glossary-search:focus {
      border-color: var(--brand-blue);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
      width: 250px;
    }
    #glossary-search-clear {
      position: absolute;
      right: 0.45rem;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.75rem;
      cursor: pointer;
      padding: 0.1rem 0.25rem;
    }
    .glossary-table-wrap {
      max-height: 520px;
      overflow-y: auto;
      transition: max-height 0.3s ease;
      position: relative;
    }
    .glossary-table-wrap.is-expanded {
      max-height: none;
      overflow-y: visible;
    }
    .glossary-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.88rem;
    }
    .glossary-table thead th {
      background: var(--table-header);
      padding: 0.55rem 0.95rem;
      font-family: var(--font-sans);
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .glossary-table tbody tr {
      transition: background-color 0.15s ease;
      border-bottom: 1px solid var(--border-color);
    }
    .glossary-table tbody tr:nth-child(even) {
      background: var(--table-stripe);
    }
    .glossary-table tbody tr:hover {
      background: var(--highlight-flash);
    }
    .glossary-table tbody tr:last-child {
      border-bottom: none;
    }
    .col-term-name {
      padding: 0.6rem 0.95rem;
      vertical-align: top;
      white-space: nowrap;
    }
    .term-code {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 0.92rem;
      color: var(--text-main);
      display: inline-block;
    }
    .col-term-type {
      padding: 0.6rem 0.5rem;
      vertical-align: top;
      white-space: nowrap;
    }
    .glossary-badge {
      font-family: var(--font-sans);
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.12rem 0.45rem;
      border-radius: 9999px;
      display: inline-block;
    }
    .badge-abbr {
      background: rgba(139, 92, 246, 0.1);
      color: #8b5cf6;
      border: 1px solid rgba(139, 92, 246, 0.22);
    }
    .badge-concept {
      background: rgba(37, 99, 235, 0.08);
      color: var(--brand-blue);
      border: 1px solid rgba(37, 99, 235, 0.2);
    }
    .col-term-desc {
      padding: 0.6rem 1rem;
      vertical-align: top;
      line-height: 1.6;
      font-size: 0.88rem;
    }
    .term-lead {
      font-weight: 700;
      color: var(--text-main);
    }
    .term-body {
      font-family: var(--font-serif);
      color: var(--text-muted);
    }
    .glossary-empty {
      padding: 2.5rem 1rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.88rem;
    }
    .glossary-footer {
      background: var(--bg-secondary);
      border-top: 1px solid var(--border-color);
      padding: 0.5rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: var(--font-sans);
      font-size: 0.78rem;
      color: var(--text-muted);
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .glossary-btn-expand {
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 0.35rem;
      padding: 0.22rem 0.6rem;
      font-family: var(--font-sans);
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--text-main);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s ease;
    }
    .glossary-btn-expand:hover {
      background: var(--bg-tertiary);
      border-color: var(--brand-blue);
      color: var(--brand-blue);
    }
    .glossary-btn-expand svg {
      transition: transform 0.2s ease;
    }
    .glossary-btn-expand.is-expanded svg {
      transform: rotate(180deg);
    }
    @media (max-width: 640px) {
      .glossary-toolbar {
        flex-direction: column;
        align-items: stretch;
      }
      #glossary-search {
        width: 100% !important;
      }
      .glossary-footer {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    /* BibTeX 引用卡片 */
    .citation-card {
      margin-top: 4rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      padding: 1.75rem;
      font-family: var(--font-sans);
    }
    .citation-code {
      background: var(--bg-tertiary);
      padding: 1rem;
      border-radius: 0.5rem;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      overflow-x: auto;
      margin: 1rem 0;
      color: var(--text-main);
    }

    /* 图文摘要卡片 (Graphical Abstract) - 优雅尺寸与学术居中约束 */
    .graphical-abstract-card {
      max-width: 860px;
      margin: 2.25rem auto 3rem;
      border: 1px solid var(--border-color);
      border-radius: 0.85rem;
      background: var(--bg-secondary);
      overflow: hidden;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
    }
    .graphical-abstract-card:hover {
      border-color: var(--brand-blue);
      box-shadow: 0 8px 30px rgba(37, 99, 235, 0.12);
    }
    .ga-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.4rem;
      background: var(--bg-tertiary);
      border-bottom: 1px solid var(--border-color);
    }
    .ga-title {
      font-family: var(--font-sans);
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--brand-blue);
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }
    .ga-tip {
      font-family: var(--font-sans);
      font-size: 0.76rem;
      color: var(--text-muted);
      background: var(--bg-primary);
      padding: 0.15rem 0.55rem;
      border-radius: 9999px;
      border: 1px solid var(--border-color);
      white-space: nowrap;
    }
    .ga-img-wrap {
      padding: 1.25rem 1.5rem;
      background: #ffffff;
      text-align: center;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    [data-theme="dark"] .ga-img-wrap {
      background: #0f172a;
    }
    .ga-img-wrap img {
      max-width: 100%;
      max-height: 520px;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 0.5rem;
      cursor: zoom-in;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .ga-img-wrap img:hover {
      transform: scale(1.01);
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.12);
    }
    .ga-caption {
      padding: 0.85rem 1.4rem;
      font-family: var(--font-sans);
      font-size: 0.85rem;
      line-height: 1.7;
      color: var(--text-muted);
      border-top: 1px solid var(--border-color);
      background: var(--bg-secondary);
      text-align: justify;
    }
    /* 三阶段演化路线图 (3-Stage Evolution Roadmap in Section 5) */
    .roadmap-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      margin: 2.25rem 0 3rem;
    }
    .roadmap-card {
      display: flex;
      gap: 1.5rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      padding: 1.4rem 1.6rem;
      position: relative;
      transition: all 0.2s ease;
    }
    .roadmap-card:hover {
      background: var(--bg-tertiary);
      border-color: var(--brand-blue);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
    }
    .roadmap-card.stage-1 { border-left: 4px solid #0284c7; }
    .roadmap-card.stage-2 { border-left: 4px solid #2563eb; }
    .roadmap-card.stage-3 { border-left: 4px solid #059669; }
    
    .roadmap-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 72px;
      height: 72px;
      border-radius: 0.6rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    .step-num {
      font-family: var(--font-mono);
      font-size: 1.35rem;
      font-weight: 800;
      line-height: 1.1;
      color: var(--brand-blue);
    }
    .stage-1 .step-num { color: #0284c7; }
    .stage-2 .step-num { color: #2563eb; }
    .stage-3 .step-num { color: #059669; }
    .step-phase {
      font-family: var(--font-sans);
      font-size: 0.68rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    .roadmap-content {
      flex: 1;
    }
    .stage-title {
      font-family: var(--font-sans);
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 0.5rem;
    }
    .stage-desc {
      font-family: var(--font-serif);
      font-size: 0.94rem;
      line-height: 1.8;
      color: var(--text-main);
      text-indent: 0 !important;
      margin-bottom: 0 !important;
    }
    @media (max-width: 640px) {
      .roadmap-card {
        flex-direction: column;
        gap: 0.85rem;
      }
      .roadmap-step {
        width: 100%;
        height: auto;
        flex-direction: row;
        gap: 0.5rem;
        padding: 0.4rem;
      }
    }

    /* 规范学术图表 (Academic Figures) - 优雅尺寸与学术居中约束 */
    .academic-figure {
      max-width: 900px;
      margin: 3rem auto;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 0.85rem;
      overflow: hidden;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
      text-align: left;
    }
    .figure-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1.4rem;
      background: var(--bg-tertiary);
      border-bottom: 1px solid var(--border-color);
    }
    .figure-title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }
    .figure-label {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      font-weight: 700;
      color: #ffffff;
      background: var(--brand-blue);
      padding: 0.2rem 0.55rem;
      border-radius: 0.35rem;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .figure-title {
      font-family: var(--font-sans);
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .figure-tip {
      font-family: var(--font-sans);
      font-size: 0.76rem;
      color: var(--text-muted);
      background: var(--bg-primary);
      padding: 0.15rem 0.55rem;
      border-radius: 9999px;
      border: 1px solid var(--border-color);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .figure-img-wrap {
      padding: 1.5rem 1.5rem;
      background: #ffffff;
      text-align: center;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    [data-theme="dark"] .figure-img-wrap {
      background: #0f172a;
    }
    .figure-img-wrap img {
      max-width: 100%;
      max-height: 560px;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 0.45rem;
      cursor: zoom-in;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
    }
    .figure-img-wrap img:hover {
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.15);
      transform: scale(1.008);
    }
    .figure-notes {
      padding: 0.95rem 1.4rem;
      border-top: 1px solid var(--border-color);
      background: var(--bg-secondary);
      display: flex;
      gap: 0.75rem;
      font-family: var(--font-sans);
      font-size: 0.82rem;
      line-height: 1.65;
      color: var(--text-muted);
    }
    .note-tag {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted);
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      padding: 0.15rem 0.5rem;
      border-radius: 0.3rem;
      height: fit-content;
      white-space: nowrap;
    }
    .note-text {
      flex: 1;
      text-align: justify;
    }
    /* 注释正文里的语义标签（如“口径与筛选说明”），由 normalizeNote 生成 */
    .note-lead {
      font-weight: 700;
      color: var(--text-main);
      margin-right: 0.15rem;
    }
    .fig-ref-link {
      color: var(--brand-blue);
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    /* 政策建议标题突出 (Policy Recommendation Headings 5.1-5.3) */
    .policy-rec-heading {
      margin-top: 3.5rem !important;
      padding-top: 0.75rem;
      position: relative;
    }

    /* 脚注区域美化 (Footnotes Endnotes) */
    .footnotes {
      margin-top: 4.5rem;
      padding: 1.5rem 1.8rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      font-family: var(--font-sans);
      font-size: 0.86rem;
      line-height: 1.7;
    }
    .footnotes hr {
      display: none;
    }
    .footnotes-header {
      font-weight: 700;
      color: var(--text-main);
      font-size: 0.95rem;
      margin-bottom: 0.85rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-color);
    }
    .footnotes ol {
      padding-left: 1.4rem;
      margin-bottom: 0;
    }
    .footnotes li {
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }
    .footnotes li p {
      margin-bottom: 0 !important;
      text-indent: 0 !important;
    }
    .footnote-back {
      color: var(--brand-blue);
      text-decoration: none;
      font-weight: 600;
      margin-left: 0.4rem;
    }
    .footnote-back:hover {
      text-decoration: underline;
    }

    /* 返回顶部悬浮按钮 (Back to Top) */
    .back-to-top {
      position: fixed;
      bottom: 2.5rem;
      right: 2.5rem;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--brand-blue);
      color: #ffffff;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35);
      opacity: 0;
      visibility: hidden;
      transform: translateY(12px);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 45;
    }
    .back-to-top.visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
    .back-to-top:hover {
      background: var(--brand-blue-hover);
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.45);
    }
    @media (max-width: 1024px) {
      .back-to-top {
        bottom: 5rem;
        right: 1.5rem;
        width: 40px;
        height: 40px;
      }
    }

    /* --- 选中文本添加批注与侧边收纳抽屉系统 (Text Selection & Comments System) --- */
    
    /* 划词悬浮操作栏 */
    .selection-toolbar {
      position: absolute;
      z-index: 1000;
      transform: translateX(-50%);
      background: #0f172a;
      color: #ffffff;
      padding: 0.35rem 0.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 0.4rem;
      pointer-events: auto;
      animation: popover-fade 0.15s ease;
    }
    .selection-toolbar::after {
      content: '';
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      border-width: 6px 6px 0;
      border-style: solid;
      border-color: #0f172a transparent transparent;
      display: block;
      width: 0;
    }
    .selection-action-btn {
      background: transparent;
      color: #ffffff;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-family: var(--font-sans);
      font-size: 0.82rem;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      border-radius: 0.35rem;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .selection-action-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* 正文划线高亮 Mark */
    mark.comment-highlight {
      background: rgba(245, 158, 11, 0.24);
      color: inherit;
      border-bottom: 2px solid #f59e0b;
      padding: 0.05rem 0.15rem;
      border-radius: 2px;
      cursor: pointer;
      transition: background-color 0.2s ease, box-shadow 0.2s ease;
      position: relative;
    }
    mark.comment-highlight:hover {
      background: rgba(245, 158, 11, 0.42);
    }
    [data-theme="dark"] mark.comment-highlight {
      background: rgba(245, 158, 11, 0.35);
      border-bottom-color: #fbbf24;
    }
    mark.comment-highlight.pulse-highlight {
      animation: mark-flash 1.8s ease-out;
    }
    @keyframes mark-flash {
      0% { background: rgba(239, 68, 68, 0.6); box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.4); }
      50% { background: rgba(245, 158, 11, 0.5); box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.3); }
      100% { background: rgba(245, 158, 11, 0.24); box-shadow: none; }
    }

    /* 批注输入弹窗 (Modal) */
    .comment-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      animation: modal-fade-in 0.15s ease-out;
    }
    @keyframes modal-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .comment-modal-card {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 0.85rem;
      width: 100%;
      max-width: 540px;
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.35);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .comment-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.4rem;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-secondary);
    }
    .comment-modal-title {
      font-family: var(--font-sans);
      font-size: 0.98rem;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .modal-close-btn {
      background: transparent;
      border: none;
      font-size: 1.1rem;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.2rem 0.5rem;
      border-radius: 0.35rem;
    }
    .modal-close-btn:hover {
      color: var(--text-main);
      background: var(--bg-tertiary);
    }
    .comment-modal-body {
      padding: 1.25rem 1.4rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .modal-quote-box {
      background: var(--bg-secondary);
      border-left: 3.5px solid var(--brand-blue);
      border-radius: 0.35rem;
      padding: 0.75rem 1rem;
      font-size: 0.86rem;
      line-height: 1.65;
    }
    .modal-quote-label {
      font-weight: 700;
      color: var(--brand-blue);
      font-size: 0.78rem;
      display: block;
      margin-bottom: 0.25rem;
    }
    .modal-quoted-content {
      font-family: var(--font-serif);
      color: var(--text-muted);
      font-style: italic;
      margin: 0 !important;
      text-indent: 0 !important;
      max-height: 120px;
      overflow-y: auto;
    }
    .comment-input-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .comment-input-label {
      font-family: var(--font-sans);
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--text-main);
    }
    #comment-textarea {
      width: 100%;
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      padding: 0.75rem 0.9rem;
      font-family: var(--font-sans);
      font-size: 0.92rem;
      line-height: 1.6;
      background: var(--bg-primary);
      color: var(--text-main);
      resize: vertical;
      min-height: 90px;
    }
    #comment-textarea:focus {
      outline: none;
      border-color: var(--brand-blue);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
    .comment-modal-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1.4rem;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border-color);
    }

    /* 侧边批注抽屉 (Comments Drawer) */
    .comments-drawer-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(2px);
      z-index: 998;
    }
    .comments-drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 390px;
      max-width: 92vw;
      height: 100vh;
      background: var(--bg-primary);
      border-left: 1px solid var(--border-color);
      box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15);
      z-index: 999;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .comments-drawer.open {
      transform: translateX(0);
    }
    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.1rem 1.4rem;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-secondary);
    }
    .drawer-header-left {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .drawer-header-title {
      font-family: var(--font-sans);
      font-weight: 700;
      font-size: 1.05rem;
      color: var(--text-main);
    }
    .drawer-actions-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-tertiary);
      flex-wrap: wrap;
    }
    .btn-sm {
      padding: 0.3rem 0.6rem;
      font-size: 0.78rem;
    }
    .btn-danger {
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.3);
    }
    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.1);
      border-color: #ef4444;
    }
    .comments-list-wrap {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* 单条批注卡片 */
    .comment-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-left: 3.5px solid #f59e0b;
      border-radius: 0.6rem;
      padding: 1rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      transition: all 0.2s ease;
      scroll-margin-top: 20px;
    }
    .comment-card:hover {
      border-color: #f59e0b;
      background: var(--bg-tertiary);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
    }
    .comment-card.focused-card {
      animation: card-focus-pulse 1.5s ease-out;
      border-color: #f59e0b;
    }
    @keyframes card-focus-pulse {
      0% { transform: scale(1.02); box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.35); }
      100% { transform: scale(1); box-shadow: none; }
    }
    .comment-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      font-family: var(--font-sans);
      font-size: 0.74rem;
      color: var(--text-light);
    }
    .comment-meta-group {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      min-width: 0;
    }
    .comment-section-badge {
      font-family: var(--font-mono);
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      padding: 0.1rem 0.4rem;
      border-radius: 0.25rem;
      font-size: 0.72rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }
    .comment-card-quote {
      font-family: var(--font-serif);
      font-size: 0.85rem;
      line-height: 1.55;
      color: var(--text-muted);
      background: var(--bg-primary);
      border-radius: 0.35rem;
      padding: 0.5rem 0.75rem;
      font-style: italic;
      border: 1px dashed var(--border-color);
      word-break: break-all;
    }
    .comment-card-body {
      font-family: var(--font-sans);
      font-size: 0.92rem;
      line-height: 1.65;
      color: var(--text-main);
      font-weight: 500;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .comment-card-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.45rem;
      border-top: 1px solid var(--border-color);
      font-size: 0.78rem;
    }
    .btn-locate {
      color: var(--brand-blue);
      background: transparent;
      border: none;
      cursor: pointer;
      font-weight: 600;
      padding: 0.2rem 0.4rem;
      border-radius: 0.3rem;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .btn-locate:hover {
      background: rgba(37, 99, 235, 0.1);
      text-decoration: underline;
    }
    .btn-delete-comment {
      color: var(--text-light);
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0.2rem 0.4rem;
      border-radius: 0.3rem;
    }
    .btn-delete-comment:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }
    .empty-comments {
      text-align: center;
      padding: 3.5rem 1.5rem;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    .empty-icon {
      font-size: 2.75rem;
      opacity: 0.7;
    }
    .empty-tip {
      font-size: 0.84rem;
      line-height: 1.6;
      max-width: 260px;
    }
    .badge-comment-count {
      background: #f59e0b !important;
      color: #ffffff !important;
      border-color: #d97706 !important;
      font-weight: 700 !important;
      margin-left: 0.35rem;
      padding: 0.1rem 0.45rem;
    }

    /* 浮动提示 Toast */
    #comment-toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: #0f172a;
      color: #ffffff;
      padding: 0.6rem 1.2rem;
      border-radius: 9999px;
      font-family: var(--font-sans);
      font-size: 0.88rem;
      font-weight: 500;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      z-index: 10005;
      opacity: 0;
      pointer-events: none;
      transition: all 0.25s ease;
    }
    #comment-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* 打印专有样式 (@media print) */
    @media print {
      #progress-bar, .navbar, .toc-sidebar, #citation-popover, #lightbox-modal,
      .mobile-toc-btn, #mobile-drawer, .back-to-top, .ref-actions, #copy-bibtex-btn,
      .table-scroll-hint, .ga-tip, .figure-tip,
        .selection-toolbar, .comment-modal-backdrop, .comments-drawer, .comments-drawer-backdrop, #comment-toast {
        display: none !important;
      }
      .collapse-toggle {
        display: none !important;
      }
      .collapsible-body.is-collapsed {
        display: block !important;
      }
      mark.comment-highlight {
        background: transparent !important;
        border-bottom: 1pt solid #000000 !important;
      }
      body {
        background: #ffffff !important;
        color: #000000 !important;
        font-size: 11pt !important;
        line-height: 1.6 !important;
      }
      .container {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        display: block !important;
      }
      .article-wrap {
        max-width: 100% !important;
        padding: 0 !important;
      }
      .paper-hero {
        border-bottom: 2pt solid #000000 !important;
        margin-bottom: 2rem !important;
      }
      figure, .academic-figure, table, .table-responsive-wrapper,
      .roadmap-container, .graphical-abstract-card, .glossary-card-container, .glossary-table {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .glossary-toolbar, .glossary-footer, #glossary-toggle-expand {
        display: none !important;
      }
      .glossary-table-wrap {
        max-height: none !important;
        overflow: visible !important;
      }
      h1, h2, h3 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      a {
        color: #000000 !important;
        text-decoration: none !important;
      }
      .cite-ref {
        color: #000000 !important;
        font-weight: 700 !important;
      }
    }
  </style>
</head>
<body>
  <div id="progress-bar"></div>
  <div id="citation-popover"></div>
  <div id="lightbox-modal"><img src="" id="lightbox-img" alt="zoom"></div>
  <div id="comment-toast"></div>

  <!-- Floating Text Selection Toolbar -->
  <div id="text-selection-toolbar" class="selection-toolbar" style="display: none;">
    <button id="btn-add-comment" class="selection-action-btn" title="针对选中文本添加批注">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <span>添加批注</span>
    </button>
  </div>

  <!-- Comment Input Modal -->
  <div id="comment-input-modal" class="comment-modal-backdrop" style="display: none;">
    <div class="comment-modal-card">
      <div class="comment-modal-header">
        <div class="comment-modal-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>添加审阅批注 (Add Comment)</span>
        </div>
        <button id="btn-close-comment-modal" class="modal-close-btn" title="关闭">✕</button>
      </div>
      <div class="comment-modal-body">
        <div class="modal-quote-box">
          <span class="modal-quote-label">引述原文：</span>
          <p id="modal-quoted-text" class="modal-quoted-content"></p>
        </div>
        <div class="comment-input-wrap">
          <label for="comment-textarea" class="comment-input-label">审阅批注 / 建议意见：</label>
          <textarea id="comment-textarea" rows="4" placeholder="在此记录针对该段落的审阅见解、数据核实建议或讨论问题... (支持快捷键 Ctrl+Enter 提交)"></textarea>
        </div>
      </div>
      <div class="comment-modal-footer">
        <button id="btn-cancel-comment" class="btn">取消</button>
        <button id="btn-save-comment" class="btn btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          <span>保存批注 (Ctrl+Enter)</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Comments Slide-out Drawer -->
  <div id="comments-drawer-backdrop" class="comments-drawer-backdrop" style="display: none;"></div>
  <aside id="comments-drawer" class="comments-drawer" aria-label="审阅批注清单">
    <div class="drawer-header">
      <div class="drawer-header-left">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span class="drawer-header-title">审阅批注清单</span>
        <span id="drawer-comments-count" class="badge">0</span>
      </div>
      <button id="btn-close-comments-drawer" class="btn" style="padding: 0.25rem 0.55rem;">✕ 关闭</button>
    </div>

    <div class="drawer-actions-bar">
      <button id="btn-export-markdown" class="btn btn-sm btn-primary" title="导出为结构化 Markdown 文本并下载">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>导出 Markdown</span>
      </button>
      <button id="btn-copy-comments" class="btn btn-sm" title="一键复制全部结构化批注文本到剪贴板">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>复制全部</span>
      </button>
      <button id="btn-clear-all-comments" class="btn btn-sm btn-danger" title="清空全部本地批注">
        <span>清空</span>
      </button>
    </div>

    <div id="comments-list-container" class="comments-list-wrap">
      <!-- 动态生成批注卡片 -->
    </div>
  </aside>

  <!-- Mobile Drawer -->
  <div id="mobile-drawer">
    <div class="drawer-panel">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <span style="font-weight: 700; font-size: 1.1rem;">报告大纲</span>
        <button id="close-drawer" class="btn" style="padding: 0.3rem 0.6rem;">✕ 关闭</button>
      </div>
      <nav class="toc-nav" id="mobile-toc-container"></nav>
    </div>
  </div>

  <!-- Navbar -->
  <header class="navbar">
    <a href="../../" id="nav-brand-link" class="nav-brand" title="返回 CCUS Policy Hub 首页" aria-label="返回 CCUS Policy Hub 首页">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
      <span class="brand-text">CCUS Policy Hub</span>
      <span class="brand-text-short">CCUS</span>
      <span class="badge">智库报告</span>
    </a>
    <div class="nav-actions">
      <button class="btn" id="btn-toggle-toc" title="收起/展开左侧目录大纲 (快捷键: [)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M14 9l-3 3 3 3"/></svg>
        <span id="btn-toggle-toc-text">折叠大纲</span>
      </button>
      <button class="btn" id="btn-toggle-comments" title="打开审阅批注抽屉 (支持选中文本添加批注与结构化导出)" aria-label="打开批注抽屉">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span class="btn-label">批注</span>
        <span id="nav-comment-badge" class="badge badge-comment-count" style="display: none;">0</span>
      </button>
      <button class="btn" id="theme-toggle" title="切换深浅模式" aria-label="切换深浅模式"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/></svg><span class="btn-label">主题</span></button>
      <a href="./paper_draft.pdf" download class="btn btn-primary" title="下载 XeLaTeX 原版${pdfPageCount ? ` ${pdfPageCount} 页` : ''}高保真 PDF" aria-label="下载原版 PDF">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span class="btn-label">下载原版 PDF</span>
      </a>
    </div>
  </header>

  <!-- Container -->
  <div class="container">
    <!-- Floating Tab to re-open TOC when collapsed -->
    <button id="btn-float-expand-toc" class="floating-toc-tab" title="展开目录大纲 (快捷键: [)" aria-label="展开目录大纲">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      <span>展开大纲</span>
    </button>

    <!-- TOC Sidebar (Desktop) -->
    <aside class="toc-sidebar" id="toc-sidebar">
      <div class="toc-title">
        <span>报告大纲</span>
        <button id="btn-collapse-toc-icon" class="toc-collapse-icon-btn" title="收起目录以拓宽正文 (快捷键: [)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      </div>
      <nav class="toc-nav" id="toc-container"></nav>
    </aside>

    <!-- Main Article Body -->
    <main class="article-wrap">
      <div class="paper-hero">
        <div class="paper-type">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>${programName} · ${reportType} (${reportVersion})</span>
        </div>
        <h1 class="paper-title">${docTitle}</h1>
        <div class="paper-meta">
          <div class="meta-item"><strong>作者团队：</strong>${docAuthor}</div>
          <div class="meta-item"><strong>发布日期：</strong>${docDate}</div>
          <div class="meta-item"><strong>DOI：</strong>10.5281/zenodo.21110615</div>
        </div>

<div class="reading-stats">
          <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>约 ${Math.round(charCount / 1000)}k 字</span>
          <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${readMinutes} 分钟</span>
        </div>

        <div class="abstract-box">
          <div class="abstract-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span>报告摘要 (Abstract)</span>
          </div>
          <div class="abstract-content">
            ${abstractText}
          </div>
          <div class="keywords">
            <strong>关键词：</strong>${keywordsText}
          </div>
        </div>
      </div>

      <!-- Article Body from Pandoc with Citations Linked -->
      <article class="article-content" id="report-content">
        ${bodyHtml}
      </article>

      <!-- Citation Card -->
      <div class="citation-card">
        <h4 style="font-size: 1.05rem; margin-bottom: 0.5rem;">引用本研究报告 (Citation)</h4>
        <p style="font-size: 0.88rem; color: var(--text-muted);">
          刘志豪, 崔博宇, 吴俊军, 施闻如. (2026). 从单点技术示范到集群化枢纽治理：CCUS 规模化的治理组合与 dMRV 证据基础 (ESG30 青年学者计划课题报告 v3.4). CCUS Policy Hub. https://doi.org/10.5281/zenodo.21110615
        </p>
        <pre class="citation-code"><code>@techreport{liu2026esg30ccus,
  title={从单点技术示范到集群化枢纽治理：CCUS 规模化的治理组合与 dMRV 证据基础},
  author={刘志豪, 崔博宇, 吴俊军, 施闻如},
  year={2026},
  institution={CCUS Policy Hub / ESG30 青年学者计划},
  doi={10.5281/zenodo.21110615},
  url={https://liuh886.github.io/ccus-policy-hub/reports/${slug}/}
}</code></pre>
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.75rem; margin-top: 1rem;">
          <button class="btn" id="copy-bibtex-btn">📋 复制 BibTeX 引用代码</button>
          <a href="./paper_draft.pdf" download class="btn btn-primary">下载原版 PDF${pdfPageCount ? ` (${pdfPageCount}页)` : ''}</a>
        </div>
      </div>
    </main>
  </div>

  <!-- Back to Top Button -->
  <button id="back-to-top" class="back-to-top" title="返回顶部" aria-label="返回顶部">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
  </button>

  <!-- Mobile Floating Button -->
  <button class="btn btn-primary mobile-toc-btn" id="open-drawer" aria-label="打开报告大纲">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
    <span>报告大纲</span>
  </button>

  <script>
    // 0. 导航栏品牌首页跳转支持 (适配 GitHub Pages 子路径与根域名)
    const brandLink = document.getElementById('nav-brand-link');
    if (brandLink) {
      const isGhPages = window.location.pathname.startsWith('/ccus-policy-hub');
      brandLink.href = isGhPages ? '/ccus-policy-hub/' : '/';
    }

    // 1. 顶部阅读进度条
    window.addEventListener('scroll', () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = (window.scrollY / docHeight) * 100;
      document.getElementById('progress-bar').style.width = scrolled + '%';
    });

    // 2. 主题切换
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const target = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', target);
      localStorage.setItem('theme', target);
    });
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    // 3. 构建大纲导航 (TOC) - 保留章节序号
    const content = document.getElementById('report-content');
    const headings = content.querySelectorAll('h1, h2, h3');
    const tocContainer = document.getElementById('toc-container');
    const mobileTocContainer = document.getElementById('mobile-toc-container');
    const ul = document.createElement('ul');
    const mobileUl = document.createElement('ul');

    let hasAppendixDivider = false;
    let hasRefDivider = false;

    headings.forEach((h, idx) => {
      if (!h.id) h.id = 'heading-' + idx;
      
      // 提取标题文字（包含序号，例如 "1 CCUS 规模化..." 或 "附录 A ..."）
      let text = h.textContent.trim();
      const tag = h.tagName.toLowerCase();

      // 在大纲中识别附录开始，插入分割标签
      if (text.includes('附录') && !hasAppendixDivider) {
        hasAppendixDivider = true;
        const divLi = document.createElement('li');
        divLi.className = 'toc-section-divider';
        divLi.textContent = '附录 · 延伸资料';
        ul.appendChild(divLi);

        const mDivLi = document.createElement('li');
        mDivLi.className = 'toc-section-divider';
        mDivLi.textContent = '附录 · 延伸资料';
        mobileUl.appendChild(mDivLi);
      }

      // 在参考文献前插入分割标签
      if (text.includes('参考文献') && !hasRefDivider) {
        hasRefDivider = true;
        const divLi = document.createElement('li');
        divLi.className = 'toc-section-divider';
        divLi.style.borderColor = 'var(--brand-blue)';
        divLi.style.color = 'var(--brand-blue)';
        divLi.textContent = '文献与依据';
        ul.appendChild(divLi);

        const mDivLi = document.createElement('li');
        mDivLi.className = 'toc-section-divider';
        mDivLi.style.borderColor = 'var(--brand-blue)';
        mDivLi.style.color = 'var(--brand-blue)';
        mDivLi.textContent = '文献与依据';
        mobileUl.appendChild(mDivLi);
      }

      // Desktop
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = text;
      a.classList.add('toc-' + tag);
      li.appendChild(a);
      ul.appendChild(li);

      // Mobile
      const mLi = document.createElement('li');
      const mA = document.createElement('a');
      mA.href = '#' + h.id;
      mA.textContent = text;
      mA.classList.add('toc-' + tag);
      mA.addEventListener('click', () => {
        document.getElementById('mobile-drawer').style.display = 'none';
      });
      mLi.appendChild(mA);
      mobileUl.appendChild(mLi);
    });
    tocContainer.appendChild(ul);
    mobileTocContainer.appendChild(mobileUl);

    // 4. 滚动时自动高亮目录项
    const tocLinks = tocContainer.querySelectorAll('a');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          tocLinks.forEach(link => {
            if (link.getAttribute('href') === '#' + id) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, { rootMargin: '0px 0px -70% 0px' });
    headings.forEach(h => observer.observe(h));

    // 5. 移动端抽屉开关
    const drawer = document.getElementById('mobile-drawer');
    document.getElementById('open-drawer').addEventListener('click', () => {
      drawer.style.display = 'block';
    });
    document.getElementById('close-drawer').addEventListener('click', () => {
      drawer.style.display = 'none';
    });
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) drawer.style.display = 'none';
    });

    // 6. 即时文献卡片气泡 (Citation Popover) 与平滑高亮跳转
    const popover = document.getElementById('citation-popover');
    let popoverTimeout;

    document.querySelectorAll('.cite-ref').forEach(ref => {
      ref.addEventListener('mouseenter', (e) => {
        clearTimeout(popoverTimeout);
        const citeKey = ref.getAttribute('data-cite');
        const refTarget = document.getElementById('ref-' + citeKey);
        if (!refTarget) return;

        const index = ref.getAttribute('data-index');
        const bodyContent = refTarget.querySelector('.ref-body').innerHTML;

        popover.innerHTML = \`<span class="popover-index">[\${index}]</span> \${bodyContent}\`;
        popover.style.display = 'block';

        const rect = ref.getBoundingClientRect();
        const top = rect.bottom + window.scrollY + 8;
        const left = Math.min(Math.max(16, rect.left + window.scrollX - 40), window.innerWidth - 440);
        
        popover.style.top = top + 'px';
        popover.style.left = left + 'px';
      });

      ref.addEventListener('mouseleave', () => {
        popoverTimeout = setTimeout(() => {
          popover.style.display = 'none';
        }, 200);
      });

      // 点击跳转时触发目标文献闪烁高亮
      ref.addEventListener('click', (e) => {
        const citeKey = ref.getAttribute('data-cite');
        const refTarget = document.getElementById('ref-' + citeKey);
        if (refTarget) {
          refTarget.classList.remove('highlight-flash');
          void refTarget.offsetWidth; // 触发 reflow
          refTarget.classList.add('highlight-flash');
        }
      });
    });

    popover.addEventListener('mouseenter', () => {
      clearTimeout(popoverTimeout);
    });
    popover.addEventListener('mouseleave', () => {
      popover.style.display = 'none';
    });

    // 7. 图片全屏放大 (Lightbox)
    const modal = document.getElementById('lightbox-modal');
    const modalImg = document.getElementById('lightbox-img');
    document.querySelectorAll('.article-content img').forEach(img => {
      img.addEventListener('click', () => {
        modalImg.src = img.src;
        modal.style.display = 'flex';
      });
    });
    modal.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // 8. 复制 BibTeX
    document.getElementById('copy-bibtex-btn').addEventListener('click', () => {
      const code = document.querySelector('.citation-code code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copy-bibtex-btn');
        btn.textContent = '✅ 已成功复制到剪贴板！';
        setTimeout(() => { btn.textContent = '📋 复制 BibTeX 引用代码'; }, 2000);
      });
    });

    // 9. 返回顶部悬浮按钮平滑滚动与显隐监听
    const backToTopBtn = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    });
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 9.1 TOC 大纲折叠/展开联动与快捷键系统
    const btnToggleToc = document.getElementById('btn-toggle-toc');
    const btnToggleTocText = document.getElementById('btn-toggle-toc-text');
    const btnCollapseTocIcon = document.getElementById('btn-collapse-toc-icon');
    const btnFloatExpandToc = document.getElementById('btn-float-expand-toc');

    function setTocCollapsed(collapsed) {
      if (collapsed) {
        document.body.classList.add('toc-collapsed');
        if (btnToggleTocText) btnToggleTocText.textContent = '展开大纲';
        if (btnFloatExpandToc) btnFloatExpandToc.style.display = 'flex';
        localStorage.setItem('ccus_report_toc_collapsed', '1');
      } else {
        document.body.classList.remove('toc-collapsed');
        if (btnToggleTocText) btnToggleTocText.textContent = '折叠大纲';
        if (btnFloatExpandToc) btnFloatExpandToc.style.display = 'none';
        localStorage.setItem('ccus_report_toc_collapsed', '0');
      }
      if (typeof updateTableScrollState === 'function') {
        setTimeout(updateTableScrollState, 300);
      }
    }

    if (localStorage.getItem('ccus_report_toc_collapsed') === '1') {
      setTocCollapsed(true);
    }

    if (btnToggleToc) {
      btnToggleToc.addEventListener('click', () => {
        setTocCollapsed(!document.body.classList.contains('toc-collapsed'));
      });
    }
    if (btnCollapseTocIcon) {
      btnCollapseTocIcon.addEventListener('click', () => {
        setTocCollapsed(true);
      });
    }
    if (btnFloatExpandToc) {
      btnFloatExpandToc.addEventListener('click', () => {
        setTocCollapsed(false);
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === '[' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        setTocCollapsed(!document.body.classList.contains('toc-collapsed'));
      }
    });

    // 9.2 表 2-1 对标表横向滚动箭头联动与状态提示
    const benchmarkTableWrapper = document.getElementById('benchmark-table-wrapper');
    const btnScrollTableLeft = document.getElementById('btn-scroll-table-left');
    const btnScrollTableRight = document.getElementById('btn-scroll-table-right');
    const scrollHintPill = document.getElementById('table-scroll-hint-pill');

    function updateTableScrollState() {
      if (!benchmarkTableWrapper) return;
      const maxScroll = benchmarkTableWrapper.scrollWidth - benchmarkTableWrapper.clientWidth;
      if (maxScroll <= 5) {
        if (scrollHintPill) scrollHintPill.textContent = '✅ 全量 7 法域已完整展示';
        if (btnScrollTableLeft) {
          btnScrollTableLeft.disabled = true;
          btnScrollTableLeft.style.opacity = '0.35';
        }
        if (btnScrollTableRight) {
          btnScrollTableRight.disabled = true;
          btnScrollTableRight.style.opacity = '0.35';
        }
      } else {
        const atStart = benchmarkTableWrapper.scrollLeft <= 2;
        const atEnd = benchmarkTableWrapper.scrollLeft >= maxScroll - 2;
        if (btnScrollTableLeft) {
          btnScrollTableLeft.disabled = atStart;
          btnScrollTableLeft.style.opacity = atStart ? '0.35' : '1';
        }
        if (btnScrollTableRight) {
          btnScrollTableRight.disabled = atEnd;
          btnScrollTableRight.style.opacity = atEnd ? '0.35' : '1';
        }
        const pct = Math.round((benchmarkTableWrapper.scrollLeft / maxScroll) * 100);
        if (scrollHintPill) {
          if (pct === 0) scrollHintPill.textContent = '↔️ 左右滑动 / 点击箭头';
          else if (pct >= 98) scrollHintPill.textContent = '已滑动至最右侧（中国 CN）';
          else scrollHintPill.textContent = '已滑动 ' + pct + '%';
        }
      }
    }

    if (benchmarkTableWrapper && btnScrollTableLeft && btnScrollTableRight) {
      btnScrollTableLeft.addEventListener('click', () => {
        benchmarkTableWrapper.scrollBy({ left: -240, behavior: 'smooth' });
      });
      btnScrollTableRight.addEventListener('click', () => {
        benchmarkTableWrapper.scrollBy({ left: 240, behavior: 'smooth' });
      });
      benchmarkTableWrapper.addEventListener('scroll', updateTableScrollState, { passive: true });
      window.addEventListener('resize', updateTableScrollState);
      setTimeout(updateTableScrollState, 150);
    }

    // 10. 选中文本添加批注与侧边抽屉系统 (Text Selection Annotation & Comments Drawer)
    const STORAGE_KEY = 'ccus_report_comments_${slug}';
    const selectionToolbar = document.getElementById('text-selection-toolbar');
    const commentModal = document.getElementById('comment-input-modal');
    const modalQuotedText = document.getElementById('modal-quoted-text');
    const commentTextarea = document.getElementById('comment-textarea');
    const commentsDrawer = document.getElementById('comments-drawer');
    const commentsDrawerBackdrop = document.getElementById('comments-drawer-backdrop');
    const commentsListContainer = document.getElementById('comments-list-container');
    const navCommentBadge = document.getElementById('nav-comment-badge');
    const drawerCommentsCount = document.getElementById('drawer-comments-count');
    const commentToast = document.getElementById('comment-toast');

    let currentSelectionRange = null;
    let currentSelectedText = '';

    function showToast(msg) {
      if (!commentToast) return;
      commentToast.textContent = msg;
      commentToast.classList.add('show');
      setTimeout(() => { commentToast.classList.remove('show'); }, 2500);
    }

    function getStoredComments() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      } catch (e) {
        return [];
      }
    }

    function saveStoredComments(comments) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }
      updateCommentBadges(comments.length);
      renderCommentsList(comments);
    }

    function updateCommentBadges(count) {
      if (drawerCommentsCount) drawerCommentsCount.textContent = count;
      if (navCommentBadge) {
        navCommentBadge.textContent = count;
        navCommentBadge.style.display = count > 0 ? 'inline-block' : 'none';
      }
    }

    // 监听划词选择事件
    document.addEventListener('selectionchange', () => {
      if (commentModal.style.display === 'flex') return;

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        selectionToolbar.style.display = 'none';
        return;
      }

      const text = sel.toString().trim();
      if (text.length < 2) {
        selectionToolbar.style.display = 'none';
        return;
      }

      const range = sel.getRangeAt(0);
      const contentEl = document.getElementById('report-content');
      if (!contentEl || !contentEl.contains(range.commonAncestorContainer)) {
        selectionToolbar.style.display = 'none';
        return;
      }

      currentSelectionRange = range.cloneRange();
      currentSelectedText = text;

      const rect = range.getBoundingClientRect();
      const top = rect.top + window.scrollY - 44;
      const left = Math.max(16, rect.left + window.scrollX + (rect.width / 2));

      selectionToolbar.style.top = top + 'px';
      selectionToolbar.style.left = left + 'px';
      selectionToolbar.style.display = 'flex';
    });

    // 点击浮动按钮唤起添加批注弹窗
    document.getElementById('btn-add-comment').addEventListener('mousedown', (e) => {
      e.preventDefault(); // 防止失去划词焦点
    });

    document.getElementById('btn-add-comment').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!currentSelectedText) return;

      modalQuotedText.textContent = currentSelectedText.length > 160 
        ? currentSelectedText.substring(0, 160) + '...' 
        : currentSelectedText;
      commentTextarea.value = '';
      commentModal.style.display = 'flex';
      selectionToolbar.style.display = 'none';
      setTimeout(() => commentTextarea.focus(), 60);
    });

    // 关闭弹窗
    function closeCommentModal() {
      commentModal.style.display = 'none';
      currentSelectionRange = null;
      currentSelectedText = '';
      window.getSelection()?.removeAllRanges();
    }
    document.getElementById('btn-close-comment-modal').addEventListener('click', closeCommentModal);
    document.getElementById('btn-cancel-comment').addEventListener('click', closeCommentModal);

    // 快捷键 Ctrl+Enter 提交，Esc 取消
    commentTextarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        saveNewComment();
      } else if (e.key === 'Escape') {
        closeCommentModal();
      }
    });
    document.getElementById('btn-save-comment').addEventListener('click', saveNewComment);

    // 确定保存新批注
    function saveNewComment() {
      const commentBody = commentTextarea.value.trim();
      if (!commentBody) {
        commentTextarea.focus();
        return;
      }

      const id = 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      // 计算所在就近章节标题
      let sectionTitle = '正文分析';
      if (currentSelectionRange) {
        let node = currentSelectionRange.startContainer;
        while (node && node !== document.body) {
          let prev = node.previousElementSibling;
          while (prev) {
            if (/^H[1-3]$/i.test(prev.tagName)) {
              sectionTitle = prev.textContent.trim();
              break;
            }
            prev = prev.previousElementSibling;
          }
          if (sectionTitle !== '正文分析') break;
          node = node.parentElement;
        }
      }

      // 实时包裹高亮 mark。
      // 跨段落选区不能交给 surroundContents（会抛 InvalidStateError），统一用
      // wrapRangeWithMarks 逐文本节点包裹；失败时再按引文文本兜底定位一次。
      let segments = 0;
      if (currentSelectionRange) {
        segments = wrapRangeWithMarks(
          currentSelectionRange,
          id,
          commentBody,
          'mark-' + id
        );
      }
      if (!segments) {
        segments = wrapRangeWithMarks(
          findTextRange(document.getElementById('report-content'), currentSelectedText) ||
            document.createRange(),
          id,
          commentBody,
          'mark-' + id
        );
      }

      const newComment = {
        id,
        quote: currentSelectedText,
        comment: commentBody,
        createdAt: new Date().toISOString(),
        sectionTitle
      };

      const comments = getStoredComments();
      comments.push(newComment);
      saveStoredComments(comments);

      closeCommentModal();
      attachMarkListeners();
      openCommentsDrawer(id);
      // 高亮片段为 0 说明引文无法在正文中定位（例如文本已变动）。
      // 批注本身仍然保存，但必须明确告知，否则用户会看到"存了却没划线"且毫无线索。
      showToast(
        segments
          ? \`✅ 批注已保存（\${segments > 1 ? \`跨段落 \${segments} 处已划线\` : '已划线'}）\`
          : '⚠️ 批注已保存，但未能在正文中定位该引文（文本可能已变动），刷新后也不会划线'
      );
    }

    // 抽屉开关交互
    function openCommentsDrawer(focusId = null) {
      commentsDrawer.classList.add('open');
      commentsDrawerBackdrop.style.display = 'block';
      if (focusId) {
        setTimeout(() => {
          const card = document.getElementById('card-' + focusId);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.remove('focused-card');
            void card.offsetWidth;
            card.classList.add('focused-card');
          }
        }, 200);
      }
    }

    function closeCommentsDrawer() {
      commentsDrawer.classList.remove('open');
      commentsDrawerBackdrop.style.display = 'none';
    }

    document.getElementById('btn-toggle-comments').addEventListener('click', () => {
      if (commentsDrawer.classList.contains('open')) {
        closeCommentsDrawer();
      } else {
        openCommentsDrawer();
      }
    });
    document.getElementById('btn-close-comments-drawer').addEventListener('click', closeCommentsDrawer);
    commentsDrawerBackdrop.addEventListener('click', closeCommentsDrawer);

    // 渲染批注清单
    function renderCommentsList(comments) {
      if (!commentsListContainer) return;
      if (comments.length === 0) {
        commentsListContainer.innerHTML = \`
          <div class="empty-comments">
            <div class="empty-icon">📝</div>
            <p style="font-weight: 600; font-size: 1rem;">暂无审阅批注</p>
            <p class="empty-tip">在正文任意段落滑动选中文字，即可唤起“添加批注”气泡记录见解，刷新或重开网页自动恢复，支持一键导出结构化报告。</p>
          </div>
        \`;
        return;
      }

      commentsListContainer.innerHTML = comments.map((c, idx) => {
        const timeStr = new Date(c.createdAt).toLocaleString('zh-CN', {
          month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        });
        const sectionBadge = c.sectionTitle ? \`<span class="comment-section-badge" title="\${c.sectionTitle}">\${c.sectionTitle}</span>\` : '';
        const quoteEscaped = c.quote.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const commentEscaped = c.comment.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        return \`
          <div class="comment-card" id="card-\${c.id}">
            <div class="comment-card-top">
              <div class="comment-meta-group">
                <strong style="color: var(--brand-blue); font-family: var(--font-mono);">#\${idx + 1}</strong>
                <span>\${timeStr}</span>
                \${sectionBadge}
              </div>
              <button class="btn-delete-comment" data-delete-id="\${c.id}" title="删除该条批注">🗑️</button>
            </div>
            <div class="comment-card-quote">“\${quoteEscaped}”</div>
            <div class="comment-card-body">\${commentEscaped}</div>
            <div class="comment-card-actions">
              <button class="btn-locate" data-locate-id="\${c.id}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>定位原文</span>
              </button>
            </div>
          </div>
        \`;
      }).join('');

      // 绑定卡片操作事件
      commentsListContainer.querySelectorAll('.btn-locate').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-locate-id');
          scrollToMark(id);
        });
      });

      commentsListContainer.querySelectorAll('.btn-delete-comment').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-delete-id');
          deleteComment(id);
        });
      });
    }

// 定位原文高亮 Mark。跨段落批注会有多个片段，按 data-comment-id 全部取出。
    function marksForComment(id) {
      return [...document.querySelectorAll(\`mark[data-comment-id="\${id}"]\`)];
    }

    // 解构（去掉 <mark> 保留文字）
    function unwrapMark(mark) {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
    }

    // 定位原文高亮 Mark
    function scrollToMark(id) {
      const marks = marksForComment(id);
      if (!marks.length) {
        showToast('⚠️ 未能在当前页面定位到该引用片段（可能文本变动）');
        return;
      }
      marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      marks.forEach(mark => {
        mark.classList.remove('pulse-highlight');
        void mark.offsetWidth;
        mark.classList.add('pulse-highlight');
      });
    }

    // 删除单条批注
    function deleteComment(id) {
      if (!confirm('确定删除这条审阅批注吗？')) return;
      let comments = getStoredComments();
      comments = comments.filter(c => c.id !== id);
      saveStoredComments(comments);

      // 解构正文中该批注的全部高亮片段（跨段落批注不止一个 <mark>）
      marksForComment(id).forEach(unwrapMark);
      showToast('🗑️ 批注已删除');
    }

    // 清空全部批注
    document.getElementById('btn-clear-all-comments').addEventListener('click', () => {
      const comments = getStoredComments();
      if (comments.length === 0) return;
      if (!confirm(\`确定清空全部 \${comments.length} 条审阅批注吗？此操作不可逆。\`)) return;

      localStorage.removeItem(STORAGE_KEY);
      document.querySelectorAll('.comment-highlight').forEach(unwrapMark);
      updateCommentBadges(0);
      renderCommentsList([]);
      showToast('🗑️ 全部批注已清空');
    });

    // 导出结构化 Markdown 文本
    document.getElementById('btn-export-markdown').addEventListener('click', () => {
      const comments = getStoredComments();
      if (comments.length === 0) {
        showToast('⚠️ 当前暂无批注可导出');
        return;
      }

      const now = new Date();
      const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);

      let md = \`# CCUS 规模化治理与 dMRV 报告 · 审阅研讨批注备忘录\\n\\n\`;
      md += \`> **报告标题**：\${document.title}\\n\`;
      md += \`> **导出时间**：\${dateStr}\\n\`;
      md += \`> **批注总计**：\${comments.length} 条\\n\\n\`;
      md += \`---\\n\\n\`;

      comments.forEach((c, idx) => {
        const cDate = new Date(c.createdAt).toLocaleString('zh-CN', { hour12: false });
        md += \`### [批注 \${String(idx + 1).padStart(2, '0')}] \${cDate}\\n\`;
        if (c.sectionTitle) {
          md += \`- **关联章节**：\${c.sectionTitle}\\n\`;
        }
        md += \`- **引述原文**：\\n\`;
        md += \`  > “\${c.quote}”\\n\`;
        md += \`- **审阅意见 / Comments**：\\n\`;
        md += \`  \${c.comment}\\n\\n\`;
      });

      md += \`---\\n\`;
      md += \`*本文档由 CCUS Policy Hub 学术智库审阅系统自动生成*\\n\`;

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`CCUS_Report_Comments_\${now.toISOString().substring(0, 10)}.md\`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('📥 批注 Markdown 文件已生成并下载！');
    });

    // 一键复制全部批注文本到剪贴板
    document.getElementById('btn-copy-comments').addEventListener('click', () => {
      const comments = getStoredComments();
      if (comments.length === 0) {
        showToast('⚠️ 当前暂无批注可复制');
        return;
      }

      const now = new Date();
      const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);
      let text = \`【CCUS 规模化治理与 dMRV 报告 · 审阅批注清单】\\n时间：\${dateStr} | 共 \${comments.length} 条\\n\\n\`;

      comments.forEach((c, idx) => {
        text += \`[批注 \${idx + 1}] (\${c.sectionTitle || '正文'})\\n\`;
        text += \`原文：“\${c.quote}”\\n\`;
        text += \`意见：\${c.comment}\\n\\n\`;
      });

      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 全部批注已成功复制到剪贴板！');
      }).catch(() => {
        showToast('❌ 复制失败，请检查剪贴板权限');
      });
    });

    // 页面重载时自动恢复高亮与批注 (Rehydration)
    function rehydrateComments() {
      const comments = getStoredComments();
      updateCommentBadges(comments.length);
      renderCommentsList(comments);

      const container = document.getElementById('report-content');
      if (!container) return;

      comments.forEach(cmt => {
        highlightTextInElement(container, cmt.quote, cmt.id, cmt.comment);
      });

      attachMarkListeners();
    }

    /**
     * 批注高亮底层工具
     *
     * 历史实现有两个缺陷，导致"跨自然段划词"完全失效（批注存进了 localStorage，
     * 但正文不出现下划线）：
     *   1) 实时高亮用 Range.surroundContents()。按 DOM 规范，只要 Range **部分包含**
     *      任何非文本节点就抛 InvalidStateError —— 跨段落选区必然部分包含 <p>，
     *      于是每次都进catch 分支。
     *   2) catch 里的兜底 highlightTextInElement 只在**单个文本节点**内做
     *      indexOf 查找。跨段落的引文在 DOM 里根本不属于同一个文本节点，永远匹配不到，
     *      返回 false，页面无任何高亮也没有报错。
     * 刷新后恢复（rehydrateComments）走的是同一个函数，因此跨段落批注在重载后
     * 同样无法还原。
     *
     * 现在改为：跨文本节点定位 Range + 逐文本节点包裹 <mark>。
     * 这样跨段落、跨 <strong>/<sup> 的选区都能正确落笔，且不再产生
     * "<mark> 里套 <p>" 这种非法结构（同一批注可以有多个高亮片段，
     * 通过 data-comment-id 关联）。
     */

    // 高亮禁区：脚本/按钮/已有批注内部不允许再次包裹
    const HIGHLIGHT_SKIP_SELECTOR = 'script, style, button, .comment-highlight';

    /**
     * 逐文本节点把 Range 包进 <mark>。返回生成的片段数。
     * 先固化 range 的起止锚点再改 DOM，避免 splitText 让偏移失效。
     */
    function wrapRangeWithMarks(range, id, commentText, markIdBase) {
      if (!range || range.collapsed) return 0;
      const root =
        range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
          ? range.commonAncestorContainer
          : range.commonAncestorContainer.parentElement;
      if (!root) return 0;

      const startNode = range.startContainer;
      const startOffset = range.startOffset;
      const endNode = range.endContainer;
      const endOffset = range.endOffset;

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          const p = node.parentElement;
          if (!p || p.closest(HIGHLIGHT_SKIP_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (!range.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      const targets = [];
      let n;
      while ((n = walker.nextNode())) targets.push(n);

      let segments = 0;
      for (const t of targets) {
        let s = 0;
        let e = t.nodeValue.length;
        if (t === startNode) s = startOffset;
        if (t === endNode) e = endOffset;
        if (e <= s) continue;

        let sub;
        try {
          sub = document.createRange();
          sub.setStart(t, s);
          sub.setEnd(t, e);
        } catch (err) {
          continue;
        }
        if (sub.collapsed) continue;

        const mark = document.createElement('mark');
        mark.className = 'comment-highlight';
        mark.setAttribute('data-comment-id', id);
        mark.id = markIdBase + (segments ? '-' + segments : '');
        mark.title = '批注：' + (commentText || '');
        // 先把内容搬进游离的 mark，再插入 DOM：appendChild 作用于脱离文档的节点，
        // 不会影响 sub.range 的位置。
        mark.appendChild(sub.extractContents());
        sub.insertNode(mark);
        segments++;
      }
      return segments;
    }

    /**
     * 在容器内按引文文本定位 Range，支持跨文本节点与跨段落。
     *
     * 空白处理是这个函数的关键。Selection.toString() 在跨段落时会插入换行，
     * 而 DOM 里两个 <p> 之间根本没有空白文本节点，"上一段结尾"与"下一段开头"
     * 是直接相接的。因此这里对两侧统一做**全量去空白**再比对，
     * 同时维护"去空白后的字符 -> 源位置"映射，把命中位置还原回真实 Range。
     */
    function findTextRange(container, needle) {
      if (!container || !needle) return null;
      // 注意：本文件整体被包在模板字符串里，正则里的空白类（反斜杠 + s）
      // 必须写成双反斜杠，否则模板字面量会把它吞成字母 s，生成出 /s+/ 这种坏正则。
      const target = needle.replace(/\\s+/g, '');
      if (target.length < 2) return null;

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          const p = node.parentElement;
          if (!p || p.closest(HIGHLIGHT_SKIP_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      const nodes = [];
      const map = [];
      let norm = '';
      let n;
      while ((n = walker.nextNode())) {
        const v = n.nodeValue;
        const nodeIdx = nodes.length;
        nodes.push(n);
        for (let i = 0; i < v.length; i++) {
          const ch = v[i];
          if (/\\s/.test(ch)) continue; // 空白一律丢弃，跨段落才能对上
          norm += ch;
          map.push([nodeIdx, i]);
        }
      }
      if (!norm) return null;

      let idx = norm.indexOf(target);
      if (idx === -1) return null;
      // 多次出现时取最后一次，便于与"就地高亮"的直觉一致
      while (norm.indexOf(target, idx + 1) !== -1) {
        idx = norm.indexOf(target, idx + 1);
      }

      const startPos = map[idx];
      let endPos = map[idx + target.length - 1];
      if (!startPos || !endPos) return null;
      // 命中末位若是代理对的高代理（emoji 等），不能从中间切断
      while (
        endPos &&
        nodes[endPos[0]].nodeValue.charCodeAt(endPos[1]) >= 0xd800 &&
        nodes[endPos[0]].nodeValue.charCodeAt(endPos[1]) <= 0xdbff
      ) {
        const at = map.indexOf(endPos);
        endPos = at >= 0 ? map[at + 1] : null;
        if (!endPos) break;
      }

      try {
        const range = document.createRange();
        range.setStart(nodes[startPos[0]], startPos[1]);
        range.setEnd(
          nodes[endPos[0]],
          Math.min(endPos[1] + 1, nodes[endPos[0]].nodeValue.length)
        );
        return range.collapsed ? null : range;
      } catch (err) {
        return null;
      }
    }

    // 文本树深度遍历恢复高亮（刷新后按引文重新定位，跨段落同样有效）
    function highlightTextInElement(container, quote, id, commentText) {
      const range = findTextRange(container, quote);
      if (!range) return false;
      return wrapRangeWithMarks(range, id, commentText, 'mark-' + id) > 0;
    }

    // 为所有 Mark 绑定点击事件（打开抽屉并聚焦该批注）
    function attachMarkListeners() {
      document.querySelectorAll('.comment-highlight').forEach(mark => {
        if (mark.dataset.listenerAttached) return;
        mark.dataset.listenerAttached = 'true';

        mark.addEventListener('click', (e) => {
          e.stopPropagation();
          const cmtId = mark.getAttribute('data-comment-id');
          openCommentsDrawer(cmtId);
        });
      });
    }

    // 初始化运行批注恢复
    rehydrateComments();

    // 附录 C：关键术语与缩略语互动过滤、即时检索与展开切换
    const glossaryContainer = document.getElementById('glossary-container');
    if (glossaryContainer) {
      const tabs = glossaryContainer.querySelectorAll('.glossary-tab');
      const searchInput = document.getElementById('glossary-search');
      const searchClear = document.getElementById('glossary-search-clear');
      const rows = glossaryContainer.querySelectorAll('.glossary-row');
      const countText = document.getElementById('glossary-count-text');
      const emptyState = document.getElementById('glossary-empty');
      const emptyQuery = document.getElementById('glossary-empty-query');
      const toggleExpand = document.getElementById('glossary-toggle-expand');
      const expandText = document.getElementById('glossary-expand-text');
      const scrollWrap = document.getElementById('glossary-scroll-wrap');

      let currentFilter = 'all';

      function applyGlossaryFilter() {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        if (searchClear) {
          searchClear.style.display = query ? 'block' : 'none';
        }

        let visibleCount = 0;

        rows.forEach((row) => {
          const rowType = row.getAttribute('data-type');
          const rowKeywords = row.getAttribute('data-keywords') || '';
          const matchesType = currentFilter === 'all' || rowType === currentFilter;
          const matchesQuery = !query || rowKeywords.includes(query);

          if (matchesType && matchesQuery) {
            row.style.display = '';
            visibleCount++;
          } else {
            row.style.display = 'none';
          }
        });

        if (countText) {
          if (query || currentFilter !== 'all') {
            countText.textContent = '当前筛选显示 ' + visibleCount + ' / ' + rows.length + ' 项术语规范';
          } else {
            countText.textContent = '显示全部 ' + rows.length + ' 项术语与缩略语规范';
          }
        }

        if (emptyState) {
          if (visibleCount === 0) {
            emptyState.style.display = 'block';
            if (emptyQuery) emptyQuery.textContent = query || '所选分类';
          } else {
            emptyState.style.display = 'none';
          }
        }
      }

      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          tabs.forEach((t) => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
          });
          tab.classList.add('active');
          tab.setAttribute('aria-selected', 'true');
          currentFilter = tab.getAttribute('data-filter') || 'all';
          applyGlossaryFilter();
        });
      });

      if (searchInput) {
        searchInput.addEventListener('input', applyGlossaryFilter);
      }

      if (searchClear) {
        searchClear.addEventListener('click', () => {
          searchInput.value = '';
          searchInput.focus();
          applyGlossaryFilter();
        });
      }

      if (toggleExpand && scrollWrap) {
        toggleExpand.addEventListener('click', () => {
          const isExpanded = scrollWrap.classList.toggle('is-expanded');
          toggleExpand.classList.toggle('is-expanded', isExpanded);
          if (expandText) {
            expandText.textContent = isExpanded ? '收起紧凑视图' : ('展开全部 (' + rows.length + ' 项)');
          }
        });
      }
    }

    // 附录 A–D 与参考文献：默认折叠，附小型展开按钮，避免页面过长
    (function initCollapsibleSections() {
      const root = document.getElementById('report-content');
      if (!root) return;

      const headings = Array.from(
        root.querySelectorAll('h1.appendix-h1, #references-container > h1')
      );
      if (!headings.length) return;

      const sections = [];

      const resolveHashTarget = (hash) => {
        if (!hash || hash.charAt(0) !== '#') return null;
        let id = hash.slice(1);
        try {
          id = decodeURIComponent(id);
        } catch (e) {
          /* 保留原始 id */
        }
        return document.getElementById(id);
      };

      const expandFor = (el) => {
        if (!el) return;
        // 1) 目标位于折叠体内部（引用、图表、表格锚点等）
        if (typeof el.closest === 'function') {
          const body = el.closest('.collapsible-body.is-collapsed');
          if (body) {
            const entry = sections.find((s) => s.body === body);
            if (entry) entry.setExpanded(true);
            return;
          }
        }
        // 2) 目标本身即折叠区标题（目录大纲链接常见）
        const byHeading = sections.find((s) => s.heading === el);
        if (byHeading) {
          byHeading.setExpanded(true);
          return;
        }
        // 3) 目标位于折叠区所属容器内（如 #references-container）
        if (typeof el.closest === 'function') {
          const entry = sections.find(
            (s) => s.heading.parentNode && s.heading.parentNode.contains(el)
          );
          if (entry) entry.setExpanded(true);
        }
      };

      headings.forEach((heading, i) => {
        if (!heading.id) heading.id = 'collapsible-section-' + i;

        // 收集标题之后、下一章节（h1/section）之前的所有兄弟节点
        const nodes = [];
        let node = heading.nextElementSibling;
        while (node) {
          if (node.tagName === 'H1' || node.tagName === 'SECTION') break;
          nodes.push(node);
          node = node.nextElementSibling;
        }
        if (!nodes.length) return;

        const body = document.createElement('div');
        body.className = 'collapsible-body is-collapsed';
        body.id = heading.id + '-panel';
        nodes.forEach((n) => body.appendChild(n));
        heading.parentNode.insertBefore(body, heading.nextSibling);

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'collapse-toggle';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', body.id);
        toggle.innerHTML =
          '<span class="collapse-toggle-label">展开</span>' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
        heading.appendChild(toggle);

        const entry = {
          heading,
          body,
          setExpanded(expanded) {
            body.classList.toggle('is-collapsed', !expanded);
            toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            const label = toggle.querySelector('.collapse-toggle-label');
            if (label) label.textContent = expanded ? '收起' : '展开';
          },
        };
        sections.push(entry);

        toggle.addEventListener('click', (e) => {
          e.preventDefault();
          entry.setExpanded(body.classList.contains('is-collapsed'));
        });
      });

      // 深链接（目录/引用跳转/分享锚点）自动展开目标所在折叠区
      window.addEventListener('hashchange', () =>
        expandFor(resolveHashTarget(location.hash))
      );
      document.addEventListener(
        'click',
        (e) => {
          const anchor =
            e.target && typeof e.target.closest === 'function'
              ? e.target.closest('a[href^="#"]')
              : null;
          if (!anchor) return;
          expandFor(resolveHashTarget(anchor.getAttribute('href')));
        },
        true
      );
      if (location.hash) expandFor(resolveHashTarget(location.hash));
    })();
  </script>
</body>
</html>`;

const finalOut = path.join(outDir, 'index.html');

// 写盘前硬门禁：任何结构问题都必须让流水线失败，而不是产出一个"看起来正常"的页面
const reportProblems = verifyReportStructure(template, texContent, {
  dataDir: outDir,
  stats: qcStats,
});
if (reportProblems.length) {
  console.error(
    `[sync-paper-report] ❌ 结构自检未通过（${reportProblems.length} 项），已中止写盘：`
  );
  for (const p of reportProblems) console.error(`  · ${p}`);
  process.exit(1);
}
console.log(
  `[sync-paper-report] ✅ 结构自检通过（${qcStats.length} 项改写命中数 + 正文结构体检）`
);

fs.writeFileSync(finalOut, template, 'utf8');

console.log(`[sync-paper-report] 全部流水线执行完毕！`);
console.log(`[sync-paper-report] 最终报告页面已保存至: ${finalOut}`);

// --- check --strict 模式：对整页做逐字节重生成比对（需与本机 Pandoc 版本一致） ---
if (checkMode && args.includes('--strict')) {
  const committed = fs.existsSync(committedHtmlPath)
    ? fs.readFileSync(committedHtmlPath, 'utf8')
    : null;
  const regenerated = fs.readFileSync(finalOut, 'utf8');

  // 素材指纹也逐项比对：只比 HTML 会漏掉"文字没变但配图换了"的情况。
  const committedManifestPath = path.join(
    path.dirname(committedHtmlPath),
    'assets-manifest.json'
  );
  const readManifestAssets = (p) => {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8')).assets || [];
    } catch {
      return null;
    }
  };
  const committedAssets = readManifestAssets(committedManifestPath);
  const regeneratedAssets = assetManifest;
  const assetsMatch =
    committedAssets !== null &&
    JSON.stringify(committedAssets) === JSON.stringify(regeneratedAssets);

  const committedPdfPath = path.join(
    path.dirname(committedHtmlPath),
    'paper_draft.pdf'
  );
  const regeneratedPdfPath = path.join(outDir, 'paper_draft.pdf');
  const pdfComparable =
    fs.existsSync(committedPdfPath) && fs.existsSync(regeneratedPdfPath);
  const pdfMatches = pdfComparable
    ? fs
        .readFileSync(committedPdfPath)
        .equals(fs.readFileSync(regeneratedPdfPath))
    : null;

  const htmlMatches = committed === regenerated;
  if (htmlMatches && assetsMatch && pdfMatches !== false) {
    console.log(
      `[sync-paper-report][check] ✅ 已提交页面与最新 paper draft 一致 (paper draft sha256:${texSha})`
    );
    process.exit(0);
  }

  if (committed === null) {
    console.error(
      `[sync-paper-report][check] ❌ 未找到已提交页面: ${committedHtmlPath}`
    );
    process.exit(1);
  }

  console.error(
    `[sync-paper-report][check] ❌ 检测到漂移：已提交产物与最新 paper draft 不一致。`
  );
  if (!htmlMatches) {
    const sha = (s) =>
      crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
    console.error(
      `[sync-paper-report][check]   index.html 已提交 : ${sha(committed)}`
    );
    console.error(
      `[sync-paper-report][check]   index.html 应生成 : ${sha(regenerated)}`
    );
  }
  if (!assetsMatch) {
    console.error(
      `[sync-paper-report][check]   assets-manifest.json 不一致（配图来源/指纹漂移）`
    );
    console.error(
      `[sync-paper-report][check]     已提交: ${JSON.stringify(committedAssets)}`
    );
    console.error(
      `[sync-paper-report][check]     应生成: ${JSON.stringify(regeneratedAssets)}`
    );
  }
  if (pdfMatches === false) {
    console.error(
      `[sync-paper-report][check]   paper_draft.pdf 与最新交付 PDF 不一致`
    );
  }
  console.error(
    `[sync-paper-report][check]   请运行 \`pnpm report:sync\` 重新生成并提交 public/reports/${slug}/ 下的 index.html、assets-manifest.json 与 paper_draft.pdf。`
  );
  process.exit(1);
}

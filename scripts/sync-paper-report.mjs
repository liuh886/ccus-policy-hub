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
import { renderEsg30ReportTemplate } from './lib/esg30-report-template.mjs';

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
  const normalizedPath = remotePath.replace(/\\/g, '/');
  const res = spawnSync(
    'gh',
    [
      'api',
      `repos/${repo}/contents/${encodeURI(normalizedPath)}`,
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
  const normalizedPath = remotePath.replace(/\\/g, '/');
  const res = spawnSync(
    'gh',
    [
      'api',
      `repos/${repo}/contents/${encodeURI(normalizedPath)}`,
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

  // 清理不再引用的历史遗留配图（防止配图重命名后旧图长期滞留在磁盘与 git 中）
  const targetDataDir = path.join(outDir, 'data');
  if (fs.existsSync(targetDataDir)) {
    const keepBasenames = new Set(
      referencedImages.map((img) => path.basename(img))
    );
    for (const f of fs.readdirSync(targetDataDir)) {
      const p = path.join(targetDataDir, f);
      if (fs.statSync(p).isFile() && !keepBasenames.has(f)) {
        try {
          fs.unlinkSync(p);
          console.log(`[sync-paper-report] 🗑️ 已清理过期配图: data/${f}`);
        } catch (e) {
          console.warn(
            `[sync-paper-report] ⚠️ 清理过期配图失败: data/${f} (${e.message})`
          );
        }
      }
    }
  }
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
    controls: '左右滑动查看全部',
    scrollHintId: 'table-scroll-hint-pill',
  },
  // 附录 B 关键主张—证据边界映射矩阵
  'tab:claims_evidence_mapping': {
    tableClass: 'standard-table table-claims-mapping',
    hint: (inner) => `${countDataRows(inner)} 项核心论断`,
  },
  // 附录 A 全球 CCUS 项目分布与统计口径数据表
  'tab:global_ccus_distribution': {
    tableClass: 'table-dist-data',
    title: '已运行与在建项目分布',
    hint: '6 大重点法域及其他地区汇总',
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
    const title = (tweak && tweak.title) || meta.title;

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
            <button type="button" class="table-nav-btn" id="btn-scroll-table-left" title="向左滚动" aria-label="向左滚动">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button type="button" class="table-nav-btn" id="btn-scroll-table-right" title="向右滚动" aria-label="向右滚动">
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
            <a href="#cite-return-${key}" class="ref-back-link" title="返回正文">↩ 返回正文</a>
          </div>
        </div>
      </div>
    `;
    })
    .join('\n');

  referencesHtml = `
    <section id="references-container" class="references-container">
      <h1 class="unnumbered" id="参考文献">
        参考文献
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
  let title = m[2].trim();
  // 附录 A 标题简明化：去除冗余前缀“全球 CCUS ”，提炼为紧凑的“项目分布与统计口径”
  if (letter === 'A') {
    title = title.replace(/^全球\s*CCUS\s*/, '');
  }
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

// 1. 移除 Pandoc 冗余 titlepage 与重复关键词，注入图文摘要卡片
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
      <span>图文摘要</span>
    </div>
    <span class="ga-tip">🔍 点击放大</span>
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

// Keep the constraints transition as a paragraph, with the same visual treatment
// as the preceding unnumbered leads. Do not add a heading or a TOC entry.
bodyHtml = bodyHtml.replace(
  /<p>\s*<strong>(贯穿上述系统问题的，还有两项性质不同的关键约束：能源惩罚与首发风险。)<\/strong>\s*<\/p>/g,
  '<p class="report-lead"><strong>$1</strong></p>'
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
const template = renderEsg30ReportTemplate({
  DOC_TITLE: docTitle,
  PROGRAM_NAME: programName,
  TEX_SHA: texSha,
  PDF_PAGE_SUFFIX: pdfPageCount ? ` (${pdfPageCount} 页)` : '',
  REPORT_TYPE: reportType,
  REPORT_VERSION: reportVersion,
  DOC_AUTHOR: docAuthor,
  DOC_DATE: docDate,
  CHAR_COUNT_K: Math.round(charCount / 1000),
  READ_MINUTES: readMinutes,
  ABSTRACT_TEXT: abstractText,
  KEYWORDS_TEXT: keywordsText,
  BODY_HTML: bodyHtml,
  SLUG: slug,
});

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

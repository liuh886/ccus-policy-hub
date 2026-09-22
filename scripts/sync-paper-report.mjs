import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import path from 'path';
import { execSync, spawnSync } from 'child_process';

/**
 * sync-paper-report.mjs
 *
 * 一键可复用的学术报告转换与同步管道：
 * 1. 支持从 GitHub 仓库（通过 gh api）或本地路径读取 .tex 源码与配图
 * 2. 自动调用 pandoc (--number-sections) 编译为带严谨章节编号的结构化语义 HTML
 * 3. 自动解析 \begin{thebibliography}，将正文空缺引用修复为标准 [1], [2, 3] 可点击链接
 * 4. 注入即时浮窗气泡 (Citation Tooltip)、跳转高亮反馈与文末编号式参考文献列表
 * 5. 自动调用 xelatex 生成 100% 矢量的原版 PDF 交付物（页数自动识别）
 * 6. 注入现代学术级 UI 框架（交互式目录、图片全屏放大、深浅色模式、BibTeX 一键复制等）
 *
 * 用法:
 *   node scripts/sync-paper-report.mjs [--repo liuh886/2601_ESG30] [--slug 2601_ESG30] [--local-tex path/to/file.tex] [--skip-pdf]
 *   node scripts/sync-paper-report.mjs --check
 *     --check: 环境无关的漂移检查。读取已提交页面内的 paper-source 溯源指纹（及 PDF）
 *              与最新 paper draft 比对，不一致则以退出码 1 报告，不修改工作区文件。
 *   node scripts/sync-paper-report.mjs --check --strict
 *     --strict: 额外在临时目录整页重新生成并逐字节比对（要求与本机 Pandoc 版本一致）。
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

const committedHtmlPath = path.resolve('public/reports', slug, 'index.html');
const outDir = checkMode
  ? fs.mkdtempSync(path.join(os.tmpdir(), `ccus-report-check-${slug}-`))
  : path.resolve('public/reports', slug);
const outDataDir = path.join(outDir, 'data');
fs.mkdirSync(outDataDir, { recursive: true });

console.log(`[sync-paper-report] 开始处理报告: ${slug}`);
console.log(
  `[sync-paper-report] 目标输出目录: ${outDir}${checkMode ? ' (check 模式，仅临时目录)' : ''}`
);

const defaultLocalTex =
  'D:/Documents/zhihaol/100_Project/2601_ESG30/ESG30/paper_draft.tex';
const defaultLocalPdf =
  'D:/Documents/zhihaol/100_Project/2601_ESG30/ESG30/output/ESG30_dMRV_Report_v3.4.pdf';
const defaultLocalDataDir =
  'D:/Documents/zhihaol/100_Project/2601_ESG30/ESG30/data';
// 本机已构建 PDF 路径（可用 --local-pdf 覆盖；传不存在路径可强制走远端拉取/编译）
const localPdfPath = getArg('--local-pdf', null) || defaultLocalPdf;
// 远端（ESG30 仓库）中已构建 PDF 的位置；本地无 PDF 时（如 CI）从此处拉取。
// 传 'latest' 或该路径不存在时，自动在 output/ 下挑选版本号最高的 PDF。
const pdfRemotePath = getArg('--pdf-remote-path', 'latest');

let texContent = '';

// --- 1. 获取 TeX 源码与图片资源 ---
const candidateLocalTex =
  localTex || (fs.existsSync(defaultLocalTex) ? defaultLocalTex : null);
if (candidateLocalTex && fs.existsSync(candidateLocalTex)) {
  console.log(
    `[sync-paper-report] 优先使用本机最新 3.4 TeX 源码: ${candidateLocalTex}`
  );
  texContent = fs.readFileSync(candidateLocalTex, 'utf8');
} else {
  console.log(
    `[sync-paper-report] 从 GitHub 私有/公开仓库获取 TeX 源码: ${repo}...`
  );
  try {
    texContent = execSync(
      `gh api repos/${repo}/contents/paper_draft.tex -H "Accept: application/vnd.github.v3.raw"`,
      {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
      }
    );
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
    console.error(`[sync-paper-report] 获取 GitHub 源码失败:`, err.message);
    process.exit(1);
  }
}

// 源码指纹：用于在页面内标注所依据的 paper draft 版本，并支撑 --check 漂移比对
const texSha = crypto
  .createHash('sha256')
  .update(texContent)
  .digest('hex')
  .slice(0, 16);
console.log(`[sync-paper-report] paper draft sha256(前16位): ${texSha}`);

// 提取并下载 TeX 中引用到的图片
const imgMatches = [
  ...texContent.matchAll(/\\includegraphics(?:\[.*?\])?\{([^}]+)\}/g),
];
const referencedImages = [...new Set(imgMatches.map((m) => m[1]))];
console.log(`[sync-paper-report] 检测到引用图片:`, referencedImages);

for (const relImg of referencedImages) {
  const destImgPath = path.join(outDir, relImg);
  fs.mkdirSync(path.dirname(destImgPath), { recursive: true });

  // 优先从本机 ESG30/data 目录复制最新高清素材
  const localCand = path.join(defaultLocalDataDir, path.basename(relImg));
  if (fs.existsSync(localCand)) {
    fs.copyFileSync(localCand, destImgPath);
    console.log(`[sync-paper-report] 从本机最新数据源同步图片: ${localCand}`);
    continue;
  }

  if (fs.existsSync(destImgPath) && fs.statSync(destImgPath).size > 0) {
    continue;
  }

  // 尝试从相对本地或 GitHub 下载
  if (fs.existsSync(relImg)) {
    fs.copyFileSync(relImg, destImgPath);
    console.log(`[sync-paper-report] 从相对路径复制图片: ${relImg}`);
  } else {
    console.log(
      `[sync-paper-report] 从 GitHub API 下载二进制图片: ${relImg}...`
    );
    try {
      const pyCmd = `python -c "import subprocess, os; f='${relImg}'; t='${destImgPath.replace(/\\/g, '/')}'; out=open(t,'wb'); subprocess.run(['gh','api',f'repos/${repo}/contents/{f}','-H','Accept: application/vnd.github.v3.raw'], stdout=out); out.close()"`;
      execSync(pyCmd);
      console.log(
        `[sync-paper-report] 下载完成: ${destImgPath} (${fs.statSync(destImgPath).size} bytes)`
      );
    } catch (e) {
      console.warn(`[sync-paper-report] 下载图片失败 ${relImg}:`, e.message);
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
  extractMeta(/\\newcommand\{\\ReportVersion\}\{([^}]+)\}/) || 'v3.4';
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

// 通过 gh api 下载仓库内二进制文件
function fetchRemoteBinary(remotePath, destPath) {
  const buf = execSync(
    `gh api "repos/${repo}/contents/${remotePath}" -H "Accept: application/vnd.github.v3.raw"`,
    { maxBuffer: 256 * 1024 * 1024, encoding: 'buffer' }
  );
  fs.writeFileSync(destPath, buf);
}

// 解析 ESG30 仓库 output/ 下版本号最高的已构建 PDF
function resolveLatestRemotePdf() {
  const names = execSync(
    `gh api "repos/${repo}/contents/output" --jq ".[].name"`,
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
  )
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((n) => /^ESG30_dMRV_Report_v[\d.]+\.pdf$/.test(n));
  if (!names.length) return null;
  const versionOf = (n) =>
    n
      .match(/v([\d.]+)\.pdf$/)[1]
      .split('.')
      .map((x) => parseInt(x, 10) || 0);
  names.sort((a, b) => {
    const va = versionOf(a);
    const vb = versionOf(b);
    for (let i = 0; i < Math.max(va.length, vb.length); i++) {
      const d = (va[i] || 0) - (vb[i] || 0);
      if (d) return d;
    }
    return 0;
  });
  return `output/${names[names.length - 1]}`;
}

if (fs.existsSync(localPdfPath)) {
  fs.copyFileSync(localPdfPath, pdfDest);
  console.log(
    `[sync-paper-report] 直接同步本机最新 3.4 原版 PDF: ${pdfDest} (${(fs.statSync(pdfDest).size / 1024 / 1024).toFixed(2)} MB)`
  );
} else if (!skipPdf) {
  // 本地无 PDF（例如 CI 环境）：优先从 ESG30 仓库直接拉取已构建的 PDF
  let pdfFetched = false;
  try {
    let remotePdf = pdfRemotePath;
    if (!remotePdf || remotePdf === 'latest') {
      remotePdf = resolveLatestRemotePdf();
    }
    if (remotePdf) {
      fetchRemoteBinary(remotePdf, pdfDest);
      pdfFetched = fs.existsSync(pdfDest) && fs.statSync(pdfDest).size > 0;
      if (pdfFetched) {
        console.log(
          `[sync-paper-report] 已从 ${repo} 拉取 PDF: ${remotePdf} (${(fs.statSync(pdfDest).size / 1024 / 1024).toFixed(2)} MB)`
        );
      }
    }
  } catch (err) {
    console.warn(`[sync-paper-report] 从远端拉取 PDF 失败:`, err.message);
  }

  if (!pdfFetched) {
    try {
      const checkXe = spawnSync('xelatex', ['--version']);
      if (checkXe.status === 0) {
        console.log(
          `[sync-paper-report] 检测到本机已安装 xelatex，正在构建高保真原版 PDF...`
        );
        const tempTex = path.join(outDir, 'source.tex');
        fs.writeFileSync(tempTex, texContent, 'utf8');

        console.log(`[sync-paper-report] 编译 PDF 第一遍...`);
        execSync(
          `xelatex -interaction=nonstopmode -output-directory="${outDir}" "${tempTex}"`,
          { stdio: 'ignore' }
        );
        console.log(`[sync-paper-report] 编译 PDF 第二遍 (解析目录与引用)...`);
        execSync(
          `xelatex -interaction=nonstopmode -output-directory="${outDir}" "${tempTex}"`,
          { stdio: 'ignore' }
        );

        const genPdf = path.join(outDir, 'source.pdf');
        if (fs.existsSync(genPdf)) {
          fs.renameSync(genPdf, pdfDest);
          console.log(
            `[sync-paper-report] PDF 编译成功: ${pdfDest} (${(fs.statSync(pdfDest).size / 1024 / 1024).toFixed(2)} MB)`
          );
        }

        for (const ext of ['.aux', '.log', '.out', '.toc']) {
          const f = path.join(outDir, 'source' + ext);
          if (fs.existsSync(f)) fs.unlinkSync(f);
        }
        if (fs.existsSync(tempTex)) fs.unlinkSync(tempTex);
      }
    } catch (err) {
      console.warn(`[sync-paper-report] PDF 编译跳过或告警:`, err.message);
    }
  }
}

// 尽力从 PDF 解析实际页数，供模板文案使用；解析失败返回 null，避免硬编码页数随版本漂移
function detectPdfPageCount(pdfPath) {
  if (!pdfPath || !fs.existsSync(pdfPath)) return null;
  const posixPath = pdfPath.replace(/\\/g, '/');
  try {
    const pySnippet = `import importlib.util;mod=__import__('pypdf') if importlib.util.find_spec('pypdf') else __import__('PyPDF2');print(len(mod.PdfReader(r'${posixPath}').pages))`;
    const out = execSync(`python -c "${pySnippet}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const n = parseInt(out, 10);
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    // 忽略，继续尝试下一种方式
  }
  try {
    const out = execSync(`pdfinfo "${pdfPath}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const m = out.match(/Pages:\s*(\d+)/);
    if (m) return parseInt(m[1], 10);
  } catch {
    // 忽略，回退到无页数文案
  }
  return null;
}
const pdfPageCount = detectPdfPageCount(pdfDest);
if (pdfPageCount) {
  console.log(`[sync-paper-report] PDF 实际页数识别为 ${pdfPageCount} 页`);
}

// 嵌套括号感知的 \shortstack 清洗函数，避免非贪婪正则因 \textbf{} 嵌套提前截断
function replaceNestedShortstack(str) {
  let result = '';
  let i = 0;
  while (i < str.length) {
    if (str.startsWith('\\shortstack{', i)) {
      let depth = 1;
      let startInner = i + '\\shortstack{'.length;
      let j = startInner;
      while (j < str.length && depth > 0) {
        if (str[j] === '{' && str[j - 1] !== '\\') depth++;
        else if (str[j] === '}' && str[j - 1] !== '\\') depth--;
        j++;
      }
      let inner = str.slice(startInner, j - 1);
      let cleanInner = inner.replace(/\\\\/g, ' ');
      result += cleanInner;
      i = j;
    } else {
      result += str[i];
      i++;
    }
  }
  return result;
}

// --- check 模式（默认，环境无关）：用页面内溯源指纹与 PDF 比对，不依赖 Pandoc 版本 ---
// 仅在 --strict 时才对整页做逐字节重生成比对。
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
    if (fs.existsSync(localPdfPath)) {
      refPdf = localPdfPath;
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
    if (refPdf) {
      const same = fs
        .readFileSync(committedPdf)
        .equals(fs.readFileSync(refPdf));
      if (!same) {
        fail(
          `已提交 paper_draft.pdf 与最新交付 PDF 不一致。请运行 \`pnpm report:sync:full\`。`
        );
      }
    }
    if (tmpRefPdf && fs.existsSync(tmpRefPdf)) fs.unlinkSync(tmpRefPdf);
  }

  console.log(
    `[sync-paper-report][check] ✅ 已提交页面与最新 paper draft 一致 (paper draft sha256:${texSha})`
  );
  process.exit(0);
}

// --- 4. 调用 Pandoc (--number-sections) 编译为 HTML ---
console.log(
  `[sync-paper-report] 调用 Pandoc 进行 TeX -> HTML 语法转换 (启用 --number-sections 与 --wrap=none)...`
);
let preprocessedTex = texContent;

// 1. 预处理 Appendix A 表格 (tab:global_ccus_distribution)：
// 将 tabularx 转换为标准 tabular{lcccccc}，并清洗 \shortstack 嵌套结构，
// 防止 Pandoc 因无法解析复杂列修饰与 shortstack 换行导致多列数据单元格严重丢失。
// 以稳定的 \label 锚定，避免 TeX 改版后 caption 文案变化导致预处理被静默跳过。
preprocessedTex = preprocessedTex.replace(
  /(\\begin\{table\}[h!]?[\s\S]*?\\label\{tab:global_ccus_distribution\}[\s\S]*?)\\begin\{tabularx\}\{[^}]*\}\{[\s\S]*?\n([\s\S]*?)\\end\{tabularx\}/g,
  (m, tableHeader, innerContent) => {
    const cleanContent = replaceNestedShortstack(innerContent);
    return `${tableHeader}\\begin{tabular}{lcccccc}\n${cleanContent}\\end{tabular}`;
  }
);

// 2. 预处理 Appendix B 表格（关键主张与证据边界映射 longtable）：
// 移除 \rowcolors 与 longtable 重复表头 (\midrule\endfirsthead ... \endhead)，
// 消除 Pandoc 转换后表头连续重复两次且无 <thead> 的缺陷。
// 以全局唯一的 \begin{longtable} 块锚定（\rowcolors 在全文出现多次，不能裸替换）。
preprocessedTex = preprocessedTex.replace(
  /(\\begin\{longtable\}[\s\S]*?)\\rowcolors\{[^}]*\}\{[^}]*\}\{[^}]*\}[\s\n]*\\\\/g,
  '$1'
);
preprocessedTex = preprocessedTex.replace(
  /(\\begin\{longtable\}[\s\S]*?)\\midrule[\s\n]*\\endfirsthead[\s\S]*?\\endhead/g,
  '$1'
);

// 3. 保护正文/表格中的中文方括号标记（如 [本文分析]、[项目披露]、[本文建议]）。
// Pandoc 在解析 longtable 时会将行首的 [xxx] 误当作 \\ 的可选参数而静默丢弃，
// 用 {[}...{]} 包裹后可确保方括号原样保留并正常渲染。
preprocessedTex = preprocessedTex.replace(
  /\[([\u4e00-\u9fff][^\]\r\n]{0,20})\]/g,
  '{[}$1{]}'
);

const tempTexPath = path.join(outDir, '_temp_build.tex');
fs.writeFileSync(tempTexPath, preprocessedTex, 'utf8');

const tempHtmlPath = path.join(outDir, '_temp_body.html');
try {
  execSync(
    `pandoc "${tempTexPath}" --number-sections --mathjax --wrap=none -o "${tempHtmlPath}"`,
    { stdio: 'inherit' }
  );
} catch (e) {
  console.error(`[sync-paper-report] Pandoc 转换失败:`, e.message);
  process.exit(1);
}

let bodyHtml = fs.readFileSync(tempHtmlPath, 'utf8');
fs.unlinkSync(tempTexPath);
fs.unlinkSync(tempHtmlPath);

// 修正相对图片路径
bodyHtml = bodyHtml.replace(/src="data\//g, 'src="./data/');

// --- 表格排版与横向宽表对标矩阵深度优化 ---
console.log(
  `[sync-paper-report] 正在优化数据表格排版并解决 [tab:governance_benchmark] 宽度局促问题...`
);

// 1. 移除 Pandoc 误生成的内联 table width 限制 (例如 style="width:12%;") 和 col 限制
bodyHtml = bodyHtml.replace(/<table[^>]*style="[^"]*"[^>]*>/g, '<table>');
bodyHtml = bodyHtml.replace(/<col style="width:[^"]*" \/>/g, '<col />');

// 2. 特别重构 tab:governance_benchmark: 移除提示，注入精致卡片、表头工具栏、平滑横向滚动视口与底栏
const benchRegex =
  /<div class="landscape">\s*<div class="center">\s*<p><span\s+id="tab:governance_benchmark"[\s\S]*?<\/span><\/p>\s*<table>([\s\S]*?)<\/table>\s*(<p><em>注：[\s\S]*?<\/em><\/p>)?\s*<\/div>\s*<\/div>/;
let benchmarkMatched = false;
bodyHtml = bodyHtml.replace(benchRegex, (match, innerTable, notesP) => {
  benchmarkMatched = true;
  const cleanNotes = notesP
    ? notesP.replace(/^<p><em>注：\s*/, '').replace(/<\/em><\/p>$/, '')
    : '';
  return `
    <div class="table-container-card table-breakout" id="tab:governance_benchmark">
      <div class="table-card-toolbar">
        <div class="table-card-title-group">
          <span class="table-badge">表 2-1</span>
          <span class="table-title">全球主要法域 CCUS 治理对标表（2026）</span>
        </div>
        <div class="table-card-controls">
          <span class="table-scroll-hint-pill" id="table-scroll-hint-pill">↔️ 左右滑动查看全部 7 法域</span>
          <div class="table-nav-btns">
            <button type="button" class="table-nav-btn" id="btn-scroll-table-left" title="向左滚动对标表" aria-label="向左滚动">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button type="button" class="table-nav-btn" id="btn-scroll-table-right" title="向右滚动对标表" aria-label="向右滚动">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div class="table-responsive-wrapper table-benchmark-wrapper" id="benchmark-table-wrapper">
        <table class="table-benchmark">
          ${innerTable}
        </table>
      </div>
      ${
        cleanNotes
          ? `
      <div class="table-notes-footer">
        <span class="note-tag">注</span>
        <div class="note-text"><em>注：</em>${cleanNotes}</div>
      </div>`
          : ''
      }
    </div>
  `;
});

// 兜底：若未匹配到 landscape 容器，按局部 table 标签匹配
if (!benchmarkMatched) {
  bodyHtml = bodyHtml.replace(
    /<p><span\s+id="tab:governance_benchmark"[\s\S]*?<\/span><\/p>\s*<table>([\s\S]*?)<\/table>/,
    (m, inner) => `
      <div class="table-container-card table-breakout" id="tab:governance_benchmark">
        <div class="table-card-toolbar">
          <div class="table-card-title-group">
            <span class="table-badge">表 2-1</span>
            <span class="table-title">全球主要法域 CCUS 治理对标表（2026）</span>
          </div>
          <div class="table-card-controls">
            <span class="table-scroll-hint-pill" id="table-scroll-hint-pill">↔️ 左右滑动查看全部 7 法域</span>
            <div class="table-nav-btns">
              <button type="button" class="table-nav-btn" id="btn-scroll-table-left" title="向左滚动对标表" aria-label="向左滚动">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button type="button" class="table-nav-btn" id="btn-scroll-table-right" title="向右滚动对标表" aria-label="向右滚动">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="table-responsive-wrapper table-benchmark-wrapper" id="benchmark-table-wrapper">
          <table class="table-benchmark">${inner}</table>
        </div>
      </div>
    `
  );
}

// 3. 重构附录 A 全球 CCUS 项目分布与统计口径数据表 (tab:global_ccus_distribution)
const distRegex =
  /<div id="tab:global_ccus_distribution">\s*<table>\s*<caption>([\s\S]*?)<\/caption>([\s\S]*?)<\/table>\s*<\/div>(?:\s*<p>(<strong>(?:口径说明|口径与筛选说明)：<\/strong>[\s\S]*?)<\/p>)?/;
bodyHtml = bodyHtml.replace(distRegex, (m, caption, innerTable, notesP) => {
  // 表头单元格通用归一化：把 \shortstack 产生的多个 <strong> 片段折叠为 <br/> 分隔，
  // 并去除内层 <strong>，避免因列名文案改版（如“项目数”→“项目记录数”）而失配。
  let formattedInner = innerTable.replace(
    /<th\b([^>]*)>([\s\S]*?)<\/th>/g,
    (m, attrs, cell) => {
      const joined = cell
        .replace(/<\/strong>\s*<strong>/g, '<br/>')
        .replace(/<\/?strong>/g, '')
        .replace(
          /<span class="math inline">\\?\(_2\\?\)<\/span>/g,
          '<sub>2</sub>'
        );
      return `<th${attrs}>${joined}</th>`;
    }
  );

  const notesHtml = notesP
    ? `
    <div class="table-notes-footer">
      <span class="note-tag">注</span>
      <div class="note-text">${notesP}</div>
    </div>`
    : '';

  return `
    <div class="table-container-card" id="tab:global_ccus_distribution">
      <div class="table-card-toolbar">
        <div class="table-card-title-group">
          <span class="table-badge">附录 A 表</span>
          <span class="table-title">${caption.trim()}</span>
        </div>
        <span class="table-scroll-hint-pill">全球 6 大重点法域及其他地区汇总</span>
      </div>
      <div class="table-responsive-wrapper">
        <table class="table-dist-data">
          ${formattedInner}
        </table>
      </div>
      ${notesHtml}
    </div>
  `;
});

// 4. 重构附录 B 关键主张与证据边界映射表：彻底消除重复表头，构建高阶 4 列语义映射矩阵
// 以 caption 的语义特征（含“核心主张”与“证据边界”）结构锚定，标题直接取自 caption，
// 避免 TeX 改版调整 caption 文案后匹配失败。
const claimsRegex =
  /<table[^>]*>\s*<caption>([^<]*核心主张[^<]*证据边界[^<]*)<\/caption>([\s\S]*?)<\/table>/;
bodyHtml = bodyHtml.replace(claimsRegex, (m, caption, inner) => {
  const rows = [...inner.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) => r[0]);
  // 严格过滤掉所有表头行，杜绝任何重复表头进入 tbody
  const dataRows = rows.filter((r) => !r.includes('<strong>核心主张</strong>'));
  const claimsTitle = caption.trim();
  const claimsCount = dataRows.length;

  return `
    <div class="table-container-card" id="tab:appendix_b_claims_mapping">
      <div class="table-card-toolbar">
        <div class="table-card-title-group">
          <span class="table-badge">附录 B 表</span>
          <span class="table-title">${claimsTitle}</span>
        </div>
        <span class="table-scroll-hint-pill">${claimsCount} 项核心论断与证据映射</span>
      </div>
      <div class="table-responsive-wrapper">
        <table class="standard-table table-claims-mapping">
          <thead>
            <tr>
              <th style="width: 22%;">核心主张</th>
              <th style="width: 26%;">规则、标准或方法学依据</th>
              <th style="width: 24%;">案例事实或正文分析位置</th>
              <th style="width: 28%;">支持程度与证据边界</th>
            </tr>
          </thead>
          <tbody>
            ${dataRows.join('\n')}
          </tbody>
        </table>
      </div>
    </div>
  `;
});

// 5. 为正文中的每一张数据表注入卡片式表头（含表号徽标），
// 使正文交叉引用与表格本体一一对应，避免“有引用、无表号”或“未被当作表格”的断层。
// 表号按章节内出现顺序编排（表 2-x / 表 3-x / 表 4-x）。
const numberedTables = {
  'tab:dmrv_minimum_fields': '表 3-1',
  'tab:continuous_evidence_monitoring': '表 3-2',
  'tab:dmrv_governance_mapping': '表 3-3',
  'tab:case_evidence_comparison': '表 4-1',
};
// 少数表格在 TeX 中未加 \label，仅能依据 caption 文案匹配表号并补一个锚点 id。
const captionBadges = {
  '中国 CCUS 集群治理的现实基础与待补功能': {
    badge: '表 2-2',
    id: 'tab:china_cluster_governance',
  },
};

function buildTableCard(idAttr, badge, caption, inner) {
  const badgeHtml = badge ? `<span class="table-badge">${badge}</span>` : '';
  return `
    <div class="table-container-card"${idAttr}>
      <div class="table-card-toolbar">
        <div class="table-card-title-group">
          ${badgeHtml}
          <span class="table-title">${caption.trim()}</span>
        </div>
      </div>
      <div class="table-responsive-wrapper">
        <table class="standard-table table-numbered">
          ${inner}
        </table>
      </div>
    </div>
  `;
}

// 5a. 带 \label 的表（Pandoc 输出形如 <div id="tab:X"><table><caption>…</caption>…）
for (const [label, badge] of Object.entries(numberedTables)) {
  const re = new RegExp(
    `<div id="${label}">\\s*<table[^>]*>\\s*<caption>([\\s\\S]*?)<\\/caption>([\\s\\S]*?)<\\/table>\\s*<\\/div>`
  );
  bodyHtml = bodyHtml.replace(re, (m, caption, inner) =>
    buildTableCard(` id="${label}"`, badge, caption, inner)
  );
}

// 5b. 未加 \label 但有 caption 的表（如“中国 CCUS 集群治理的现实基础与待补功能”）
bodyHtml = bodyHtml.replace(
  /<table[^>]*>\s*<caption>([\s\S]*?)<\/caption>([\s\S]*?)<\/table>/g,
  (m, caption, inner) => {
    const meta = captionBadges[caption.trim()];
    if (!meta) return m;
    return buildTableCard(` id="${meta.id}"`, meta.badge, caption, inner);
  }
);

// 6. 将所有其它未包裹的 <table> 包裹进响应式容器
bodyHtml = bodyHtml.replace(/<table>([\s\S]*?)<\/table>/g, (match, inner) => {
  return `<div class="table-responsive-wrapper"><table class="standard-table">${inner}</table></div>`;
});

// 4. 修复正文中的图表交叉引用标签 (data-reference)
// 注意：TeX 原文写作“表~\ref{...}”“图~\ref{...}”，Pandoc 会生成独立链接。
// 因此需连同前置的“表/图”一并替换，避免出现“表 表 2-1”式重复。
bodyHtml = bodyHtml.replace(
  /表[\s\u00a0]*<a href="#tab:governance_benchmark"[^>]*>\[tab:governance_benchmark\]<\/a>/g,
  '<a href="#tab:governance_benchmark" class="table-ref-link" title="点击查看表 2-1 全球治理对标表">表 2-1（全球治理对标表）</a>'
);
bodyHtml = bodyHtml.replace(
  /表[\s\u00a0]*<a href="#tab:dmrv_minimum_fields"[^>]*>1<\/a>/g,
  '<a href="#tab:dmrv_minimum_fields" class="table-ref-link" title="点击查看表 3-1">表 3-1</a>'
);
bodyHtml = bodyHtml.replace(
  /表[\s\u00a0]*<a href="#tab:continuous_evidence_monitoring"[^>]*>2<\/a>/g,
  '<a href="#tab:continuous_evidence_monitoring" class="table-ref-link" title="点击查看表 3-2">表 3-2</a>'
);
bodyHtml = bodyHtml.replace(
  /表[\s\u00a0]*<a href="#tab:dmrv_governance_mapping"[^>]*>3<\/a>/g,
  '<a href="#tab:dmrv_governance_mapping" class="table-ref-link" title="点击查看表 3-3">表 3-3</a>'
);
bodyHtml = bodyHtml.replace(
  /表[\s\u00a0]*<a href="#tab:case_evidence_comparison"[^>]*>4<\/a>/g,
  '<a href="#tab:case_evidence_comparison" class="table-ref-link" title="点击查看表 4-1">表 4-1</a>'
);
bodyHtml = bodyHtml.replace(
  /图[\s\u00a0]*<a\s+href="#fig:global_ccus_scale"[^>]*>1<\/a>/g,
  '<a href="#fig:global_ccus_scale" class="fig-ref-link" title="点击查看图 1：全球 CCUS 前瞻性项目规划与预期交付缺口">图 1</a>'
);
bodyHtml = bodyHtml.replace(
  /图[\s\u00a0]*<a\s+href="#fig:dmrv_house"[^>]*>2<\/a>/g,
  '<a href="#fig:dmrv_house" class="fig-ref-link" title="点击查看图 2：从工程事实到制度用途 dMRV 证据架构">图 2</a>'
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
  `[sync-paper-report] 正在重塑附录体系 (附录 A/B/C/D) 与规范化术语词典...`
);

// 1. 将章节 7, 8, 9, 10 修正为标准的附录编号 附录 A, B, C, D
const appendixMapping = [
  { num: '7', letter: 'A', title: '全球 CCUS 项目分布与统计口径' },
  { num: '8', letter: 'B', title: '关键主张与证据边界' },
  { num: '9', letter: 'C', title: '关键术语与缩略语' },
  { num: '10', letter: 'D', title: '研究局限与后续验证方向' },
];

for (const app of appendixMapping) {
  const titlePattern = app.title.replace(/\s+/g, '\\s+');
  const regex = new RegExp(
    `<h1\\s+data-number="${app.num}"[^>]*><span[\\s\\S]*?class="header-section-number"[^>]*>${app.num}<\\/span>[\\s\\S]*?${titlePattern}<\\/h1>`
  );
  const replacement = `<h1 data-number="附录 ${app.letter}" id="appendix-${app.letter.toLowerCase()}" class="appendix-h1"><span class="header-section-number">附录 ${app.letter}</span> ${app.title}</h1>`;
  bodyHtml = bodyHtml.replace(regex, replacement);
}

// 2. 重构 附录 C：关键术语与缩略语 (排版为现代紧凑高密度学术对标规范表，含分类过滤与即时检索)
const termsStart = texContent.indexOf('\\section{关键术语与缩略语}');
const termsEnd = texContent.indexOf('\\section{研究局限与后续验证方向}');
if (termsStart !== -1 && termsEnd !== -1) {
  const termsSection = texContent.slice(termsStart, termsEnd);
  const termMatches = [
    ...termsSection.matchAll(
      /\\item\[([^\]]+)\]([\s\S]*?)(?=\\item\[|\\end\{description\})/g
    ),
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

    bodyHtml = bodyHtml.replace(
      /<div class="description">[\s\S]*?<\/div>/,
      newGlossaryHtml
    );
  }
}

// --- 7. 视觉与版式深度精修 (Visual Hierarchy & Component Upgrades) ---
console.log(
  `[sync-paper-report] 正在执行正文版式精修（图文摘要、核心问题卡片、路线图与规范图表）...`
);

// 1. 移除 Pandoc 冗余 titlepage 与重复关键词，注入全新高保真图文摘要总览卡片 (Graphical Abstract)
// 图片紧随其后的“注：…”说明原本会被 Pandoc 落到正文，这里一并捕获并收纳进图文摘要卡片内。
const titlepageRegex =
  /<div class="titlepage">[\s\S]*?<\/div>\s*<p><strong>关键词[：:]<\/strong>[\s\S]*?<\/p>\s*<p><img src="\.\/data\/图文摘要2\.png"[^>]*><\/p>(?:\s*<p>(注：[\s\S]*?)<\/p>)?/;
bodyHtml = bodyHtml.replace(titlepageRegex, (match, gaNote) => {
  const gaNoteHtml = gaNote
    ? `
  <div class="figure-notes ga-notes">
    <span class="note-tag">注</span>
    <div class="note-text">${gaNote.replace(/^注：\s*/, '')}</div>
  </div>`
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
    <img src="./data/图文摘要2.png" alt="CCUS 规模化治理与 dMRV 架构图文摘要" />
  </div>
  <div class="ga-caption">
    <strong>图文说明：</strong>展示了从“单点技术示范”迈向“集群化枢纽治理”的系统动力学演进路径、关键制度瓶颈以及 dMRV 作为产业信用基础设施的协同支撑关系。
  </div>${gaNoteHtml}
</div>`;
});

// 2. 将 Pandoc 生成的伪数学公式标记清洗为原生超轻量 HTML，消除公式渲染延迟与抖动
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

// 3. 重构 1.4 节下 1.4.0.1 ~ 1.4.0.3 伪 4 级标题为系统问题分析卡片 (.systemic-question-card)
const qData = [
  {
    num: '1.4.0.1',
    id: 'q1-value-chain',
    badge: '核心问题 01',
    title: '价值如何形成并在全链条分配？',
  },
  {
    num: '1.4.0.2',
    id: 'q2-network-sync',
    badge: '核心问题 02',
    title: '价值链如何同步投资并稳定运行？',
  },
  {
    num: '1.4.0.3',
    id: 'q3-evidence-trust',
    badge: '核心问题 03',
    title: '工程结果如何获得制度采信？',
  },
];
for (const q of qData) {
  const qRegex = new RegExp(
    `<h4 data-number="${q.num}"[^>]*>[\\s\\S]*?<\\/h4>\\s*(<p>[\\s\\S]*?<\\/p>)`
  );
  bodyHtml = bodyHtml.replace(qRegex, (match, pTag) => {
    return `
      <div class="systemic-question-card" id="${q.id}">
        <div class="sq-header">
          <span class="sq-badge">${q.badge}</span>
          <span class="sq-title">${q.title}</span>
        </div>
        <div class="sq-body">
          ${pTag}
        </div>
      </div>
    `;
  });
}

// 4. 重构 5.0 节下 5.0.0.1 ~ 5.0.0.3 阶段描述为“三阶段演化路线图” (.roadmap-container)
const stage1Regex =
  /<h4 data-number="5\.0\.0\.1"[^>]*>[\s\S]*?<\/h4>\s*<p>([\s\S]*?)<\/p>/;
const stage2Regex =
  /<h4 data-number="5\.0\.0\.2"[^>]*>[\s\S]*?<\/h4>\s*<p>([\s\S]*?)<\/p>/;
const stage3Regex =
  /<h4 data-number="5\.0\.0\.3"[^>]*>[\s\S]*?<\/h4>\s*<p>([\s\S]*?)<\/p>/;
const s1 = bodyHtml.match(stage1Regex);
const s2 = bodyHtml.match(stage2Regex);
const s3 = bodyHtml.match(stage3Regex);

if (s1 && s2 && s3) {
  const roadmapHtml = `
    <div class="roadmap-container">
      <div class="roadmap-card stage-1">
        <div class="roadmap-step">
          <span class="step-num">01</span>
          <span class="step-phase">阶段一</span>
        </div>
        <div class="roadmap-content">
          <h4 class="stage-title">探索与示范阶段</h4>
          <p class="stage-desc">${s1[1]}</p>
        </div>
      </div>
      <div class="roadmap-card stage-2">
        <div class="roadmap-step">
          <span class="step-num">02</span>
          <span class="step-phase">阶段二</span>
        </div>
        <div class="roadmap-content">
          <h4 class="stage-title">集群形成阶段</h4>
          <p class="stage-desc">${s2[1]}</p>
        </div>
      </div>
      <div class="roadmap-card stage-3">
        <div class="roadmap-step">
          <span class="step-num">03</span>
          <span class="step-phase">阶段三</span>
        </div>
        <div class="roadmap-content">
          <h4 class="stage-title">规模扩张阶段</h4>
          <p class="stage-desc">${s3[1]}</p>
        </div>
      </div>
    </div>
  `;
  const entireStagesRegex =
    /<h4 data-number="5\.0\.0\.1"[^>]*>[\s\S]*?<h4 data-number="5\.0\.0\.3"[^>]*>[\s\S]*?<\/p>/;
  bodyHtml = bodyHtml.replace(entireStagesRegex, roadmapHtml);
}

// 5. 规范图 1 与图 2 学术排版（置顶标题、高清防变形、注释独立微排版）
const fig1Regex =
  /<div class="landscape">\s*<figure id="fig:global_ccus_scale">\s*<img src="([^"]+)"[^>]*\/>\s*(<p><em>注：<\/em>[\s\S]*?<\/p>)\s*<figcaption>([\s\S]*?)<\/figcaption>\s*<\/figure>\s*<\/div>/;
bodyHtml = bodyHtml.replace(fig1Regex, (match, src, pNotes, caption) => {
  const cleanNotes = pNotes
    .replace(/<p><em>注：<\/em>\s*/, '')
    .replace(/<\/p>$/, '');
  return `
    <figure class="academic-figure" id="fig:global_ccus_scale">
      <div class="figure-header">
        <div class="figure-title-group">
          <span class="figure-label">图 1</span>
          <span class="figure-title">${caption.trim()}</span>
        </div>
        <span class="figure-tip">🔍 点击放大</span>
      </div>
      <div class="figure-img-wrap">
        <img src="${src}" alt="${caption.trim()}" loading="lazy" />
      </div>
      <div class="figure-notes">
        <span class="note-tag">注</span>
        <div class="note-text">${cleanNotes}</div>
      </div>
    </figure>
  `;
});

const fig2Regex =
  /<figure id="fig:dmrv_house">\s*<img src="([^"]+)"[^>]*\/>\s*<figcaption>([\s\S]*?)<\/figcaption>\s*<\/figure>/;
bodyHtml = bodyHtml.replace(fig2Regex, (match, src, caption) => {
  return `
    <figure class="academic-figure" id="fig:dmrv_house">
      <div class="figure-header">
        <div class="figure-title-group">
          <span class="figure-label">图 2</span>
          <span class="figure-title">${caption.trim()}</span>
        </div>
        <span class="figure-tip">🔍 点击放大</span>
      </div>
      <div class="figure-img-wrap">
        <img src="${src}" alt="${caption.trim()}" loading="lazy" />
      </div>
      <div class="figure-notes">
        <span class="note-tag">注</span>
        <div class="note-text">展示了规范底座（监管/标准/方法学）、工程事实、证据组织接口与制度用途（核证、结算、金融、责任接续）之间的四层映射体系与证据支撑网络。</div>
      </div>
    </figure>
  `;
});

// 6. 统一 5.1 ~ 5.3 核心政策建议标题的版式与间距（不注入冗余编号徽章）
const policyData = [
  {
    num: '5.1',
    id: '政策建议一将证据要求前置到集群遴选与可研设计',
  },
  {
    num: '5.2',
    id: '政策建议二建立连接工程事实与制度使用的接口',
  },
  {
    num: '5.3',
    id: '政策建议三通过影子评估检验长期责任审查的证据要求',
  },
];
for (const p of policyData) {
  const pRegex = new RegExp(
    `<h2 data-number="${p.num}"\\s*id="${p.id}"><span\\s*class="header-section-number">${p.num}<\\/span>\\s*([^<]+)<\\/h2>`
  );
  bodyHtml = bodyHtml.replace(pRegex, (m, title) => {
    return `
      <h2 data-number="${p.num}" id="${p.id}" class="policy-rec-heading">
        <span class="header-section-number">${p.num}</span>
        <span class="policy-title">${title.trim()}</span>
      </h2>
    `;
  });
}

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
      .reading-stats { flex-wrap: wrap; }
      .ga-header { flex-wrap: wrap; }
      .figure-header { flex-wrap: wrap; }
    }
    @media (max-width: 400px) {
      .nav-brand .brand-text { display: none; }
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

    /* 附录特殊标识与分割样式 */
    .appendix-h1 {
      margin-top: 4.5rem !important;
      border-bottom: 2px dashed var(--brand-emerald) !important;
    }
    .appendix-h1 .header-section-number {
      background: rgba(16, 185, 129, 0.1) !important;
      color: var(--brand-emerald) !important;
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 0.375rem;
      padding: 0.15rem 0.5rem;
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

    /* 核心系统问题卡片 (Systemic Question Cards in Section 1.4) */
    .systemic-question-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-left: 4px solid var(--brand-blue);
      border-radius: 0.75rem;
      margin: 1.75rem 0;
      padding: 1.35rem 1.6rem;
      transition: all 0.2s ease;
    }
    .systemic-question-card:hover {
      background: var(--bg-tertiary);
      border-color: var(--brand-blue);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.08);
      transform: translateY(-1px);
    }
    .sq-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.85rem;
      padding-bottom: 0.6rem;
      border-bottom: 1px dashed var(--border-color);
    }
    .sq-badge {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--brand-blue);
      background: rgba(37, 99, 235, 0.1);
      border: 1px solid rgba(37, 99, 235, 0.25);
      padding: 0.15rem 0.55rem;
      border-radius: 0.35rem;
      white-space: nowrap;
    }
    .sq-title {
      font-family: var(--font-sans);
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .sq-body p {
      margin-bottom: 0 !important;
      font-size: 0.95rem;
      line-height: 1.85;
      text-indent: 0 !important;
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
      .roadmap-container, .systemic-question-card, .graphical-abstract-card, .glossary-card-container, .glossary-table {
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
      <button class="btn" id="theme-toggle" title="切换深浅模式" aria-label="切换深浅模式"><span aria-hidden="true">🌓</span><span class="btn-label">主题</span></button>
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
        <span>报告大纲 (TOC)</span>
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
          <span>📊 正文约 ${Math.round(charCount / 1000)}k 字</span>
          <span>⏱️ 建议阅读时间 ${readMinutes} 分钟</span>
          <span>📑 支持 XeLaTeX 原始矢量 PDF 下载</span>
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
  <button class="btn btn-primary mobile-toc-btn" id="open-drawer">
    📑 报告大纲
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

      // 实时包裹高亮 mark
      let wrapped = false;
      if (currentSelectionRange) {
        try {
          const mark = document.createElement('mark');
          mark.className = 'comment-highlight';
          mark.setAttribute('data-comment-id', id);
          mark.id = 'mark-' + id;
          mark.title = '批注：' + commentBody;
          currentSelectionRange.surroundContents(mark);
          wrapped = true;
        } catch (err) {
          wrapped = highlightTextInElement(document.getElementById('report-content'), currentSelectedText, id, commentBody);
        }
      } else {
        wrapped = highlightTextInElement(document.getElementById('report-content'), currentSelectedText, id, commentBody);
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
      showToast('✅ 批注已成功保存至本地！');
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

    // 定位原文高亮 Mark
    function scrollToMark(id) {
      const mark = document.getElementById('mark-' + id) || document.querySelector(\`mark[data-comment-id="\${id}"]\`);
      if (!mark) {
        showToast('⚠️ 未能在当前页面定位到该引用片段（可能文本变动）');
        return;
      }
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      mark.classList.remove('pulse-highlight');
      void mark.offsetWidth;
      mark.classList.add('pulse-highlight');
    }

    // 删除单条批注
    function deleteComment(id) {
      if (!confirm('确定删除该条审阅批注吗？')) return;
      let comments = getStoredComments();
      comments = comments.filter(c => c.id !== id);
      saveStoredComments(comments);

      // 解构正文中的 mark
      const mark = document.getElementById('mark-' + id) || document.querySelector(\`mark[data-comment-id="\${id}"]\`);
      if (mark) {
        const parent = mark.parentNode;
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
      }
      showToast('🗑️ 批注已删除');
    }

    // 清空全部批注
    document.getElementById('btn-clear-all-comments').addEventListener('click', () => {
      const comments = getStoredComments();
      if (comments.length === 0) return;
      if (!confirm(\`确定清空全部 \${comments.length} 条审阅批注吗？此操作不可逆。\`)) return;

      localStorage.removeItem(STORAGE_KEY);
      document.querySelectorAll('.comment-highlight').forEach(mark => {
        const parent = mark.parentNode;
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
      });
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

    // 文本树深度遍历恢复高亮
    function highlightTextInElement(container, quote, id, commentText) {
      if (!quote || quote.length < 2) return false;
      const target = quote.trim();

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walker.nextNode())) {
        if (node.parentElement && (
          node.parentElement.classList.contains('comment-highlight') ||
          ['SCRIPT', 'STYLE', 'BUTTON'].includes(node.parentElement.tagName)
        )) {
          continue;
        }

        const val = node.nodeValue;
        const idx = val.indexOf(target);
        if (idx !== -1) {
          try {
            const mark = document.createElement('mark');
            mark.className = 'comment-highlight';
            mark.setAttribute('data-comment-id', id);
            mark.id = 'mark-' + id;
            mark.title = '批注：' + (commentText || '');

            const targetNode = node.splitText(idx);
            targetNode.splitText(target.length);

            mark.appendChild(targetNode.cloneNode(true));
            targetNode.parentNode.replaceChild(mark, targetNode);
            return true;
          } catch (e) {
            console.warn('Rehydration wrap failed:', e);
          }
        }
      }
      return false;
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
  </script>
</body>
</html>`;

const finalOut = path.join(outDir, 'index.html');
fs.writeFileSync(finalOut, template, 'utf8');

console.log(`[sync-paper-report] 全部流水线执行完毕！`);
console.log(`[sync-paper-report] 最终报告页面已保存至: ${finalOut}`);

// --- check --strict 模式：对整页做逐字节重生成比对（需与本机 Pandoc 版本一致） ---
if (checkMode && args.includes('--strict')) {
  if (!fs.existsSync(committedHtmlPath)) {
    console.error(
      `[sync-paper-report][check] 未找到已提交页面: ${committedHtmlPath}`
    );
    process.exit(1);
  }
  const committed = fs.readFileSync(committedHtmlPath, 'utf8');
  const regenerated = fs.readFileSync(finalOut, 'utf8');

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

  if (committed === regenerated && pdfMatches !== false) {
    if (pdfMatches === null) {
      console.warn(
        `[sync-paper-report][check] ⚠️ 未能同时取得已提交与应生成的 PDF，跳过 PDF 比对。`
      );
    }
    console.log(
      `[sync-paper-report][check] ✅ 已提交页面与最新 paper draft 一致 (paper draft sha256:${texSha})`
    );
    process.exit(0);
  }

  console.error(
    `[sync-paper-report][check] ❌ 检测到漂移：已提交产物与最新 paper draft 不一致。`
  );
  if (committed !== regenerated) {
    const committedSha = crypto
      .createHash('sha256')
      .update(committed)
      .digest('hex');
    const regeneratedSha = crypto
      .createHash('sha256')
      .update(regenerated)
      .digest('hex');
    console.error(
      `[sync-paper-report][check]   index.html 已提交 : ${committedSha}`
    );
    console.error(
      `[sync-paper-report][check]   index.html 应生成 : ${regeneratedSha}`
    );
  }
  if (pdfMatches === false) {
    console.error(
      `[sync-paper-report][check]   paper_draft.pdf 与最新交付 PDF 不一致`
    );
  }
  console.error(
    `[sync-paper-report][check]   请运行 \`pnpm report:sync:full\` 重新生成并提交 public/reports/${slug}/ 下的 index.html 与 paper_draft.pdf。`
  );
  process.exit(1);
}

import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { verifyReportFile } from './lib/report-structure.mjs';

// 仓库根目录：以脚本自身位置推导，不依赖调用者的 CWD（与 sync-paper-report.mjs 一致）
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

/**
 * verify-paper-report.mjs —— 报告产物的两道日常维护关卡（都不需要跑 Pandoc）。
 *
 * 1) 结构体检（默认，`pnpm report:verify`）
 *    与 `sync-paper-report.mjs` 写盘前的门禁共用同一套规则（lib/report-structure.mjs），
 *    用来发现"页面已损坏但指纹没变"的情况：手工编辑产物、素材被替换、生成脚本回归。
 *
 * 2) 本机/CI 一致性（`--parity`，`pnpm report:parity`）
 *    用与 CI 完全相同的默认模式（远端权威）重新生成一份到临时目录，再与已提交产物逐字节比对。
 *    这是"本地能跑、线上也能跑"的回归防线：历史上 CI 与本机走的是两条不同分支
 *    （CI 读不到本机目录 → 静默沿用旧配图），本地全绿而线上产物是错的。
 *
 * 用法:
 *   node scripts/verify-paper-report.mjs [--slug 2601_ESG30] [--local-tex path/to/paper_draft.tex]
 *   node scripts/verify-paper-report.mjs --no-tex          # 跳过 TeX 标签/引用交叉校验
 *   node scripts/verify-paper-report.mjs --parity          # 远端权威模式重生成 + 逐字节比对
 *   node scripts/verify-paper-report.mjs --parity --no-network   # 跳过 parity
 */

const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
}

const repo = getArg('--repo', 'liuh886/2601_ESG30');
const slug = getArg('--slug', '2601_ESG30');
const skipTex = args.includes('--no-tex');
const parity = args.includes('--parity');
const noNetwork = args.includes('--no-network');
const localRootDir =
  process.env.ESG30_LOCAL_DIR ||
  'D:/Documents/zhihaol/100_Project/2601_ESG30/ESG30';

const reportDir = path.resolve(repoRoot, 'public/reports', slug);
const htmlPath = path.join(reportDir, 'index.html');

if (!fs.existsSync(htmlPath)) {
  console.error(`[verify-paper-report] 未找到报告页: ${htmlPath}`);
  process.exit(1);
}

const ghApiToText = (remotePath) => {
  const r = spawnSync(
    'gh',
    [
      'api',
      `repos/${repo}/contents/${remotePath}`,
      '-H',
      'Accept: application/vnd.github.v3.raw',
    ],
    { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }
  );
  if (r.error || r.status !== 0 || !r.stdout) {
    throw new Error(
      r.error ? r.error.message : (r.stderr || '').trim() || `exit ${r.status}`
    );
  }
  return r.stdout;
};

// 取 TeX 源码用于标签/引用交叉校验；拿不到就跳过这部分（结构体检仍然执行）
let tex = '';
if (!skipTex) {
  const localTex = getArg(
    '--local-tex',
    path.join(localRootDir, 'paper_draft.tex')
  );
  if (localTex && fs.existsSync(localTex)) {
    tex = fs.readFileSync(localTex, 'utf8').replace(/\r\n/g, '\n');
  } else if (!noNetwork) {
    try {
      tex = ghApiToText('paper_draft.tex').replace(/\r\n/g, '\n');
    } catch (err) {
      console.warn(
        `[verify-paper-report] ⚠️ 无法获取 paper draft 源码（本机与 GitHub 均不可用），跳过标签/引用交叉校验：${err.message}`
      );
    }
  }
}

const problems = verifyReportFile(htmlPath, tex);

if (problems.length) {
  console.error(
    `[verify-paper-report] ❌ ${path.relative(repoRoot, htmlPath)} 结构自检未通过（${problems.length} 项）：`
  );
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}
console.log(
  `[verify-paper-report] ✅ ${path.relative(repoRoot, htmlPath)} 结构自检通过`
);

// ---------------------------------------------------------------------------
// parity：以 CI 的"仅远端"路径重生成一份，逐字节比对已提交产物
// ---------------------------------------------------------------------------
if (parity) {
  if (noNetwork) {
    console.log(`[verify-paper-report] --no-network：跳过本机/CI 一致性比对。`);
    process.exit(0);
  }

  const pandoc = spawnSync('pandoc', ['--version'], { encoding: 'utf8' });
  if (pandoc.error || pandoc.status !== 0) {
    console.error(
      `[verify-paper-report][parity] ❌ 未检测到 pandoc，无法复现 CI 生成路径。请安装 CI 所用版本后重试。`
    );
    process.exit(1);
  }
  const localVersion = (pandoc.stdout.match(/^pandoc\s+(\S+)/m) || [])[1];
  const manifestPath = path.join(reportDir, 'assets-manifest.json');
  const committedVersion = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')).pandocVersion
    : null;
  if (committedVersion && localVersion && committedVersion !== localVersion) {
    console.error(
      `[verify-paper-report][parity] ❌ 本机 Pandoc 版本（${localVersion}）与生成已提交产物时使用的版本（${committedVersion}）不一致，` +
        `逐字节比对必然失败。请对齐到 CI 所用版本（见 .github/workflows/sync-esg30-report.yml 的 PANDOC_VERSION）后重跑 \`pnpm report:sync\`。`
    );
    process.exit(1);
  }

  const tmpOutDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `ccus-report-parity-${slug}-`)
  );
  // 把已提交的 PDF 预置进临时目录：--skip-pdf 会沿用目录内已有 PDF，
  // 于是页数文案等派生内容与已提交产物保持可比（否则会假报不一致）。
  const committedPdf = path.join(reportDir, 'paper_draft.pdf');
  if (fs.existsSync(committedPdf)) {
    fs.copyFileSync(committedPdf, path.join(tmpOutDir, 'paper_draft.pdf'));
  }

  try {
    console.log(
      `[verify-paper-report][parity] 以 CI 默认参数（远端权威）重新生成到 ${tmpOutDir} ...`
    );
    const run = spawnSync(
      process.execPath,
      [
        path.join(repoRoot, 'scripts/sync-paper-report.mjs'),
        '--skip-pdf',
        '--out-dir',
        tmpOutDir,
      ],
      { stdio: 'inherit', cwd: repoRoot }
    );
    if (run.status !== 0) {
      console.error(
        `[verify-paper-report][parity] ❌ 远端路径生成失败（退出码 ${run.status}），无法比对。`
      );
      process.exit(1);
    }

    const sha = (p) =>
      crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    const mismatches = [];

    // index.html：slug 与页面内容无关（--out-dir 保证 slug 一致），应逐字节相同
    const tmpHtml = path.join(tmpOutDir, 'index.html');
    if (!fs.existsSync(tmpHtml)) {
      mismatches.push('index.html：远端路径重生成未产出文件');
    } else if (sha(htmlPath) !== sha(tmpHtml)) {
      mismatches.push(
        `index.html：内容不一致（已提交 ${sha(htmlPath).slice(0, 16)} / 远端路径重生成 ${sha(tmpHtml).slice(0, 16)}）`
      );
    } else {
      console.log(
        `[verify-paper-report][parity]   index.html 逐字节一致 (${sha(htmlPath).slice(0, 16)})`
      );
    }

    // 素材清单：只比对内容指纹（path + sha256）。
    // source / texSource / generatedAt 是溯源元数据，本机与 CI 天然不同，不参与比对。
    const readAssets = (p) => {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8')).assets || [];
      } catch {
        return null;
      }
    };
    const manifestPath = path.join(reportDir, 'assets-manifest.json');
    const committedAssets = readAssets(manifestPath);
    const remoteAssets = readAssets(
      path.join(tmpOutDir, 'assets-manifest.json')
    );
    if (committedAssets === null || remoteAssets === null) {
      mismatches.push('assets-manifest.json 缺失或无法解析，无法比对素材指纹');
    } else {
      const fingerprint = (list) =>
        list.map((a) => ({ path: a.path, sha256: a.sha256 }));
      const a = fingerprint(committedAssets);
      const b = fingerprint(remoteAssets);
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        mismatches.push(
          `素材指纹不一致：\n      已提交: ${JSON.stringify(a)}\n      远端路径: ${JSON.stringify(b)}`
        );
      } else {
        console.log(
          `[verify-paper-report][parity]   ${a.length} 项素材指纹一致（${a
            .map((x) => x.path)
            .join(', ')}）`
        );
      }
      // 关键回归：远端路径下不得有配图落到"沿用旧文件"兜底分支。
      // 只检查配图 —— paper_draft.pdf 是本检查器自己预置进去的（配合 --skip-pdf），
      // 它的 source 必然是 existing，不代表 CI 会发布过期 PDF。
      const fallback = remoteAssets.filter(
        (a) => a.source === 'existing' && a.path !== 'paper_draft.pdf'
      );
      if (fallback.length) {
        mismatches.push(
          `远端路径下有 ${fallback.length} 张配图只能沿用旧文件（CI 会发布过期图）: ${fallback
            .map((a) => a.path)
            .join(', ')}`
        );
      }
      // 远端路径不应把 PDF 记为本地来源
      const badPdf = remoteAssets.find(
        (a) => a.path === 'paper_draft.pdf' && a.source === 'local'
      );
      if (badPdf) {
        mismatches.push('远端路径下 paper_draft.pdf 竟被标记为 local 来源');
      }
    }

    if (mismatches.length) {
      console.error(
        `[verify-paper-report][parity] ❌ 本机产物与 CI 生成路径不一致（${mismatches.length} 项）：`
      );
      for (const m of mismatches) console.error(`  · ${m}`);
      console.error(
        `[verify-paper-report][parity]   请在联网状态下运行 \`pnpm report:sync\` 并提交更新后的产物。`
      );
      process.exit(1);
    }
    console.log(
      `[verify-paper-report][parity] ✅ 本机产物与 CI 生成路径（远端权威模式）一致`
    );
  } finally {
    fs.rmSync(tmpOutDir, { recursive: true, force: true });
  }
}

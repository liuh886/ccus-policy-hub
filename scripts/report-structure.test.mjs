import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  verifyAssetManifest,
  verifyReportFile,
  verifyReportStructure,
} from './lib/report-structure.mjs';

/**
 * 报告页结构体检的回归测试。
 *
 * 每个用例都对应一次**真实发生过的静默腐烂**：脚本里的改写是正则 no-op，
 * TeX 改版后失配即原样跳过，页面照样产出并上线。这里把当时的破损形态固化成断言，
 * 任何人再次把结构化改写写回"静默"或删掉门禁，测试都会立刻变红。
 */

const TEX = String.raw`
\documentclass{article}
\begin{document}
\begin{figure}[p]
  \includegraphics{./fig1.jpg}
  \caption{图一标题}
  \label{fig:one}
\end{figure}
\begin{figure}
  \includegraphics{./fig2.png}
  \caption{图二标题}
  注：图二注释。
  \label{fig:two}
\end{figure}
\section{正文}
表~\ref{tab:one}与表~\ref{tab:two}。
\section{附录}
\subsection{附录A标题}
\caption{附录A表题}
\label{tab:one}
\subsection{附录B标题}
\caption{附录B表题}
\label{tab:two}
\end{document}
`;

function page(bodyHtml) {
  return `<!DOCTYPE html><html><head><style>figure{}</style></head><body><article class="article-content" id="report-content">${bodyHtml}</article></body></html>`;
}

const GOOD_FIGURE = (id, label, title) => `
  <figure class="academic-figure" id="${id}">
    <div class="figure-header">
      <div class="figure-title-group">
        <span class="figure-label">${label}</span>
        <span class="figure-title">${title}</span>
      </div>
    </div>
    <div class="figure-img-wrap"><img src="./data/${id}.png" alt="${title}" /></div>
    <div class="figure-notes"><span class="note-tag">注</span><div class="note-text">注释内容</div></div>
  </figure>`;

const GOOD_TABLE = (id, badge, title) => `
  <div class="table-container-card" id="${id}">
    <div class="table-card-toolbar">
      <div class="table-card-title-group">
        <span class="table-badge">${badge}</span>
        <span class="table-title">${title}</span>
      </div>
    </div>
    <div class="table-responsive-wrapper">
      <table class="standard-table"><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>
    </div>
  </div>`;

const GOOD_BODY = `
  <p>见<a href="#tab:one" class="table-ref-link">表 1-1</a>与<a href="#fig:two" class="fig-ref-link">图 2</a>。</p>
  ${GOOD_FIGURE('fig:one', '图 1', '图一标题')}
  ${GOOD_FIGURE('fig:two', '图 2', '图二标题')}
  ${GOOD_TABLE('tab:one', '表 1-1', '附录A表题')}
  ${GOOD_TABLE('tab:two', '附录 A 表', '附录B表题')}
`;

// 用真实落盘的图片目录，避免图片存在性检查产生噪音（img src 形如 ./data/x.png）
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-structure-'));
fs.mkdirSync(path.join(dataDir, 'data'));
for (const f of ['fig:one.png', 'fig:two.png']) {
  fs.writeFileSync(path.join(dataDir, 'data', f), 'x');
}
const verify = (body, tex = TEX, stats = []) =>
  verifyReportStructure(page(body), tex, { dataDir, stats });

test('正例：结构完整的报告页通过体检', () => {
  assert.deepEqual(verify(GOOD_BODY), []);
});

test('图 2 丢失图头（img 与 figcaption 之间被插入“注：”段落）会被拦截', () => {
  // 这正是线上真实发生的形态：fig2Regex 要求 img 与 figcaption 相邻，
  // 实际中间多了 <p>注：…</p>，于是整条正则失配，图 2 退化成裸 figure。
  const broken = GOOD_BODY.replace(
    /<figure class="academic-figure" id="fig:two">[\s\S]*?<\/figure>/,
    `<figure id="fig:two"><img src="./data/fig:two.png" /><p>注：图二注释。</p><figcaption>图二标题</figcaption></figure>`
  );
  const problems = verify(broken);
  assert.ok(
    problems.some((p) => p.includes('fig:two') && p.includes('图头')),
    `应报出图 2 缺图头，实际: ${JSON.stringify(problems)}`
  );
});

test('表格缺少卡片表头（表号/标题）会被拦截', () => {
  const broken = GOOD_BODY.replace(
    GOOD_TABLE('tab:two', '附录 A 表', '附录B表题'),
    `<div class="table-container-card" id="tab:two"><div class="table-responsive-wrapper">
       <table class="standard-table"><caption>附录B表题</caption><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>
     </div></div>`
  );
  const problems = verify(broken);
  assert.ok(
    problems.some((p) => p.includes('<caption>')),
    '应报出残留 caption'
  );
  assert.ok(
    problems.some((p) => p.includes('缺少表号徽标')),
    `应报出缺表号徽标，实际: ${JSON.stringify(problems)}`
  );
  assert.ok(
    problems.some((p) => p.includes('缺少表标题')),
    `应报出缺表标题，实际: ${JSON.stringify(problems)}`
  );
});

test('卡片表头在但徽标被删掉时仍会被拦截（不能只看“前面有没有 toolbar”）', () => {
  const stripped = GOOD_BODY.replace(
    '<span class="table-badge">表 1-1</span>',
    ''
  );
  assert.ok(
    verify(stripped).some((p) => p.includes('缺少表号徽标')),
    '仅剩 toolbar 不应视为通过'
  );
});

test('表格未被卡片包裹会被拦截', () => {
  const bare = GOOD_BODY.replace(
    /<div class="table-container-card" id="tab:one">[\s\S]*?<\/table>\s*<\/div>/,
    '<table class="standard-table"><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>'
  );
  assert.ok(
    verify(bare).some((p) => p.includes('未被 table-container-card 包裹'))
  );
});

test('表格缺少 thead 会被拦截', () => {
  const broken = GOOD_BODY.replace('<thead><tr><th>A</th></tr></thead>', '');
  assert.ok(verify(broken).some((p) => p.includes('<thead>')));
});

test('残留 titlepage / landscape / 裸“注：”段落会被拦截', () => {
  const problems = verify(
    GOOD_BODY +
      `<div class="titlepage"></div><div class="landscape"></div><p><em>注：裸注释</em></p>`
  );
  assert.ok(problems.some((p) => p.includes('titlepage')));
  assert.ok(problems.some((p) => p.includes('landscape')));
  assert.ok(problems.some((p) => p.includes('裸“注：”')));
});

test('未解析的 [tab:xxx] 占位符与伪数学标记会被拦截', () => {
  const problems = verify(
    GOOD_BODY.replace(
      'class="table-ref-link">表 1-1',
      'class="table-ref-link">[tab:one]'
    ) + '<p>CO<span class="math inline">\\(_2\\)</span></p>'
  );
  assert.ok(problems.some((p) => p.includes('[tab:xxx]')));
  assert.ok(problems.some((p) => p.includes('伪数学标记')));
});

test('失效锚点与重复 id 会被拦截', () => {
  const broken = GOOD_BODY.replace('href="#fig:two"', 'href="#fig:missing"');
  assert.ok(verify(broken).some((p) => p.includes('失效锚点')));

  const dup = GOOD_BODY + GOOD_TABLE('tab:one', '表 1-1', '重复锚点');
  assert.ok(verify(dup).some((p) => p.includes('重复 id')));
});

test('TeX 的 label/ref 必须在页面中有对应锚点', () => {
  const missingAnchor = GOOD_BODY.replace(
    GOOD_TABLE('tab:two', '附录 A 表', '附录B表题'),
    ''
  );
  const problems = verify(missingAnchor);
  assert.ok(
    problems.some((p) => p.includes('tab:two') && p.includes('缺少锚点'))
  );

  const danglingRef = verify(
    GOOD_BODY,
    TEX.replace('\\ref{tab:two}', '\\ref{tab:gone}')
  );
  assert.ok(danglingRef.some((p) => p.includes('不存在的锚点')));
});

test('图片缺失会被拦截', () => {
  const broken = GOOD_BODY.replace('./data/fig:two.png', './data/fig:gone.png');
  assert.ok(verify(broken).some((p) => p.includes('图片缺失')));
});

test('已废弃的 核心问题卡片版式若被重新引入会被拦截', () => {
  const problems = verify(
    GOOD_BODY +
      `<div class="systemic-question-card" id="q1"><div class="sq-body"><p>x</p></div></div>`
  );
  assert.ok(problems.some((p) => p.includes('systemic-question-card')));
});

test('注释正文里不得残留孤立的 </em>/</strong>', () => {
  const wrapped = GOOD_BODY.replace(
    '<div class="note-text">注释内容</div>',
    '<div class="note-text">注释内容</em></div>'
  );
  assert.ok(
    verify(wrapped).some((p) => p.includes('</em>')),
    '孤立闭合标签应被判为结构问题'
  );
});

test('改写命中数与 TeX 实际数量不符时会被拦截（防止改版后静默跳过）', () => {
  const problems = verify(GOOD_BODY, TEX, [
    { name: '表格卡片化', actual: 1, expected: 2 },
  ]);
  assert.ok(
    problems.some((p) => p.includes('表格卡片化')),
    `应报出命中数不符，实际: ${JSON.stringify(problems)}`
  );
});

// --- 素材清单（assets-manifest.json）校验 ---
//
// 这组用例锁定的是"线上产物静默用旧素材"这一类事故：脚本过去在 CI 上找不到
// 本机素材目录，就落到"目标文件已存在 → 跳过"分支，于是远端更新过的图永远拉不下来，
// 而页面上没有任何报错。清单 + parity 让这种情况变成硬失败。

function seedAssetDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-assets-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}

const sha16 = (buf) =>
  crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);

function writeManifest(dir, assets) {
  fs.writeFileSync(
    path.join(dir, 'assets-manifest.json'),
    JSON.stringify({ slug: 'x', assets }, null, 2) + '\n'
  );
}

test('素材指纹与清单一致时通过校验', () => {
  const dir = seedAssetDir({ 'data/a.png': 'AAA' });
  writeManifest(dir, [
    { path: 'data/a.png', source: 'remote', bytes: 3, sha256: sha16('AAA') },
  ]);
  assert.deepEqual(
    verifyAssetManifest(path.join(dir, 'assets-manifest.json'), dir),
    []
  );
  fs.rmSync(dir, { recursive: true, force: true });
});

test('素材被手工替换（指纹不符）会被拦截', () => {
  const dir = seedAssetDir({ 'data/a.png': 'AAA' });
  writeManifest(dir, [
    { path: 'data/a.png', source: 'remote', bytes: 3, sha256: sha16('BBB') },
  ]);
  const problems = verifyAssetManifest(
    path.join(dir, 'assets-manifest.json'),
    dir
  );
  assert.ok(
    problems.some((p) => p.includes('指纹与清单不符')),
    `应报出指纹不符，实际: ${JSON.stringify(problems)}`
  );
  fs.rmSync(dir, { recursive: true, force: true });
});

test('素材落到兜底来源（沿用旧文件）会被拦截 —— 对应线上发布过期图的事故', () => {
  const dir = seedAssetDir({ 'data/a.png': 'AAA' });
  writeManifest(dir, [
    { path: 'data/a.png', source: 'existing', bytes: 3, sha256: sha16('AAA') },
  ]);
  const problems = verifyAssetManifest(
    path.join(dir, 'assets-manifest.json'),
    dir
  );
  assert.ok(
    problems.some((p) => p.includes('兜底来源')),
    `应报出兜底来源，实际: ${JSON.stringify(problems)}`
  );
  fs.rmSync(dir, { recursive: true, force: true });
});

test('清单登记的素材缺失、清单本身缺失或损坏都会被拦截', () => {
  const dir = seedAssetDir({});
  assert.ok(
    verifyAssetManifest(path.join(dir, 'assets-manifest.json'), dir).some((p) =>
      p.includes('缺少素材清单')
    )
  );

  writeManifest(dir, [
    { path: 'data/gone.png', source: 'remote', bytes: 1, sha256: 'x' },
  ]);
  assert.ok(
    verifyAssetManifest(path.join(dir, 'assets-manifest.json'), dir).some((p) =>
      p.includes('素材缺失')
    )
  );

  fs.writeFileSync(path.join(dir, 'assets-manifest.json'), '{ not json');
  assert.ok(
    verifyAssetManifest(path.join(dir, 'assets-manifest.json'), dir).some((p) =>
      p.includes('无法解析')
    )
  );
  fs.rmSync(dir, { recursive: true, force: true });
});

test('TeX 参数缺省或为空时不应抛出 TypeError', () => {
  // 验证纯 HTML 校验在无 TeX 源码或 tex 为空/null 时安全执行
  assert.doesNotThrow(() => verifyReportStructure(page(GOOD_BODY)));
  assert.doesNotThrow(() => verifyReportStructure(page(GOOD_BODY), ''));
  assert.doesNotThrow(() => verifyReportStructure(page(GOOD_BODY), null));
});

test.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));

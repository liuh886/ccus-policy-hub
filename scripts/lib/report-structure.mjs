import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * 报告页结构体检（sync-paper-report 的写盘前硬门禁）。
 *
 * 背景：报告生成脚本过去所有版面改写都是「正则静默 no-op」——TeX 改版后一旦失配
 * 就原样跳过、不报错、不计数，导致页面静默腐烂并直接上线。已实际发生的后果：
 *   · 图文摘要卡片整体消失（文件名从 图文摘要2.png 改为 图文摘要4.png）
 *   · 图 2 丢失图头（img 与 figcaption 之间被插入“注：”段落）
 *   · 表 5-1 无表头（新表未登记进硬编码映射）
 * 因此把体检逻辑独立成模块，既供生成时调用，也可对已提交产物单独复检。
 *
 * 约定：返回问题清单（空数组 = 通过），不抛异常，由调用方决定退出码。
 */

/** 从页面中截出正文区域（排除 <style>/<script> 造成的误报） */
export function extractArticle(html) {
  const start = html.indexOf('<article');
  const end = html.lastIndexOf('</article>');
  return start === -1 || end === -1 ? '' : html.slice(start, end);
}

const stripTags = (html) => html.replace(/<[^>]+>/g, '');

/** 供 CLI/测试复用的纯函数式体检：只依赖页面与 TeX 文本 */
export function verifyReportStructure(html, tex = '', options = {}) {
  const { dataDir = null, stats = [] } = options;
  const problems = [];
  const add = (msg) => problems.push(msg);

  // 闸门一：各结构性改写的命中数必须与 TeX 实际数量一致
  for (const s of stats) {
    if (s.actual !== s.expected) {
      add(
        `改写命中数不符 [${s.name}]：期望 ${s.expected}，实际 ${s.actual}（TeX 结构可能已改版，需同步脚本）`
      );
    }
  }

  const body = extractArticle(html);
  if (!body) {
    add('页面缺少 <article id="report-content"> 正文容器');
    return problems;
  }

  // 闸门二：正文结构体检
  if (/<div class="titlepage">/.test(body)) add('Pandoc titlepage 未被清理');
  if (/<caption>/.test(body))
    add('存在残留在 <table> 内的 <caption>（表头未注入卡片）');
  if (
    /<p[^>]*>(?:<strong>|<em>)?\s*(?:注|口径(?:与筛选)?说明)\s*[：:]/.test(body)
  )
    add('存在未纳入统一注释组件的裸“注：”段落');
  if (/<div class="landscape">/.test(body)) add('残留 TeX landscape 包裹层');
  if (/\[(?:tab|fig):[^\]]+\]/.test(body))
    add('存在未解析的 [tab:xxx] / [fig:xxx] 交叉引用占位符');
  if (/class="citation-unknown"/.test(body))
    add('存在未能解析到参考文献的引用');
  if (/class="note-text">\s*<\/div>/.test(body)) add('存在内容为空的注释块');
  if (/<\/(?:em|strong)>\s*<\/div>/.test(body))
    add('注释正文里残留孤立的 </em> / </strong>（注释前缀剥离不完整）');
  if (/class="systemic-question-card"/.test(body))
    add('残留已废弃的 systemic-question-card 版式');

  for (const m of body.matchAll(/<figure\b([^>]*)>([\s\S]*?)<\/figure>/g)) {
    const id = (m[1].match(/id="([^"]+)"/) || [, '(无 id)'])[1];
    if (!/class="[^"]*academic-figure/.test(m[1]))
      add(`图 ${id} 缺少 academic-figure 卡片（无图头）`);
    if (!/class="figure-header"/.test(m[2]))
      add(`图 ${id} 缺少 figure-header（图头）`);
    if (!/<div class="figure-img-wrap">/.test(m[2]))
      add(`图 ${id} 缺少 figure-img-wrap`);
  }

  // 表格卡片必须自带表号徽标与标题。
  // 只检查"表格前面有没有 toolbar"是不够的：把徽标删掉后 toolbar 依然存在，会漏过。
  // 注意 body 已被 extractArticle 截断（尾部不含 </article>），因此用 $ 收尾。
  for (const m of body.matchAll(
    /<div class="table-container-card[^"]*"([^>]*)>([\s\S]*?)(?=<div class="table-container-card|$)/g
  )) {
    const attrs = m[1] ?? '';
    const inner = m[2] ?? '';
    const id = (attrs.match(/id="([^"]+)"/) || [, '(无 id)'])[1];
    const badge = inner.match(/<span class="table-badge">([\s\S]*?)<\/span>/);
    const title = inner.match(/<span class="table-title">([\s\S]*?)<\/span>/);
    if (!badge || !stripTags(badge[1]).trim())
      add(`表格卡片 ${id} 缺少表号徽标`);
    if (!title || !stripTags(title[1]).trim()) add(`表格卡片 ${id} 缺少表标题`);
  }

  for (const m of body.matchAll(/<table\b([^>]*)>([\s\S]*?)<\/table>/g)) {
    const cls = (m[1].match(/class="([^"]*)"/) || [, ''])[1];
    if (/glossary-table/.test(cls)) continue; // 术语表自带 thead 与独立工具栏
    if (!/<thead>/.test(m[2])) add(`表格 .${cls} 缺少 <thead>`);
    const before = body.slice(Math.max(0, m.index - 6000), m.index);
    if (
      before.lastIndexOf('table-container-card') <=
      before.lastIndexOf('</table>')
    ) {
      add(`表格 .${cls} 未被 table-container-card 包裹`);
    }

    // 数据完整性：tbody 数据行不得大面积为空（捕获 Pandoc 解析失真导致的空列）
    const tbody = m[2].match(/<tbody>([\s\S]*?)<\/tbody>/);
    if (tbody) {
      const rows = [...tbody[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)];
      for (const r of rows) {
        const cells = [...r[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(
          (c) => stripTags(c[1]).trim()
        );
        if (cells.length > 2) {
          const emptyCount = cells.filter((c) => !c).length;
          if (emptyCount >= cells.length - 1) {
            add(
              `表格 .${cls} 存在空数据行（${emptyCount}/${cells.length} 单元格为空，数据列可能丢失）`
            );
            break;
          }
        }
      }
    }
  }

  for (const [re, label] of [
    [/\\[a-zA-Z]+\{/g, '裸 LaTeX 命令'],
    [/<span class="math inline">/g, '未清洗的伪数学标记'],
    [/\{\[\}|\{\]\}/g, '残留的方括号保护标记'],
  ]) {
    const n = (body.match(re) || []).length;
    if (n) add(`正文残留 ${label} ×${n}`);
  }

  // 锚点完整性：不得有失效链接或重复 id
  const ids = new Map();
  for (const m of body.matchAll(/\sid="([^"]+)"/g)) {
    ids.set(m[1], (ids.get(m[1]) || 0) + 1);
  }
  const broken = [
    ...new Set([...body.matchAll(/href="#([^"]+)"/g)].map((m) => m[1])),
  ].filter((h) => !ids.has(h));
  if (broken.length) add(`失效锚点: ${broken.join(', ')}`);
  const dupes = [...ids.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  if (dupes.length) add(`重复 id: ${dupes.join(', ')}`);

  // TeX 的每个 \label 都必须在页面里留下锚点；每个 \ref 都必须指向已存在的锚点
  if (tex) {
    for (const m of tex.matchAll(/\\label\{((?:tab|fig):[^}]+)\}/g)) {
      if (!ids.has(m[1])) add(`TeX 标签 ${m[1]} 在页面中缺少锚点`);
    }
    for (const m of tex.matchAll(/\\(?:ref|autoref|cref)\{([^}]+)\}/g)) {
      if (!ids.has(m[1])) add(`交叉引用 ${m[1]} 指向不存在的锚点`);
    }
  }

  // 图片文件必须真实存在（dataDir 指向 index.html 所在目录，img src 形如 ./data/x.png）
  if (dataDir) {
    for (const m of body.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g)) {
      const p = path.resolve(dataDir, m[1].replace(/^\.\//, ''));
      if (!fs.existsSync(p)) add(`图片缺失: ${m[1]}`);
    }
  }

  return problems;
}
/**
 * 素材清单校验：确认 assets-manifest.json 与磁盘上的实际文件一致。
 * 用途是发现"页面文字没变、但配图被手工替换/串版"这类 --check 指纹比对抓不到的问题。
 */
export function verifyAssetManifest(manifestPath, dataDir) {
  const problems = [];
  if (!fs.existsSync(manifestPath)) {
    return [
      `缺少素材清单: ${path.basename(manifestPath)}（请运行 pnpm report:sync 重新生成）`,
    ];
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    return [`素材清单无法解析: ${err.message}`];
  }
  const sha = (file) =>
    crypto
      .createHash('sha256')
      .update(fs.readFileSync(file))
      .digest('hex')
      .slice(0, 16);

  for (const a of manifest.assets || []) {
    const p = path.resolve(dataDir, a.path);
    if (!fs.existsSync(p)) {
      problems.push(`清单登记的素材缺失: ${a.path}`);
      continue;
    }
    const actual = sha(p);
    if (a.sha256 && actual !== a.sha256) {
      problems.push(
        `素材指纹与清单不符: ${a.path}（清单 ${a.sha256}，实际 ${actual}）——可能被手工替换`
      );
    }
    if (a.source === 'existing') {
      problems.push(
        `素材 ${a.path} 使用了兜底来源（未从数据源取得），可能与 paper draft 不同版本`
      );
    }
  }
  return problems;
}

/** 供 CLI 复检已提交产物的薄封装：读取页面文件并做体检 */
export function verifyReportFile(htmlPath, tex = '', options = {}) {
  if (!fs.existsSync(htmlPath)) {
    return [`未找到报告页: ${htmlPath}`];
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const reportDir = path.dirname(path.resolve(htmlPath));
  const dataDir = options.dataDir ?? reportDir;
  const problems = verifyReportStructure(html, tex, { ...options, dataDir });
  if (options.skipAssets) return problems;
  problems.push(
    ...verifyAssetManifest(
      path.join(reportDir, 'assets-manifest.json'),
      dataDir
    )
  );
  return problems;
}

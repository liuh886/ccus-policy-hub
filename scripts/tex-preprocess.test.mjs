import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collapseAllShortstacks,
  matchBalancedBlocks,
  preprocessTex,
  readBalancedGroup,
  texCaptionForLabel,
  texCaptionToText,
} from './lib/tex-preprocess.mjs';

/**
 * TeX 预处理回归测试。
 *
 * 每个用例都对应一个**实测确认**的 Pandoc 缺陷。这里之所以值得单独成文件：
 * 这层逻辑历史上内联在 5800 行脚本中、无法单测，导致一处 label 硬编码就能让
 * 作者改个名字就产出"缺表头"的页面（被下游结构自检拦下，但仍需改代码才能恢复）。
 */

test('readBalancedGroup 正确处理嵌套花括号与转义', () => {
  const inner = '\\textbf{已运行}\\\\\\textbf{项目记录数}';
  const s = `{${inner}}`;
  const g = readBalancedGroup(s, 0);
  assert.ok(g, '应能读出分组');
  assert.equal(g.text, inner);
  assert.equal(g.end, s.length);
  assert.equal(readBalancedGroup('x', 0), null, '非 { 开头应返回 null');
  assert.equal(readBalancedGroup('{未闭合', 0), null, '不配对应返回 null');
});

test('collapseAllShortstacks 折叠全部 shortstack 并保留 \\textbf 分段', () => {
  const tex = [
    'A\\shortstack{\\textbf{已运行}\\\\\\textbf{项目记录数}}B',
    'C\\shortstack{\\textbf{甲}\\\\\\textbf{乙}}D',
  ].join('\n');
  const r = collapseAllShortstacks(tex);
  assert.equal(r.count, 2);
  assert.ok(!r.text.includes('\\shortstack'));
  assert.ok(r.text.includes('\\textbf{已运行} \\textbf{项目记录数}'));
  // 短栈内部换行变成空格（后续由 HTML 侧还原成 <br/>）
  assert.ok(r.text.includes('\\textbf{甲} \\textbf{乙}'));
});

test('collapseAllShortstacks 对花括号不配对的 shortstack 原样保留（不吞字符）', () => {
  const tex = '前\\shortstack{未闭合 后';
  const r = collapseAllShortstacks(tex);
  assert.ok(r.text.includes('\\shortstack{未闭合'));
  assert.ok(r.text.includes('后'));
});

test('matchBalancedBlocks 支持多个同标记块', () => {
  const tex =
    '\\begin{longtable}A\\end{longtable}X\\begin{longtable}B\\end{longtable}';
  const blocks = matchBalancedBlocks(
    tex,
    '\\begin{longtable}',
    '\\end{longtable}'
  );
  assert.equal(blocks.length, 2);
  assert.ok(blocks[0].text.includes('A'));
  assert.ok(blocks[1].text.includes('B'));
});

test('preprocessTex 清掉 longtable 的 rowcolors 与重复表头（多个 longtable 都覆盖）', () => {
  // \\rowcolors{n}{odd}{even}（xcolor，复数）是预处理的目标；
  // \\rowcolor{...}（单行着色，单数）不在此列 —— Pandoc 自己会丢弃它。
  const one = `\\begin{longtable}
{a}{b}
\\caption{X}
\\\\
\\toprule
\\textbf{H} & \\textbf{I} \\\\
\\midrule
\\endfirsthead
\\toprule
\\textbf{H} & \\textbf{I} \\\\
\\midrule
\\endhead
\\rowcolors{2}{slatebg}{white}
r1 \\\\
\\bottomrule
\\end{longtable}`;
  const r = preprocessTex(`${one}\n${one}`);
  assert.equal(r.longtableCount, 2);
  assert.equal(r.longtableTouched, 2);
  assert.ok(!r.tex.includes('\\rowcolors'));
  assert.ok(!r.tex.includes('\\endfirsthead'));
  // 重复表头只应保留一份（两个 longtable 各一份）
  assert.equal((r.tex.match(/\\textbf\{H\}/g) || []).length, 2);
});

test('preprocessTex 保护中文方括号标记', () => {
  const r = preprocessTex('[本文分析] 与 [项目披露] 保留');
  assert.equal(r.bracketGuardCount, 2);
  assert.ok(r.tex.includes('{[}本文分析{]}'));
  assert.ok(r.tex.includes('{[}项目披露{]}'));
});

test('preprocessTex 不误伤普通方括号（英文/非中文开头）', () => {
  const r = preprocessTex('See [1] and [Ref] and \\cite{x}');
  assert.ok(r.tex.includes('[1]'));
  assert.ok(r.tex.includes('[Ref]'));
});

test('texCaptionForLabel 能回读 \\captionof（float 外的表题，Pandoc 会丢弃）', () => {
  const tex = [
    '\\begin{center}',
    '  \\captionof{table}{全球主要法域 CCUS 治理对标表（2026）}',
    '  \\label{tab:bench}',
    '  \\begin{tabular}{ll}\\toprule A & B \\\\ \\bottomrule\\end{tabular}',
    '\\end{center}',
  ].join('\n');
  assert.equal(
    texCaptionForLabel(tex, 'tab:bench'),
    '全球主要法域 CCUS 治理对标表（2026）'
  );
  assert.equal(texCaptionForLabel(tex, 'tab:none'), null);
});

test('texCaptionForLabel 支持带嵌套花括号的 caption', () => {
  const tex = '\\caption{指标 \\textbf{甲} 与 $\\Delta$E}\n\\label{tab:nested}';
  assert.equal(
    texCaptionForLabel(tex, 'tab:nested'),
    '指标 \\textbf{甲} 与 $\\Delta$E'
  );
});

test('texCaptionToText 去掉 TeX 标记但保留可读文本', () => {
  assert.equal(
    texCaptionToText('\\textbf{表}：A--B \\textit{含} \\% 50\\% 与 CO$_2$'),
    '表：A–B 含 % 50% 与 CO'
  );
});

/**
 * 端到端性质：无论 label 叫什么、shortstack 出现在哪张表，
 * 预处理结果都不应残留 \shortstack，且 longtable 不应残留重复表头标记。
 * 这正是历史上会悄悄烂掉的那条路径。
 */
test('端到端：label 改名不影响预处理结果（不再锚定任何 label）', () => {
  const build = (label) => `\\begin{table}[h!]
\\centering
\\caption{合成表}
\\label{${label}}
\\begin{tabularx}{\\linewidth}{@{}p{0.2\\linewidth}*{3}{>{\\centering\\arraybackslash}X}@{}}
\\toprule
\\textbf{地区} & \\shortstack{\\textbf{已运行}\\\\\\textbf{记录数}} & \\shortstack{\\textbf{已运行项目记录}\\\\\\textbf{年处理能力}} & \\shortstack{\\textbf{甲}} \\\\
\\midrule
甲 & 1 & 2 & 3 \\\\
\\bottomrule
\\end{tabularx}
\\end{table}`;
  const a = preprocessTex(build('tab:old_name')).tex.replace(
    /tab:old_name/g,
    'LABEL'
  );
  const b = preprocessTex(build('tab:brand_new_name')).tex.replace(
    /tab:brand_new_name/g,
    'LABEL'
  );
  assert.equal(
    a,
    b,
    '预处理结果不应随 label 改名而变化（掩去 label 本身后比较）'
  );
  assert.ok(!a.includes('\\shortstack'));
  assert.ok(
    a.includes('\\begin{tabular}{lccc}'),
    '包含 *{3} 的 tabularx 应被自动转换为标准 tabular{lccc}'
  );
});

test('cleanTabularxBlocks 将含 *{6} 重复列修饰符的 tabularx 转换为 tabular{lcccccc}', () => {
  const tex = `\\begin{tabularx}{\\linewidth}{@{}>{\\raggedright\\arraybackslash}p{0.13\\linewidth}*{6}{>{\\centering\\arraybackslash}X}@{}}
\\toprule
A & B & C & D & E & F & G \\\\
\\midrule
1 & 2 & 3 & 4 & 5 & 6 & 7 \\\\
\\bottomrule
\\end{tabularx}`;
  const r = preprocessTex(tex);
  assert.equal(r.tabularxTouched, 1);
  assert.ok(r.tex.includes('\\begin{tabular}{lcccccc}'));
  assert.ok(r.tex.includes('\\end{tabular}'));
  assert.ok(!r.tex.includes('\\begin{tabularx}'));
});

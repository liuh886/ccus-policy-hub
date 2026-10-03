/**
 * TeX 预处理（Pandoc 之前的净化层）。
 *
 * 单独成模块的原因：这里全是**纯字符串逻辑**，却是最容易随 TeX 改版而腐烂的部分
 * （历史上正因为它被内联在 5800 行脚本里、无法单测，一处 label 硬编码就让整条
 * 流水线在作者改名后产出"缺表头"的页面）。抽出来后可直接用 node:test 覆盖。
 *
 * 三条规则各自对应一个**实测确认**的 Pandoc 缺陷，不是猜的：
 *  1. 表头里的 \shortstack  → Pandoc 3.1.x 整行丢弃 <thead>
 *  2. longtable 的 \rowcolors 与 \endfirsthead 重复表头 → 表头重复两次且无 <thead>
 *  3. 行首的中文方括号标记 [本文分析] → 被当作可选参数静默吞掉
 */

/** 读取 str[openIdx] 处的花括号分组（跳过被反斜杠转义的字符），返回内容与结束位置 */
export function readBalancedGroup(str, openIdx) {
  if (str[openIdx] !== '{') return null;
  let depth = 0;
  for (let i = openIdx; i < str.length; i++) {
    if (str[i] === '\\') {
      i++;
      continue;
    }
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) return { text: str.slice(openIdx + 1, i), end: i + 1 };
    }
  }
  return null;
}

/**
 * 全局把 \shortstack{...} 折叠成单行文本（内部换行 `\\` 变成空格）。
 * 折叠后 Pandoc 会把相邻的 \textbf 片段渲染成 <strong>…</strong> <strong>…</strong>，
 * 由 HTML 侧的 normalizeHeaderCells 再还原成 <br/> 换行。
 */
export function collapseAllShortstacks(tex) {
  let out = '';
  let i = 0;
  let count = 0;
  while (i < tex.length) {
    const at = tex.indexOf('\\shortstack{', i);
    if (at === -1) {
      out += tex.slice(i);
      break;
    }
    out += tex.slice(i, at);
    const open = at + '\\shortstack'.length;
    const group = readBalancedGroup(tex, open);
    if (!group) {
      // 花括号不配对（作者写错了）：原样保留，交由 Pandoc 报错，不吞字符
      out += tex.slice(at, open + 1);
      i = open + 1;
      continue;
    }
    out += group.text.replace(/\\\\/g, ' ');
    i = group.end;
    count++;
  }
  return { text: out, count };
}

/**
 * 找出所有 \begin{mark} … \end{mark} 块。
 * 用 indexOf 顺序扫描而非非贪婪正则：非贪婪会在嵌套/多块场景下把范围算错。
 */
export function matchBalancedBlocks(tex, beginMark, endMark) {
  const blocks = [];
  let i = 0;
  while (i < tex.length) {
    const at = tex.indexOf(beginMark, i);
    if (at === -1) break;
    const bodyStart = at + beginMark.length;
    const close = tex.indexOf(endMark, bodyStart);
    if (close === -1) break;
    const end = close + endMark.length;
    blocks.push({ start: at, end, text: tex.slice(at, end) });
    i = end;
  }
  return blocks;
}

/**
 * 去掉 longtable 的重复表头与 \rowcolors。
 * \rowcolors 的匹配刻意不要求行尾的 \\ —— 旧实现要求 `[\s\n]*\\\\`，
 * 一旦作者把 \rowcolors 写成独立行（实际文档里就是如此，位于 tabularx 表内）
 * 就匹配不上，属于典型的"看起来在工作、其实经常空转"的正则。
 */
function cleanLongtable(block) {
  return block
    .replace(/\\rowcolors\{[^}]*\}\{[^}]*\}\{[^}]*\}/g, '')
    .replace(/\\midrule[\s\n]*\\endfirsthead[\s\S]*?\\endhead/g, '');
}

/**
 * 完整预处理。返回净化后的 TeX 与各条规则的命中计数（供日志与自检使用）。
 */
export function preprocessTex(tex) {
  let out = tex;

  const shortstacks = collapseAllShortstacks(out);
  out = shortstacks.text;

  const longtables = matchBalancedBlocks(
    out,
    '\\begin{longtable}',
    '\\end{longtable}'
  );
  let longtableTouched = 0;
  // 逆序替换，避免前面的块改动后面的偏移
  for (let k = longtables.length - 1; k >= 0; k--) {
    const block = longtables[k];
    const cleaned = cleanLongtable(block.text);
    if (cleaned !== block.text) {
      out = out.slice(0, block.start) + cleaned + out.slice(block.end);
      longtableTouched++;
    }
  }

  // 行首中文方括号标记：[本文分析] / [项目披露] / [本文建议]
  const bracketed = out.match(/\[([一-鿿][^\]\r\n]{0,20})\]/g);
  out = out.replace(/\[([一-鿿][^\]\r\n]{0,20})\]/g, '{[}$1{]}');

  return {
    tex: out,
    shortstackCount: shortstacks.count,
    longtableCount: longtables.length,
    longtableTouched,
    bracketGuardCount: bracketed ? bracketed.length : 0,
  };
}

/**
 * 从 TeX 原文回读某个 \label 所属的 \caption / \captionof 文案。
 * 必要场景：float 环境外的 \captionof{table}{…} 会被 Pandoc 整段丢弃，
 * 只依赖 HTML 侧的 <caption> 就会渲染出"无表题"的裸表。
 */
export function texCaptionForLabel(tex, label) {
  const labelIdx = tex.indexOf(`\\label{${label}}`);
  if (labelIdx === -1) return null;
  const before = tex.slice(0, labelIdx);
  const isCaptionof =
    before.lastIndexOf('\\captionof{') > before.lastIndexOf('\\caption{');
  const capIdx = Math.max(
    before.lastIndexOf('\\captionof{'),
    before.lastIndexOf('\\caption{')
  );
  if (capIdx === -1) return null;
  let open = tex.indexOf('{', capIdx + '\\caption'.length - 1);
  if (isCaptionof) {
    const typeGroup = readBalancedGroup(tex, open);
    if (!typeGroup) return null;
    open = typeGroup.end;
  }
  const group = readBalancedGroup(tex, open);
  return group ? group.text : null;
}

/** TeX caption -> 纯文本（表题只用纯文本，不注入 HTML） */
export function texCaptionToText(s) {
  return s
    .replace(/\\textit\{([^{}]*)\}/g, '$1')
    .replace(/\\textbf\{([^{}]*)\}/g, '$1')
    .replace(/\$[^$]*\$/g, '')
    .replace(/\\[a-zA-Z]+\*?/g, '')
    .replace(/[{}]/g, '')
    .replace(/--/g, '–')
    .replace(/\\%/g, '%')
    .replace(/\\&/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

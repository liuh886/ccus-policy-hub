import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_TEMPLATE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../templates/esg30-report'
);

const TOKEN_PATTERN = /\{\{([A-Z0-9_]+)\}\}/g;

export const REQUIRED_TEMPLATE_TOKENS = Object.freeze([
  'DOC_TITLE',
  'PROGRAM_NAME',
  'TEX_SHA',
  'PDF_PAGE_SUFFIX',
  'REPORT_TYPE',
  'REPORT_VERSION',
  'DOC_AUTHOR',
  'DOC_DATE',
  'CHAR_COUNT_K',
  'READ_MINUTES',
  'ABSTRACT_TEXT',
  'KEYWORDS_TEXT',
  'BODY_HTML',
  'SLUG',
]);

/**
 * 读取单个模板部件：统一把 CRLF 归一为 LF，并剥离文件末尾单个换行符。
 * 模板文件以标准 POSIX 单尾换行落盘，剥离后与原内联模板逐字节一致
 * （包括 `</html>` 无尾换行，以及 `<style>`/`<script>` 标签边界无多余空行）。
 */
function readTemplatePart(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\n$/, '');
}

/**
 * 加载 ESG30 报告 HTML / CSS / JS 三件套模板原文。
 *
 * @param {string} [templateDir]
 * @returns {{ html: string, styles: string, script: string }}
 */
export function loadEsg30ReportTemplateParts(
  templateDir = DEFAULT_TEMPLATE_DIR
) {
  return {
    html: readTemplatePart(path.join(templateDir, 'template.html')),
    styles: readTemplatePart(path.join(templateDir, 'styles.css')),
    script: readTemplatePart(path.join(templateDir, 'script.js')),
  };
}

function substituteTokens(templateText, values, sourceLabel) {
  return templateText.replace(TOKEN_PATTERN, (match, key) => {
    if (!Object.hasOwn(values, key)) {
      throw new Error(`Unknown template token "${match}" in ${sourceLabel}`);
    }
    return values[key];
  });
}

function validateAndNormalizeTokens(tokens) {
  if (!tokens || typeof tokens !== 'object') {
    throw new Error('Template tokens must be a non-null object');
  }

  const missing = [];
  const normalized = Object.create(null);

  for (const key of REQUIRED_TEMPLATE_TOKENS) {
    if (
      !Object.hasOwn(tokens, key) ||
      tokens[key] === undefined ||
      tokens[key] === null
    ) {
      missing.push(key);
    } else {
      normalized[key] = String(tokens[key]);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required ESG30 report template token(s): ${missing.join(', ')}`
    );
  }

  return normalized;
}

/**
 * 渲染 ESG30 学术报告单页 HTML。
 *
 * - 全程单遍回调替换：对 `$$` / `$&` / `` $` `` / `$'` 绝对免疫，且不会对已替换的正文二次级联替换。
 * - 先在 `script.js` 中渲染 `{{SLUG}}`，再把 `{{STYLES}}`、`{{SCRIPT}}` 与所有文档占位符一次装配进 `template.html`。
 * - 校验缺失必填占位符及模板内未知 `{{TOKEN}}`。
 *
 * @param {Record<string, string | number>} tokens
 * @param {{ templateDir?: string }} [options]
 * @returns {string}
 */
export function renderEsg30ReportTemplate(tokens, options = {}) {
  const resolvedTokens = validateAndNormalizeTokens(tokens);
  const { html, styles, script } = loadEsg30ReportTemplateParts(
    options.templateDir
  );

  // styles.css 不允许存在未登记的占位符
  const validatedStyles = substituteTokens(
    styles,
    Object.create(null),
    'styles.css'
  );

  const scriptValues = Object.assign(Object.create(null), {
    SLUG: resolvedTokens.SLUG,
  });
  const renderedScript = substituteTokens(script, scriptValues, 'script.js');

  const htmlValues = Object.assign(Object.create(null), resolvedTokens, {
    STYLES: validatedStyles,
    SCRIPT: renderedScript,
  });

  return substituteTokens(html, htmlValues, 'template.html');
}

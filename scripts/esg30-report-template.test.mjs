import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  REQUIRED_TEMPLATE_TOKENS,
  loadEsg30ReportTemplateParts,
  renderEsg30ReportTemplate,
} from './lib/esg30-report-template.mjs';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

function makeSampleTokens(overrides = {}) {
  return {
    DOC_TITLE: 'ESG30 示例报告标题',
    PROGRAM_NAME: 'ESG30 研究计划',
    TEX_SHA: '0123456789abcdef',
    PDF_PAGE_SUFFIX: ' (42 页)',
    REPORT_TYPE: '研究报告',
    REPORT_VERSION: '2026 年修订版',
    DOC_AUTHOR: '课题组',
    DOC_DATE: '2026年9月15日',
    CHAR_COUNT_K: 28,
    READ_MINUTES: 35,
    ABSTRACT_TEXT: '示例摘要文本。',
    KEYWORDS_TEXT: 'CCUS；集群治理；产业信用基础设施',
    BODY_HTML: '<section id="intro"><h1>引言</h1><p>正文段落。</p></section>',
    SLUG: '2601_ESG30',
    ...overrides,
  };
}

function createTempTemplateDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'esg30-report-template-'));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content, 'utf8');
  }
  return dir;
}

test('渲染全部 14 个占位符，输出仅含 LF 且无尾换行', () => {
  assert.equal(REQUIRED_TEMPLATE_TOKENS.length, 14);

  const tokens = makeSampleTokens();
  const output = renderEsg30ReportTemplate(tokens);

  assert.equal(output.includes('\r'), false, '输出不得包含 CR/CRLF');
  assert.equal(
    output.endsWith('</body>\n</html>'),
    true,
    '输出应以 </body>\\n</html> 结尾且无尾换行'
  );
  assert.equal(output.endsWith('\n'), false, '输出末尾不得多出换行符');

  assert.ok(
    output.includes(`<title>${tokens.DOC_TITLE} | CCUS Policy Hub</title>`)
  );
  assert.ok(
    output.includes(
      `<meta name="description" content="${tokens.PROGRAM_NAME}：${tokens.DOC_TITLE}" />`
    )
  );
  assert.ok(
    output.includes(
      `<meta name="paper-source" content="paper_draft.tex sha256:${tokens.TEX_SHA}" />`
    )
  );
  assert.ok(output.includes(`下载原版 PDF${tokens.PDF_PAGE_SUFFIX}`));
  assert.ok(
    output.includes(
      `<span>${tokens.PROGRAM_NAME} · ${tokens.REPORT_TYPE} (${tokens.REPORT_VERSION})</span>`
    )
  );
  assert.ok(output.includes(tokens.DOC_AUTHOR));
  assert.ok(output.includes(tokens.DOC_DATE));
  assert.ok(output.includes(`约 ${tokens.CHAR_COUNT_K}k 字`));
  assert.ok(output.includes(`</svg>${tokens.READ_MINUTES} 分钟</span>`));
  assert.ok(
    output.includes(
      `<div class="abstract-content">\n            ${tokens.ABSTRACT_TEXT}\n          </div>`
    )
  );
  assert.ok(
    output.includes(`<strong>关键词：</strong>${tokens.KEYWORDS_TEXT}`)
  );
  assert.ok(output.includes(tokens.BODY_HTML));
  assert.ok(output.includes(`title={${tokens.DOC_TITLE}},`));
  assert.ok(
    output.includes(
      `const STORAGE_KEY = 'ccus_report_comments_${tokens.SLUG}';`
    )
  );
  assert.equal(
    /\{\{[A-Z0-9_]+\}\}/.test(output),
    false,
    '渲染结果不得残留任何未替换占位符'
  );
});

test('允许 PDF_PAGE_SUFFIX 为空字符串与数字型字数/阅读时长', () => {
  const output = renderEsg30ReportTemplate(
    makeSampleTokens({
      PDF_PAGE_SUFFIX: '',
      CHAR_COUNT_K: 0,
      READ_MINUTES: 1,
    })
  );
  assert.ok(output.includes('约 0k 字'));
  assert.ok(output.includes('</svg>1 分钟</span>'));
  assert.ok(output.includes('title="下载原版 PDF"'));
  assert.equal(output.includes('undefined'), false);
});

test('缺少任意必填占位符、传 undefined/null 或非对象时抛出明确错误', () => {
  assert.throws(() => renderEsg30ReportTemplate(null), /non-null object/i);

  for (const key of REQUIRED_TEMPLATE_TOKENS) {
    const omitted = makeSampleTokens();
    delete omitted[key];
    assert.throws(
      () => renderEsg30ReportTemplate(omitted),
      (err) => err instanceof Error && err.message.includes(key),
      `缺失 ${key} 时应报错并指明字段名`
    );

    const withUndefined = makeSampleTokens({ [key]: undefined });
    assert.throws(
      () => renderEsg30ReportTemplate(withUndefined),
      (err) => err instanceof Error && err.message.includes(key),
      `${key}=undefined 时应报错并指明字段名`
    );

    const withNull = makeSampleTokens({ [key]: null });
    assert.throws(
      () => renderEsg30ReportTemplate(withNull),
      (err) => err instanceof Error && err.message.includes(key),
      `${key}=null 时应报错并指明字段名`
    );
  }
});

test('模板文件中出现未知 {{TOKEN}} 时抛出明确错误', () => {
  const dirHtml = createTempTemplateDir({
    'template.html':
      '<!DOCTYPE html>{{STYLES}}{{SCRIPT}}{{UNKNOWN_HTML_TOKEN}}',
    'styles.css': 'body {}',
    'script.js': 'const s = "{{SLUG}}";',
  });
  const dirCss = createTempTemplateDir({
    'template.html': '<!DOCTYPE html>{{STYLES}}{{SCRIPT}}',
    'styles.css': 'body { content: "{{UNKNOWN_CSS_TOKEN}}"; }',
    'script.js': 'const s = "{{SLUG}}";',
  });
  const dirJs = createTempTemplateDir({
    'template.html': '<!DOCTYPE html>{{STYLES}}{{SCRIPT}}',
    'styles.css': 'body {}',
    'script.js': 'const s = "{{SLUG}}"; const x = "{{UNKNOWN_JS_TOKEN}}";',
  });

  try {
    assert.throws(
      () =>
        renderEsg30ReportTemplate(makeSampleTokens(), { templateDir: dirHtml }),
      /UNKNOWN_HTML_TOKEN.*template\.html/
    );
    assert.throws(
      () =>
        renderEsg30ReportTemplate(makeSampleTokens(), { templateDir: dirCss }),
      /UNKNOWN_CSS_TOKEN.*styles\.css/
    );
    assert.throws(
      () =>
        renderEsg30ReportTemplate(makeSampleTokens(), { templateDir: dirJs }),
      /UNKNOWN_JS_TOKEN.*script\.js/
    );
  } finally {
    fs.rmSync(dirHtml, { recursive: true, force: true });
    fs.rmSync(dirCss, { recursive: true, force: true });
    fs.rmSync(dirJs, { recursive: true, force: true });
  }
});

test("对 $ 替换模式免疫（$$ / $& / $` / $' / $1 均原样保留）", () => {
  const dollarBody =
    "<p>成本公式：$$E = mc^2$$，替换符 $&amp; 与 $& / $` / $' / $1 均不得被吞噬。</p>";
  const dollarAbstract = "摘要含 $$100 / $& / $` / $' / $2 字符。";

  const output = renderEsg30ReportTemplate(
    makeSampleTokens({
      BODY_HTML: dollarBody,
      ABSTRACT_TEXT: dollarAbstract,
    })
  );

  assert.ok(
    output.includes(dollarBody),
    "BODY_HTML 中的 $$ / $& / $` / $' / $1 必须原样保留"
  );
  assert.ok(
    output.includes(
      `<div class="abstract-content">\n            ${dollarAbstract}\n          </div>`
    ),
    "ABSTRACT_TEXT 中的 $$ / $& / $` / $' / $2 必须原样保留"
  );
});

test('单遍替换不发生级联展开（BODY_HTML / ABSTRACT_TEXT / SLUG 中的 {{TOKEN}} 字面量原样保留）', () => {
  const literalBody =
    '<p>模板占位符示例：{{DOC_TITLE}} / {{STYLES}} / {{SCRIPT}} / {{SLUG}}</p>';
  const literalAbstract = '摘要字面量 {{DOC_TITLE}} 与 {{BODY_HTML}}';
  const literalSlug = 'slug-{{DOC_TITLE}}';

  const output = renderEsg30ReportTemplate(
    makeSampleTokens({
      DOC_TITLE: 'SHOULD_NOT_CASCADE',
      BODY_HTML: literalBody,
      ABSTRACT_TEXT: literalAbstract,
      SLUG: literalSlug,
    })
  );

  assert.ok(
    output.includes(literalBody),
    'BODY_HTML 内的 {{TOKEN}} 不得二次展开'
  );
  assert.ok(
    output.includes(
      `<div class="abstract-content">\n            ${literalAbstract}\n          </div>`
    ),
    'ABSTRACT_TEXT 内的 {{TOKEN}} 不得二次展开'
  );
  assert.ok(
    output.includes(
      `const STORAGE_KEY = 'ccus_report_comments_${literalSlug}';`
    ),
    'script.js 注入的 SLUG 若含 {{DOC_TITLE}} 不得在装配进 template.html 时二次展开'
  );
});

test('读取 CRLF 模板文件时自动归一为 LF 且保持无尾换行', () => {
  const dir = createTempTemplateDir({
    'template.html':
      '<!DOCTYPE html>\r\n<style>\r\n{{STYLES}}\r\n</style>\r\n<body>{{BODY_HTML}}<script>\r\n{{SCRIPT}}\r\n</script>\r\n</body>\r\n</html>\r\n',
    'styles.css': 'body {\r\n  color: red;\r\n}\r\n',
    'script.js': 'const k = "{{SLUG}}";\r\n',
  });

  try {
    const output = renderEsg30ReportTemplate(
      makeSampleTokens({ BODY_HTML: '<p>ok</p>', SLUG: 'demo' }),
      { templateDir: dir }
    );
    assert.equal(
      output,
      '<!DOCTYPE html>\n<style>\nbody {\n  color: red;\n}\n</style>\n<body><p>ok</p><script>\nconst k = "demo";\n</script>\n</body>\n</html>'
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('静态模板区块与已提交 public/reports/2601_ESG30/index.html 逐字节完全一致', () => {
  const committedPath = path.join(
    repoRoot,
    'public/reports/2601_ESG30/index.html'
  );
  const committedBuf = fs.readFileSync(committedPath);
  const committedHtml = committedBuf.toString('utf8');

  assert.equal(committedHtml.includes('\r'), false, '已提交报告页应仅含 LF');
  assert.equal(
    committedHtml.endsWith('</body>\n</html>'),
    true,
    '已提交报告页应以 </body>\\n</html> 结尾'
  );

  const { html, styles, script } = loadEsg30ReportTemplateParts();
  const assembledTemplate = html.replace(/\{\{(STYLES|SCRIPT)\}\}/g, (_, k) =>
    k === 'STYLES' ? styles : script
  );

  // 将模板按 {{TOKEN}} 拆分为 [static0, token0, static1, token1, ..., staticN]
  const segments = assembledTemplate.split(/(\{\{[A-Z0-9_]+\}\})/);
  assert.equal(segments.length % 2, 1);

  const firstStatic = segments[0];
  assert.equal(
    committedHtml.startsWith(firstStatic),
    true,
    '已提交页面开头与模板首段静态文本不一致'
  );

  const extracted = Object.create(null);
  let cursor = firstStatic.length;

  for (let i = 1; i < segments.length; i += 2) {
    const tokenName = segments[i].slice(2, -2);
    const nextStatic = segments[i + 1];
    const isLast = i + 2 === segments.length;

    let nextIdx;
    if (isLast) {
      assert.equal(
        committedHtml.endsWith(nextStatic),
        true,
        '已提交页面末尾与模板尾段静态文本（含 script.js 与 EOF）不一致'
      );
      nextIdx = committedHtml.length - nextStatic.length;
    } else {
      nextIdx = committedHtml.indexOf(nextStatic, cursor);
      assert.notEqual(
        nextIdx,
        -1,
        `在已提交页面中未能按顺序匹配到 ${tokenName} 之后的静态区块`
      );
    }

    const capturedValue = committedHtml.slice(cursor, nextIdx);
    if (Object.hasOwn(extracted, tokenName)) {
      assert.equal(
        capturedValue,
        extracted[tokenName],
        `占位符 ${tokenName} 在页面多处出现的值不一致`
      );
    } else {
      extracted[tokenName] = capturedValue;
    }
    cursor = nextIdx + nextStatic.length;
  }

  assert.equal(cursor, committedHtml.length, '未能覆盖已提交页面全部字节');
  assert.deepEqual(
    Object.keys(extracted).sort(),
    [...REQUIRED_TEMPLATE_TOKENS].sort(),
    '提取出的占位符集合应与 REQUIRED_TEMPLATE_TOKENS 完全一致'
  );

  const rendered = renderEsg30ReportTemplate(extracted);
  const renderedBuf = Buffer.from(rendered, 'utf8');
  assert.equal(
    Buffer.compare(renderedBuf, committedBuf),
    0,
    'renderEsg30ReportTemplate 输出与已提交 public/reports/2601_ESG30/index.html 存在字节差异'
  );
});

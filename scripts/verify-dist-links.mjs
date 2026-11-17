#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_SITE_BASE = '/ccus-policy-hub';
export const DEFAULT_SITE_ORIGIN = 'https://liuh886.github.io';

function maskNonNewlines(text) {
  return text.replace(/[^\n]/g, ' ');
}

function stripNonDomBlocks(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, maskNonNewlines)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, maskNonNewlines)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, maskNonNewlines);
}

function lineNumberAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function resolveInsideDist(distRoot, relativePath) {
  const cleaned = relativePath.replace(/^\/+/, '');
  const resolved = path.resolve(distRoot, cleaned);
  if (resolved !== distRoot && !resolved.startsWith(distRoot + path.sep)) {
    return null;
  }
  return resolved;
}

function validateInternalPathname({
  pathname,
  rawUrl,
  fileRel,
  line,
  distRoot,
  siteBase,
  isRss = false,
}) {
  const prefix = isRss ? 'rss-' : '';
  if (pathname !== siteBase && !pathname.startsWith(`${siteBase}/`)) {
    return {
      type: `${prefix}missing-base`,
      file: fileRel,
      line,
      url: rawUrl,
      message: `Internal URL "${rawUrl}" is missing site base "${siteBase}/"`,
    };
  }

  if (
    pathname === `${siteBase}${siteBase}` ||
    pathname.startsWith(`${siteBase}${siteBase}/`)
  ) {
    return {
      type: `${prefix}double-base`,
      file: fileRel,
      line,
      url: rawUrl,
      message: `Internal URL "${rawUrl}" duplicates site base "${siteBase}"`,
    };
  }

  let relPath;
  try {
    relPath = decodeURIComponent(pathname.slice(siteBase.length)) || '/';
  } catch {
    return {
      type: `${prefix}invalid-url`,
      file: fileRel,
      line,
      url: rawUrl,
      message: `Internal URL "${rawUrl}" has malformed percent-encoding`,
    };
  }

  const target = resolveInsideDist(distRoot, relPath);
  if (!target) {
    return {
      type: `${prefix}path-escape`,
      file: fileRel,
      line,
      url: rawUrl,
      message: `Internal URL "${rawUrl}" escapes dist root`,
    };
  }

  if (pathname.endsWith('/')) {
    const indexTarget = path.join(target, 'index.html');
    if (isFile(indexTarget)) return null;
    // Astro outputs `dist/404.html` (rather than `dist/404/index.html`) for the
    // root 404 fallback while SEO/LanguagePicker emit `/404/` per trailingSlash.
    if (relPath === '/404/' && isFile(path.join(distRoot, '404.html'))) {
      return null;
    }
    return {
      type: `${prefix}broken-link`,
      file: fileRel,
      line,
      url: rawUrl,
      message: `Internal link target "${rawUrl}" does not exist (${path.relative(distRoot, indexTarget)})`,
    };
  }

  if (isFile(target)) {
    return null;
  }

  const indexTarget = path.join(target, 'index.html');
  if (isFile(indexTarget)) {
    return {
      type: `${prefix}missing-trailing-slash`,
      file: fileRel,
      line,
      url: rawUrl,
      message: `Directory route "${rawUrl}" must end with a trailing slash ("${pathname}/")`,
    };
  }

  return {
    type: `${prefix}broken-link`,
    file: fileRel,
    line,
    url: rawUrl,
    message: `Internal link target "${rawUrl}" does not exist in dist`,
  };
}

function validateRelativeTarget({ rawUrl, pathname, fileRel, line, distRoot }) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return {
      type: 'invalid-url',
      file: fileRel,
      line,
      url: rawUrl,
      message: `Relative URL "${rawUrl}" has malformed percent-encoding`,
    };
  }

  const baseDir = path.dirname(path.resolve(distRoot, fileRel));
  const target = path.resolve(baseDir, decoded);
  if (target !== distRoot && !target.startsWith(distRoot + path.sep)) {
    return {
      type: 'path-escape',
      file: fileRel,
      line,
      url: rawUrl,
      message: `Relative URL "${rawUrl}" escapes dist root`,
    };
  }

  if (pathname.endsWith('/')) {
    const indexTarget = path.join(target, 'index.html');
    if (!isFile(indexTarget)) {
      return {
        type: 'broken-link',
        file: fileRel,
        line,
        url: rawUrl,
        message: `Relative link target "${rawUrl}" does not exist`,
      };
    }
    return null;
  }

  if (isFile(target)) return null;
  if (isFile(path.join(target, 'index.html'))) {
    return {
      type: 'missing-trailing-slash',
      file: fileRel,
      line,
      url: rawUrl,
      message: `Relative directory link "${rawUrl}" must end with "/"`,
    };
  }

  return {
    type: 'broken-link',
    file: fileRel,
    line,
    url: rawUrl,
    message: `Relative link target "${rawUrl}" does not exist in dist`,
  };
}

export function verifyHtmlContent(
  html,
  fileRel,
  distRoot,
  { siteBase = DEFAULT_SITE_BASE, siteOrigin = DEFAULT_SITE_ORIGIN } = {}
) {
  const errors = [];
  const masked = stripNonDomBlocks(html);

  // 1. Nested <a> check
  const anchorTagRe = /<(\/?)a(?=\s|>)/gi;
  let anchorDepth = 0;
  for (const match of masked.matchAll(anchorTagRe)) {
    const isClosing = match[1] === '/';
    if (isClosing) {
      if (anchorDepth > 0) anchorDepth -= 1;
    } else {
      if (anchorDepth > 0) {
        errors.push({
          type: 'nested-anchor',
          file: fileRel,
          line: lineNumberAt(masked, match.index),
          url: '',
          message: 'Nested <a> tag found inside an open <a> element',
        });
      }
      anchorDepth += 1;
    }
  }

  // 2. Internal <a href> and <link href> checks
  const hrefTagRe =
    /<(a|link)\b([^>]*?)\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi;
  for (const match of masked.matchAll(hrefTagRe)) {
    const tagName = match[1].toLowerCase();
    const attrs = match[2] || '';
    if (tagName === 'link') {
      const relMatch = attrs.match(/\brel\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      const rel = (relMatch?.[1] ?? relMatch?.[2] ?? '').toLowerCase();
      if (
        rel.includes('preconnect') ||
        rel.includes('dns-prefetch') ||
        rel.includes('alternate') ||
        rel.includes('canonical')
      ) {
        // Still validate canonical/alternate if they point to our origin
        if (rel.includes('preconnect') || rel.includes('dns-prefetch')) {
          continue;
        }
      }
    }

    const rawHref = decodeHtmlEntities((match[3] ?? match[4] ?? '').trim());
    if (
      !rawHref ||
      rawHref.startsWith('#') ||
      rawHref.startsWith('//') ||
      /^(?:mailto|tel|javascript|data|blob):/i.test(rawHref)
    ) {
      continue;
    }

    const line = lineNumberAt(masked, match.index);

    if (/^https?:\/\//i.test(rawHref)) {
      let parsed;
      try {
        parsed = new URL(rawHref);
      } catch {
        errors.push({
          type: 'invalid-url',
          file: fileRel,
          line,
          url: rawHref,
          message: `Malformed URL "${rawHref}"`,
        });
        continue;
      }
      if (parsed.origin !== siteOrigin) continue;
      const issue = validateInternalPathname({
        pathname: parsed.pathname,
        rawUrl: rawHref,
        fileRel,
        line,
        distRoot,
        siteBase,
      });
      if (issue) errors.push(issue);
      continue;
    }

    const pathOnly = rawHref.split('#')[0].split('?')[0];
    if (!pathOnly) continue;

    if (pathOnly.startsWith('/')) {
      const issue = validateInternalPathname({
        pathname: pathOnly,
        rawUrl: rawHref,
        fileRel,
        line,
        distRoot,
        siteBase,
      });
      if (issue) errors.push(issue);
    } else {
      const issue = validateRelativeTarget({
        rawUrl: rawHref,
        pathname: pathOnly,
        fileRel,
        line,
        distRoot,
      });
      if (issue) errors.push(issue);
    }
  }

  return errors;
}

export function verifyRssContent(
  xml,
  fileRel,
  distRoot,
  { siteBase = DEFAULT_SITE_BASE, siteOrigin = DEFAULT_SITE_ORIGIN } = {}
) {
  const errors = [];
  const tagRe = /<(link|guid)(?:\s+[^>]*)?>([^<]+)<\/\1>/gi;
  for (const match of xml.matchAll(tagRe)) {
    const rawUrl = decodeHtmlEntities(match[2].trim());
    const line = lineNumberAt(xml, match.index);

    if (/^https?:\/\//i.test(rawUrl)) {
      let parsed;
      try {
        parsed = new URL(rawUrl);
      } catch {
        errors.push({
          type: 'rss-invalid-url',
          file: fileRel,
          line,
          url: rawUrl,
          message: `Malformed RSS URL "${rawUrl}"`,
        });
        continue;
      }
      if (parsed.origin !== siteOrigin) continue;
      const issue = validateInternalPathname({
        pathname: parsed.pathname,
        rawUrl,
        fileRel,
        line,
        distRoot,
        siteBase,
        isRss: true,
      });
      if (issue) errors.push(issue);
    } else if (rawUrl.startsWith('/')) {
      const issue = validateInternalPathname({
        pathname: rawUrl.split('#')[0].split('?')[0],
        rawUrl,
        fileRel,
        line,
        distRoot,
        siteBase,
        isRss: true,
      });
      if (issue) errors.push(issue);
    }
  }
  return errors;
}

function walkFiles(dir, predicate, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, predicate, results);
    } else if (entry.isFile() && predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

export function verifyDistLinks({
  distRoot = path.resolve('dist'),
  siteBase = DEFAULT_SITE_BASE,
  siteOrigin = DEFAULT_SITE_ORIGIN,
  requireRss = true,
} = {}) {
  const resolvedDist = path.resolve(distRoot);
  if (!fs.existsSync(resolvedDist)) {
    throw new Error(`dist directory does not exist: ${resolvedDist}`);
  }

  const htmlFiles = walkFiles(resolvedDist, (f) => f.endsWith('.html')).sort();
  if (htmlFiles.length === 0) {
    throw new Error(`No HTML files found in ${resolvedDist}`);
  }

  const errors = [];
  for (const filePath of htmlFiles) {
    const rel = path.relative(resolvedDist, filePath).replace(/\\/g, '/');
    const html = fs.readFileSync(filePath, 'utf8');
    errors.push(
      ...verifyHtmlContent(html, rel, resolvedDist, { siteBase, siteOrigin })
    );
  }

  const rssPath = path.join(resolvedDist, 'rss.xml');
  let rssChecked = false;
  if (isFile(rssPath)) {
    rssChecked = true;
    const xml = fs.readFileSync(rssPath, 'utf8');
    errors.push(
      ...verifyRssContent(xml, 'rss.xml', resolvedDist, {
        siteBase,
        siteOrigin,
      })
    );
  } else if (requireRss) {
    errors.push({
      type: 'rss-missing',
      file: 'rss.xml',
      line: 1,
      url: '',
      message: 'Built dist/rss.xml is missing',
    });
  }

  return {
    distRoot: resolvedDist,
    htmlFiles: htmlFiles.length,
    rssChecked,
    errors,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  const rootArgIdx = args.indexOf('--root');
  const distRoot =
    rootArgIdx !== -1 && args[rootArgIdx + 1]
      ? path.resolve(args[rootArgIdx + 1])
      : path.resolve('dist');

  const result = verifyDistLinks({ distRoot });
  const counts = {};
  for (const err of result.errors) {
    counts[err.type] = (counts[err.type] || 0) + 1;
  }

  console.log(
    JSON.stringify({
      htmlFiles: result.htmlFiles,
      rssChecked: result.rssChecked,
      errorCount: result.errors.length,
      errorTypes: counts,
    })
  );

  if (result.errors.length > 0) {
    for (const err of result.errors.slice(0, 25)) {
      console.error(`[${err.type}] ${err.file}:${err.line} ${err.message}`);
    }
    if (result.errors.length > 25) {
      console.error(
        `... and ${result.errors.length - 25} more error(s) omitted.`
      );
    }
    process.exit(1);
  }
}

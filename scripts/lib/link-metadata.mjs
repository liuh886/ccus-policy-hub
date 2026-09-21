/**
 * Fetch display metadata (title, publication date, language) for an external
 * URL, for the facility news/source list.
 *
 * Data-preparation only: this never runs during the Astro build. It performs a
 * single capped GET per URL and parses only the document head. Failures are
 * reported, not thrown, so a run is resumable and partials degrade to the
 * domain-name fallback in the UI.
 */

const DEFAULT_UA =
  'CCUSPolicyHubBot/1.0 (+https://github.com/liuh886/ccus-policy-hub; facility source metadata)';
const MAX_BYTES = 256 * 1024;

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
  '#x27': "'",
  '#x2F': '/',
};

export function decodeEntities(value) {
  if (!value) return value;
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, code) => {
    if (ENTITIES[code] !== undefined) return ENTITIES[code];
    if (code[0] === '#') {
      const num =
        code[1] === 'x' || code[1] === 'X'
          ? Number.parseInt(code.slice(2), 16)
          : Number.parseInt(code.slice(1), 10);
      if (Number.isFinite(num) && num > 0 && num < 0x10ffff) {
        try {
          return String.fromCodePoint(num);
        } catch {
          return match;
        }
      }
    }
    return match;
  });
}

function cleanText(value) {
  return decodeEntities(value).replace(/\s+/g, ' ').trim();
}

/** Anti-bot / paywall / error placeholders that are not real article titles. */
const GENERIC_TITLE_EXACT = new Set([
  'client challenge',
  'just a moment...',
  'just a moment',
  'access denied',
  'access denied |',
  'attention required! | cloudflare',
  'are you a robot?',
  'redirecting',
  'redirecting...',
  'please wait...',
  'verify you are human',
  'page not found',
  '404 not found',
  '404 error',
  '403 forbidden',
  'site not found',
  'not found',
  'untitled',
  'error',
  'home',
  'homepage',
  'news',
  'projects',
  'project',
  'resources',
  'corporate',
  'media',
  'all resources & news',
  'news & events',
  'loading...',
]);

const GENERIC_TITLE_CONTAINS = [
  'are you a robot',
  'checking your browser',
  'enable javascript',
  'access to this page has been denied',
  'attention required',
  'just a moment',
  'verifying you are human',
  'request blocked',
  'service unavailable',
  'internal server error',
  'seite nicht gefunden',
  '找不到',
  '页面不存在',
  'not found',
  '404',
];

/** Clearly off-topic spam / link-farm titles seen at hijacked URLs. */
const SPAM_TITLE_CONTAINS = [
  'film production',
  'film career',
  'online course',
  'casino',
  'betting',
  'viagra',
  'escort',
  'replica watch',
  'payday loan',
  'call girl',
  'porn',
  '🎬',
];

export function isGenericTitle(title, hostname = '') {
  if (!title) return true;
  const normalized = title.trim().toLowerCase();
  if (normalized.length < 4) return true;
  if (GENERIC_TITLE_EXACT.has(normalized)) return true;
  if (GENERIC_TITLE_CONTAINS.some((needle) => normalized.includes(needle))) {
    return true;
  }
  if (SPAM_TITLE_CONTAINS.some((needle) => normalized.includes(needle))) {
    return true;
  }
  if (hostname && normalized.replace(/^www\./, '') === hostname) return true;
  return false;
}

function metaContent(html, attr, value) {
  // Match either attribute order: <meta property="og:title" content="...">
  const patterns = [
    new RegExp(
      `<meta[^>]+${attr}=["']${value}["'][^>]*content=["']([^"']*)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${value}["']`,
      'i'
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return cleanText(match[1]);
  }
  return '';
}

export function extractTitle(html) {
  const og = metaContent(html, 'property', 'og:title');
  if (og) return og.slice(0, 300);
  const twitter = metaContent(html, 'name', 'twitter:title');
  if (twitter) return twitter.slice(0, 300);
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanText(match[1]).slice(0, 300) : '';
}

function toIsoDate(value) {
  if (!value) return '';
  const trimmed = value.trim();
  const match = trimmed.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    // Use local components: non-ISO date strings parse at local midnight and
    // toISOString() would shift them a day in positive-offset timezones.
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '';
}

export function extractPublishedDate(html) {
  const candidates = [
    metaContent(html, 'property', 'article:published_time'),
    metaContent(html, 'property', 'og:published_time'),
    metaContent(html, 'name', 'date'),
    metaContent(html, 'itemprop', 'datePublished'),
    metaContent(html, 'name', 'pubdate'),
    metaContent(html, 'name', 'publish-date'),
  ].filter(Boolean);
  if (candidates.length === 0) {
    const time = html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
    if (time) candidates.push(time[1]);
  }
  for (const candidate of candidates) {
    const iso = toIsoDate(candidate);
    if (iso) return iso;
  }
  return '';
}

export function extractItemLang(html) {
  const match = html.match(/<html[^>]+lang=["']([a-zA-Z-]+)["']/i);
  if (!match) return '';
  const lang = match[1].toLowerCase();
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('en')) return 'en';
  return lang.split('-')[0];
}

async function readCapped(response, maxBytes) {
  if (!response.body || typeof response.body.getReader !== 'function') {
    return (await response.text()).slice(0, maxBytes);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let received = 0;
  let out = '';
  try {
    while (received < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      out += decoder.decode(value, { stream: true });
    }
    out += decoder.decode();
  } finally {
    reader.cancel().catch(() => {});
  }
  return out.slice(0, maxBytes);
}

/**
 * Fetch and parse metadata for one URL.
 * @returns {Promise<{url, ok, status, title, publishedDate, itemLang, reason}>}
 */
export async function fetchLinkMetadata(
  url,
  { fetchImpl = fetch, timeoutMs = 15000, userAgent = DEFAULT_UA } = {}
) {
  const base = { url, title: '', publishedDate: '', itemLang: '', status: 0 };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    const status = response.status;
    if (!response.ok) {
      return { ...base, ok: false, status, reason: `http_${status}` };
    }
    const contentType = (
      response.headers.get('content-type') || ''
    ).toLowerCase();
    if (contentType && !/text\/html|application\/xhtml/.test(contentType)) {
      return { ...base, ok: false, status, reason: 'non_html' };
    }
    const html = await readCapped(response, MAX_BYTES);
    const rawTitle = extractTitle(html);
    let hostname = '';
    try {
      hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      hostname = '';
    }
    if (isGenericTitle(rawTitle, hostname)) {
      return {
        ...base,
        ok: false,
        status,
        reason: 'generic_title',
        publishedDate: extractPublishedDate(html),
      };
    }
    return {
      ...base,
      ok: true,
      status,
      title: rawTitle,
      publishedDate: extractPublishedDate(html),
      itemLang: extractItemLang(html),
    };
  } catch (error) {
    const reason =
      error?.name === 'AbortError' ? 'timeout' : error?.code || 'fetch_error';
    return { ...base, ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}

/** Run `worker` over `items` with bounded concurrency, preserving order. */
export async function mapWithConcurrency(items, worker, concurrency = 8) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await worker(items[index], index);
      }
    }
  );
  await Promise.all(runners);
  return results;
}

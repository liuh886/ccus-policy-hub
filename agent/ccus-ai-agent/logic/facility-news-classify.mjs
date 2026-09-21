/**
 * Facility news/source classification (see METHODOLOGY.md).
 *
 * Pure, deterministic helpers that turn a raw URL into a normalized dedup key,
 * an evidence tier, and a display publisher. No network access, no writes.
 *
 * Tiers, most authoritative first:
 *   official      government / regulator / agency publications
 *   press_release first-party newsrooms and wire-service releases
 *   media         independent journalism
 *   reference     project portals, datasets, papers, everything unmatched
 *
 * The unmatched default is `reference` on purpose: an unknown domain must
 * never be presented as "news".
 */

export const NEWS_TIERS = Object.freeze([
  'official',
  'press_release',
  'media',
  'reference',
]);

export const TIER_RANK = Object.freeze({
  official: 0,
  press_release: 1,
  media: 2,
  reference: 3,
});

/** Query params stripped before dedup (analytics / campaign / referral). */
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_name',
  'gclid',
  'fbclid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'spm',
  'ref',
  'ref_src',
  'yclid',
  'gbraid',
  'wbraid',
  '_hsenc',
  '_hsmi',
]);

/** Host suffixes that always denote an official/government source. */
const OFFICIAL_SUFFIXES = Object.freeze([
  '.gov',
  '.gov.uk',
  '.gov.au',
  '.govt.nz',
  '.gov.ie',
  '.gov.za',
  '.gov.br',
  '.gov.in',
  '.gov.nl',
  '.gov.cn',
  '.gov.sg',
  '.govt.nz',
  '.gc.ca',
  '.go.jp',
  '.go.kr',
  '.gob.es',
  '.gouv.fr',
  '.bund.de',
  '.admin.ch',
  '.europa.eu',
  '.un.org',
  '.govt.uk',
]);

/** Official domains that do not carry a recognizable government suffix. */
const OFFICIAL_DOMAINS = new Set([
  'alberta.ca',
  'eralberta.ca',
  'nstauthority.co.uk',
]);

/** Wire / distribution services carrying first-party press releases. */
const WIRE_DOMAINS = new Set([
  'prnewswire.com',
  'prnewswire.co.uk',
  'businesswire.com',
  'newswire.ca',
  'globenewswire.com',
  'accesswire.com',
  'einpresswire.com',
  'prnews.com',
]);

/** Independent media outlets. */
const MEDIA_DOMAINS = new Set([
  'reuters.com',
  'upstreamonline.com',
  'offshore-energy.biz',
  'carbonherald.com',
  'carboncapturejournal.com',
  'energyvoice.com',
  'spglobal.com',
  'argusmedia.com',
  'bloomberg.com',
  'ft.com',
  'wsj.com',
  'nytimes.com',
  'theguardian.com',
  'bbc.com',
  'bbc.co.uk',
  'cnbc.com',
  'apnews.com',
  'rechargenews.com',
  'hydrocarbons21.com',
  'gasworld.com',
  'lemonde.fr',
  'lesechos.fr',
  'handelsblatt.com',
  'euractiv.com',
  'politico.eu',
  'montelnews.com',
  'reutersevents.com',
  'energynewsbulletin.net',
]);

/** Curated publisher display names for the highest-traffic hosts. */
const PUBLISHER_NAMES = Object.freeze({
  'energy.gov': 'U.S. Department of Energy',
  'netl.doe.gov': 'NETL (U.S. DOE)',
  'epa.gov': 'U.S. EPA',
  'alberta.ca': 'Government of Alberta',
  'eralberta.ca': 'Emissions Reduction Alberta',
  'gov.uk': 'UK Government',
  'nstauthority.co.uk': 'North Sea Transition Authority',
  'ec.europa.eu': 'European Commission',
  'energy.ec.europa.eu': 'European Commission (Energy)',
  'climate.ec.europa.eu': 'European Commission (Climate)',
  'meti.go.jp': 'METI (Japan)',
  'prnewswire.com': 'PR Newswire',
  'businesswire.com': 'Business Wire',
  'newswire.ca': 'CNW / Newswire',
  'globenewswire.com': 'GlobeNewswire',
  'reuters.com': 'Reuters',
  'bloomberg.com': 'Bloomberg',
  'ft.com': 'Financial Times',
  'spglobal.com': 'S&P Global',
  'upstreamonline.com': 'Upstream Online',
  'offshore-energy.biz': 'Offshore Energy',
  'carbonherald.com': 'Carbon Herald',
  'carboncapturejournal.com': 'Carbon Capture Journal',
  'energyvoice.com': 'Energy Voice',
  'argusmedia.com': 'Argus Media',
  'linkedin.com': 'LinkedIn',
  'sciencedirect.com': 'ScienceDirect',
  'summitcarbonsolutions.com': 'Summit Carbon Solutions',
  'santos.com': 'Santos',
  'equinor.com': 'Equinor',
  'totalenergies.com': 'TotalEnergies',
  'corporate.exxonmobil.com': 'ExxonMobil',
  'heidelbergmaterials.com': 'Heidelberg Materials',
  'akercarboncapture.com': 'Aker Carbon Capture',
  'wintershalldea.com': 'Wintershall Dea',
  'orsted.com': 'Ørsted',
  'denbury.com': 'Denbury',
  'japex.co.jp': 'JAPEX',
  'horisontenergi.no': 'Horisont Energi',
  'repair-carbon.com': 'RepAir Carbon',
});

/**
 * Normalize a URL into a stable dedup key. Returns null for anything that is
 * not an absolute http(s) URL. Protocol is folded to https, `www.` and
 * tracking params are dropped, trailing slashes removed, remaining query
 * params sorted.
 */
export function normalizeUrl(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (!host) return null;
  const port =
    parsed.port && parsed.port !== '80' && parsed.port !== '443'
      ? `:${parsed.port}`
      : '';

  let pathname = parsed.pathname || '/';
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, '');
  if (pathname === '/') pathname = '';

  const params = [];
  for (const [key, value] of parsed.searchParams) {
    if (!TRACKING_PARAMS.has(key.toLowerCase())) params.push([key, value]);
  }
  params.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const query = params.length
    ? `?${params
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')}`
    : '';

  return `https://${host}${port}${pathname}${query}`;
}

/** Extract the lowercased, `www.`-stripped hostname, or '' when invalid. */
export function extractHostname(raw) {
  if (typeof raw !== 'string') return '';
  try {
    return new URL(raw.trim()).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function matchesSuffix(host, suffix) {
  return host === suffix.slice(1) || host.endsWith(suffix);
}

/**
 * Classify a URL into an evidence tier. `hostname` and `pathname` are derived
 * from the URL when not supplied.
 */
export function classifyUrl(raw) {
  const host = extractHostname(raw);
  if (!host) return 'reference';

  let pathname = '';
  try {
    pathname = new URL(raw.trim()).pathname;
  } catch {
    pathname = '';
  }

  if (
    OFFICIAL_DOMAINS.has(host) ||
    OFFICIAL_SUFFIXES.some((suffix) => matchesSuffix(host, suffix))
  ) {
    return 'official';
  }
  if (WIRE_DOMAINS.has(host)) return 'press_release';
  if (MEDIA_DOMAINS.has(host)) return 'media';
  if (
    /\/(news|press|media|newsroom|press-releases?|stories)\b/i.test(pathname)
  ) {
    return 'press_release';
  }
  return 'reference';
}

/** Resolve a display publisher name for a URL (or '' when invalid). */
export function derivePublisher(raw) {
  const host = extractHostname(raw);
  if (!host) return '';
  if (PUBLISHER_NAMES[host]) return PUBLISHER_NAMES[host];
  return host;
}

/**
 * Build a normalized, deduplicated, tier-ordered news record list for one
 * facility/language. Input may be raw URLs or `{ url, title, publishedDate }`
 * objects. Output rows are ordered by tier rank, preserving input order
 * within a tier, and carry a 0-based `orderIndex`.
 */
export function buildFacilityNewsRecords(
  items,
  { limit = Number.POSITIVE_INFINITY } = {}
) {
  const seen = new Set();
  const collected = [];
  let inputIndex = 0;
  for (const item of items) {
    const rawUrl = typeof item === 'string' ? item : item?.url;
    const normalized = normalizeUrl(rawUrl);
    if (!normalized || seen.has(normalized)) {
      inputIndex += 1;
      continue;
    }
    seen.add(normalized);
    collected.push({
      url: typeof rawUrl === 'string' ? rawUrl.trim() : normalized,
      urlNormalized: normalized,
      title: typeof item === 'object' && item ? (item.title ?? null) : null,
      publisher: derivePublisher(rawUrl),
      publishedDate:
        typeof item === 'object' && item ? (item.publishedDate ?? null) : null,
      tier: classifyUrl(rawUrl),
      itemLang:
        typeof item === 'object' && item ? (item.itemLang ?? null) : null,
      inputIndex,
    });
    inputIndex += 1;
  }

  collected.sort((a, b) => {
    const rank = TIER_RANK[a.tier] - TIER_RANK[b.tier];
    return rank !== 0 ? rank : a.inputIndex - b.inputIndex;
  });

  return collected.slice(0, limit).map((row, orderIndex) => ({
    url: row.url,
    urlNormalized: row.urlNormalized,
    title: row.title,
    publisher: row.publisher,
    publishedDate: row.publishedDate,
    tier: row.tier,
    itemLang: row.itemLang,
    orderIndex,
  }));
}

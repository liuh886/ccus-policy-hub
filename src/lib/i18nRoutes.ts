/**
 * Single source of truth for locale routing decisions shared by
 * LanguagePicker.astro and SEO.astro (hreflang alternates).
 *
 * Routes under /en/ are a subset of the zh routes. Any path whose first
 * segment is not listed here (or /policy/country/*) has no English
 * counterpart; language switchers must fall back to the English homepage
 * and SEO must not emit a mismatched alternate.
 */

export const EN_ROUTE_SEGMENTS = new Set([
  'about',
  'compare',
  'docs',
  'facilities',
  'policy',
  'quality',
  'search',
]) as ReadonlySet<string>;

/** Remove the configured site base (e.g. '/ccus-policy-hub') from a pathname. */
export function stripSiteBase(pathname: string, siteBase: string): string {
  return (
    (pathname.startsWith(siteBase)
      ? pathname.slice(siteBase.length)
      : pathname) || '/'
  );
}

/** True when the given base-stripped zh path has a real /en/ counterpart. */
export function hasEnCounterpart(pathWithoutBase: string): boolean {
  if (pathWithoutBase === '/') return true;
  const segments = pathWithoutBase.replace(/^\/+/, '').split('/');
  return (
    segments.length > 0 &&
    EN_ROUTE_SEGMENTS.has(segments[0]) &&
    !(segments[0] === 'policy' && segments[1] === 'country')
  );
}

/** Ensure a base-relative path ends with a trailing slash. */
export function withTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

/**
 * zh/en URL pairs for hreflang alternates, both site-base aware. When no
 * English counterpart exists, the English alternate falls back to the
 * English homepage.
 */
export function localeAlternateURLs(
  siteBase: string,
  pageURLHref: string
): { zhURL: URL; enURL: URL } {
  const pathWithoutBase = stripSiteBase(
    new URL(pageURLHref).pathname,
    siteBase
  );
  const isEn = pathWithoutBase.startsWith('/en');
  const zhPath = withTrailingSlash(
    `${siteBase}${
      isEn ? pathWithoutBase.replace('/en', '') || '/' : pathWithoutBase
    }`
  );
  const enPath = isEn
    ? withTrailingSlash(`${siteBase}${pathWithoutBase}`)
    : hasEnCounterpart(pathWithoutBase)
      ? withTrailingSlash(
          `${siteBase}/en${pathWithoutBase === '/' ? '/' : pathWithoutBase}`
        )
      : `${siteBase}/en/`;
  return {
    zhURL: new URL(zhPath, pageURLHref),
    enURL: new URL(enPath, pageURLHref),
  };
}

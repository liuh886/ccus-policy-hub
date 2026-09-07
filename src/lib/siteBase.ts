/**
 * Site base path (e.g. '/ccus-policy-hub'), read from Astro config so that
 * changing `base` in astro.config.mjs is a one-line change. Trailing slash
 * stripped for straightforward path concatenation.
 */
export const SITE_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

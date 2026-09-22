# Observability

Two analytics layers run in production. They have distinct jobs and are kept
deliberately; this note records the division of labour so neither is mistaken
for redundant spend.

## Cloudflare Web Analytics (RUM)

- **Purpose:** aggregate traffic and real-user performance (page views, Core
  Web Vitals) at the edge. Cookieless and privacy-first: no cross-site
  identifiers, no client-side event API.
- **Wiring:** injected at build time by `scripts/inject-cloudflare-analytics.mjs`
  into every `dist/**/*.html` `<head>`, gated on
  `PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN`. When the token is unset (local dev,
  fork builds) injection is skipped and the build logs
  `Cloudflare Web Analytics disabled`.
- **CI guard:** `ci.yml` / `deploy.yml` assert the beacon is present and
  carries the token when the `CLOUDFLARE_WEB_ANALYTICS_TOKEN` repository
  variable is configured.

## Google Analytics 4 (GA4)

- **Purpose:** interaction and navigation analytics (route changes, engagement
  events) that Cloudflare RUM does not model.
- **Wiring:** `src/scripts/ga4.ts`, measurement ID `G-4WP54VZF14`, loaded once.
  It is SPA-aware: it binds to `astro:page-load` with `send_page_view: false`
  so client-side navigations are counted exactly once (no double counting under
  the View Transitions router).

## Decision

Keep both. RUM owns performance and privacy-safe aggregate reach; GA4 owns
event-level behaviour. If GA4 is ever dropped, the RUM layer alone will not
replace route-level event tracking, and vice versa.

## Font loading

`src/layouts/Layout.astro` loads Inter as a **variable** font
(`family=Inter:wght@100..900`). The homepage typography in `src/styles/home.css`
uses fine-grained weights (e.g. 410, 620, 750). With the previous static
weights (`400;500;600;700;800;900`) the browser snapped those to the nearest
loaded weight, so the fine declarations were effectively dead. The variable
axis makes them render as written.

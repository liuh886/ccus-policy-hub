const MEASUREMENT_ID = 'G-4WP54VZF14';
const GOOGLE_TAG_SRC = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    __ccusGa4Initialized?: boolean;
    __ccusGa4PageViewBound?: boolean;
  }
}

function initializeGoogleTag(): void {
  if (window.__ccusGa4Initialized) return;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    ((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });

  if (!document.querySelector(`script[src="${GOOGLE_TAG_SRC}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = GOOGLE_TAG_SRC;
    document.head.appendChild(script);
  }

  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false });
  window.__ccusGa4Initialized = true;
}

function trackPageView(): void {
  window.gtag?.('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_path: window.location.pathname + window.location.search,
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initializeGoogleTag();
  if (!window.__ccusGa4PageViewBound) {
    document.addEventListener('astro:page-load', trackPageView);
    window.__ccusGa4PageViewBound = true;
  }
}

const GLOBAL_JSON_CACHE_KEY = '__ccusJsonFetchCache';

function getGlobalFetchCache(): Map<string, Promise<unknown>> {
  const globalObj = globalThis as Record<string, unknown>;
  if (!(globalObj[GLOBAL_JSON_CACHE_KEY] instanceof Map)) {
    globalObj[GLOBAL_JSON_CACHE_KEY] = new Map<string, Promise<unknown>>();
  }
  return globalObj[GLOBAL_JSON_CACHE_KEY] as Map<string, Promise<unknown>>;
}

/**
 * Fetches a static JSON asset once per URL per browser session, deduplicating
 * in-flight requests and evicting failed promises so retries stay possible.
 */
export function fetchCachedJson<T>(url: string): Promise<T> {
  if (!url) {
    return Promise.reject(new Error('Missing JSON asset URL.'));
  }

  const cache = getGlobalFetchCache();
  const existing = cache.get(url);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching ${url}`);
      }
      return response.json() as Promise<T>;
    })
    .catch((error) => {
      cache.delete(url);
      throw error;
    });

  cache.set(url, promise);
  return promise;
}

import type { UrlStatePort } from "../ports/url-state.ts";

/**
 * Decorator that intercepts `set` operations to ensure the resulting
 * URL does not exceed a specified character limit.
 * If the limit is exceeded, it notifies via callback and strips the query parameters
 * to avoid leaving stale shareable state.
 */
export function composeSizeLimitedUrlState(
  base: UrlStatePort,
  maxLength: number,
  onShareabilityChange: (isShareable: boolean) => void
): UrlStatePort {
  return {
    get: base.get,
    remove: base.remove,
    set(key: string, value: string): void {
      const url = new URL(window.location.href);
      url.searchParams.set(key, value);

      if (url.toString().length > maxLength) {
        console.warn(
          `URL length limit exceeded (>${maxLength} chars). Project state might not be completely shareable.`
        );
        onShareabilityChange(false);
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }

      onShareabilityChange(true);
      base.set(key, value);
    },
  };
}

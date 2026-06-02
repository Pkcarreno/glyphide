import type { UrlStatePort } from "../ports/url-state.ts";

/**
 * Browser URL-backed implementation of `UrlStatePort`.
 * Reads and writes query parameters using the History API
 * without triggering full-page navigation.
 */
export function createBrowserUrlStateAdapter(): UrlStatePort {
  return {
    get(key) {
      const params = new URLSearchParams(window.location.search);
      return params.get(key);
    },
    set(key, value) {
      const url = new URL(window.location.href);
      url.searchParams.set(key, value);
      window.history.replaceState(null, "", url.toString());
    },
    remove(key) {
      const url = new URL(window.location.href);
      url.searchParams.delete(key);
      window.history.replaceState(null, "", url.toString());
    },
  };
}

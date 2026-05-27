import type { PersistencePort } from "../ports/persistence";

const STORAGE_PREFIX = "glyphide:";

/**
 * LocalStorage-backed implementation of `PersistencePort`.
 * All keys are automatically namespaced with `glyphide:` prefix.
 */
export function createLocalStorageAdapter(): PersistencePort {
  function prefixed(key: string): string {
    return `${STORAGE_PREFIX}${key}`;
  }

  return {
    get(key) {
      try {
        return localStorage.getItem(prefixed(key));
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(prefixed(key), value);
      } catch {
        // Storage quota exceeded or unavailable — fail silently.
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(prefixed(key));
      } catch {
        // Unavailable — fail silently.
      }
    },
  };
}

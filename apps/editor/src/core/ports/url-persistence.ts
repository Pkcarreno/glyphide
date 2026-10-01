import type { CanonicalState } from "@glyphide/url-migration/types";

/**
 * Result returned by {@link UrlPersistencePort.save}.
 * @public
 */
export interface UrlPersistenceResult {
  /** Whether the project state fits within browser URL length limits. */
  isShareable: boolean;
}

/**
 * Deep seam for atomic URL persistence.
 * Replaces granular per-key mutations with whole-project canonical snapshots,
 * encapsulating compression, character limits, and browser history synchronization.
 * @public
 */
export interface UrlPersistencePort {
  /** Clears all query parameters from the browser address bar. */
  clear: () => void;
  /** Loads and deserializes the canonical project state from the URL, or null if absent. */
  load: () => CanonicalState | null;
  /** Persists canonical state to the URL, returning shareability status. */
  save: (state: CanonicalState) => UrlPersistenceResult;
}

/**
 * Contract for reading and writing URL state (query parameters).
 * Models depend on this interface for shareable project metadata.
 */
export interface UrlStatePort {
  /** Retrieves a query parameter value. Returns `null` if absent. */
  get: (key: string) => string | null;
  /** Removes a query parameter. */
  remove: (key: string) => void;
  /** Sets a query parameter without triggering navigation. */
  set: (key: string, value: string) => void;
}

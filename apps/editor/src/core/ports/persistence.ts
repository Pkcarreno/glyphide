/**
 * Contract for key-value persistence.
 * Implementations may use localStorage, IndexedDB, or in-memory stores.
 * Business logic depends only on this interface, never on browser APIs.
 */
export interface PersistencePort {
  /** Retrieves a stored value by key. Returns `null` if absent. */
  get(key: string): string | null;
  /** Removes a stored entry by key. */
  remove(key: string): void;
  /** Persists a value under the given key. */
  set(key: string, value: string): void;
}

/**
 * Manages the lifecycle of pending promises linked to RPC request IDs.
 * Prevents memory leaks by cleaning entries after resolution.
 */

import type { JsonRpcId } from "@glyphide/rpc-protocol/types";

interface PendingEntry<T> {
  reject: (reason?: unknown) => void;
  resolve: (value: T) => void;
}

export class PromiseRegistry {
  readonly #pending = new Map<JsonRpcId, PendingEntry<unknown>>();

  /**
   * Registers a new promise for a given request ID.
   * @returns A tuple of [promise, resolve, reject] functions.
   */
  register<T>(
    id: JsonRpcId
  ): [Promise<T>, (value: T) => void, (reason?: unknown) => void] {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const entry: PendingEntry<T> = { resolve, reject };
    this.#pending.set(id, entry as PendingEntry<unknown>);

    return [
      promise,
      (value: T) => {
        this.#pending.delete(id);
        entry.resolve(value);
      },
      (reason?: unknown) => {
        this.#pending.delete(id);
        entry.reject(reason);
      },
    ];
  }

  /**
   * Resolves a promise by ID.
   */
  resolve(id: JsonRpcId, value: unknown): void {
    const entry = this.#pending.get(id);
    if (entry) {
      this.#pending.delete(id);
      entry.resolve(value);
    }
  }

  /**
   * Rejects a promise by ID.
   */
  reject(id: JsonRpcId, reason?: unknown): void {
    const entry = this.#pending.get(id);
    if (entry) {
      this.#pending.delete(id);
      entry.reject(reason);
    }
  }

  /**
   * Clears all pending promises (used on worker termination).
   */
  clear(): void {
    for (const entry of this.#pending.values()) {
      entry.reject(new Error("Worker terminated"));
    }
    this.#pending.clear();
  }

  /** Number of pending promises. */
  get size(): number {
    return this.#pending.size;
  }
}

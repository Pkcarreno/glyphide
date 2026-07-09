import type { Accessor } from "solid-js";
import { batch, createSignal } from "solid-js";

/**
 * A single output entry emitted by the execution engine.
 * The `data` field is engine-defined; views decide how to render it.
 */
export interface OutputEntry {
  /** Engine-defined payload. */
  data: unknown;
  /** Auto-incrementing identifier for keyed rendering. */
  id: number;
  /** Millisecond timestamp of when the entry was received. */
  timestamp: number;
  /** Output category (e.g. "log", "warn", "error", "system"). */
  type: string;
}

/**
 * Pure model for the execution output log.
 * Accumulates `OutputEntry` items that the console view subscribes to.
 */
export interface OutputModel {
  /** Appends a new entry to the log. */
  appendEntry(type: string, data: unknown): void;
  /** Removes all entries from the log. */
  clearEntries(): void;
  /** Reactive accessor for the full list of output entries. */
  entries: Accessor<readonly OutputEntry[]>;
}

/** Creates a new `OutputModel`. */
export function createOutputModel(): OutputModel {
  const [entries, setEntries] = createSignal<readonly OutputEntry[]>([]);
  let nextId = 0;

  let pendingEntries: OutputEntry[] = [];
  let rafId: number | null = null;

  function flush() {
    if (pendingEntries.length > 0) {
      batch(() => {
        const toAdd = pendingEntries;
        pendingEntries = [];
        setEntries((previous) => [...previous, ...toAdd]);
      });
    }
    rafId = null;
  }

  function appendEntry(type: string, data: unknown): void {
    pendingEntries.push({
      id: nextId++,
      type,
      data,
      timestamp: Date.now(),
    });

    if (rafId === null) {
      rafId = requestAnimationFrame(flush);
    }
  }

  function clearEntries(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    pendingEntries = [];
    setEntries([]);
    nextId = 0;
  }

  return { entries, appendEntry, clearEntries };
}

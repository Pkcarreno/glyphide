import { createSignal } from "solid-js";
import type { Accessor } from "solid-js";

/**
 * A single output entry emitted by the execution engine.
 * The `data` field is engine-defined; views decide how to render it.
 */
export interface OutputEntry {
  /** Auto-incrementing identifier for keyed rendering. */
  id: number;
  /** Output category (e.g. "log", "warn", "error", "system"). */
  type: string;
  /** Engine-defined payload. */
  data: unknown;
  /** Millisecond timestamp of when the entry was received. */
  timestamp: number;
}

/**
 * Pure model for the execution output log.
 * Accumulates `OutputEntry` items that the console view subscribes to.
 */
export interface OutputModel {
  /** Reactive accessor for the full list of output entries. */
  entries: Accessor<readonly OutputEntry[]>;
  /** Appends a new entry to the log. */
  appendEntry(type: string, data: unknown): void;
  /** Removes all entries from the log. */
  clearEntries(): void;
}

/** Creates a new `OutputModel`. */
export function createOutputModel(): OutputModel {
  const [entries, setEntries] = createSignal<readonly OutputEntry[]>([]);
  let nextId = 0;

  function appendEntry(type: string, data: unknown): void {
    const entry: OutputEntry = {
      id: nextId++,
      type,
      data,
      timestamp: Date.now(),
    };
    setEntries((previous) => [...previous, entry]);
  }

  function clearEntries(): void {
    setEntries([]);
    nextId = 0;
  }

  return { entries, appendEntry, clearEntries };
}

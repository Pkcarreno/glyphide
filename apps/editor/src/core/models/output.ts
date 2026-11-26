import type { Accessor } from "solid-js";
import { createSignal } from "solid-js";

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
 * Metrics tracking omitted log entries.
 *
 * @public
 */
export interface OutputStats {
  /** Log entries dropped because the output buffer reached its capacity limit. */
  bufferDropped: number;
  /** Total log entries omitted across worker rate limiting and buffer capacity. */
  totalDropped: number;
  /** Log entries dropped by the worker rate limiter before crossing IPC. */
  workerDropped: number;
}

/**
 * Pure model for the execution output log.
 * Accumulates `OutputEntry` items that the console view subscribes to.
 */
export interface OutputModel {
  /** Appends a new entry to the log. */
  appendEntry: (type: string, data: unknown) => void;
  /** Removes all entries from the log and resets metrics. */
  clearEntries: () => void;
  /** Cancels any pending animation frame and clears queued entries. */
  dispose: () => void;
  /** Reactive accessor for the full list of output entries. */
  entries: Accessor<readonly OutputEntry[]>;
  /** Records dropped log entries reported by the worker rate limiter. */
  reportWorkerDropped: (count: number) => void;
  /** Reactive accessor for omitted log entry metrics. */
  stats: Accessor<OutputStats>;
}

/**
 * Maximum log entries retained in the console output buffer.
 *
 * @public
 */
export const DEFAULT_MAX_OUTPUT_ENTRIES = 5000;

const OMITTED_WORKER_LOG_SUFFIX = "messages omitted due to high frequency.";

const INITIAL_OUTPUT_STATS: OutputStats = {
  bufferDropped: 0,
  totalDropped: 0,
  workerDropped: 0,
};

/** Creates a new `OutputModel`. */
export function createOutputModel(
  maxEntries = DEFAULT_MAX_OUTPUT_ENTRIES
): OutputModel {
  const [entries, setEntries] = createSignal<readonly OutputEntry[]>([]);
  const [stats, setStats] = createSignal<OutputStats>(INITIAL_OUTPUT_STATS);
  let nextId = 0;

  let committedEntries: readonly OutputEntry[] = [];
  let pendingEntries: OutputEntry[] = [];
  let rafId: number | null = null;

  function cancelPendingFlush(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    pendingEntries = [];
  }

  function recordBufferDropped(count: number): void {
    if (count > 0) {
      setStats((prev) => ({
        ...prev,
        bufferDropped: prev.bufferDropped + count,
        totalDropped: prev.totalDropped + count,
      }));
    }
  }

  function flush(): void {
    rafId = null;
    if (pendingEntries.length === 0) {
      return;
    }

    const toAdd = pendingEntries;
    pendingEntries = [];

    const combined = [...committedEntries, ...toAdd];
    const excessCount = Math.max(0, combined.length - maxEntries);
    const nextEntries =
      excessCount > 0 ? combined.slice(excessCount) : combined;

    committedEntries = nextEntries;
    setEntries(nextEntries);
    recordBufferDropped(excessCount);
  }

  function reportWorkerDropped(count: number): void {
    if (count > 0 && Number.isFinite(count)) {
      setStats((prev) => ({
        ...prev,
        totalDropped: prev.totalDropped + count,
        workerDropped: prev.workerDropped + count,
      }));
    }
  }

  function appendEntry(type: string, data: unknown): void {
    if (
      type === "system" &&
      typeof data === "string" &&
      data.endsWith(OMITTED_WORKER_LOG_SUFFIX)
    ) {
      const suppressedCount = Number.parseInt(data, 10);
      if (!Number.isNaN(suppressedCount) && suppressedCount > 0) {
        reportWorkerDropped(suppressedCount);
        return;
      }
    }

    const currentId = nextId;
    nextId += 1;
    pendingEntries.push({
      data,
      id: currentId,
      timestamp: Date.now(),
      type,
    });

    if (pendingEntries.length >= maxEntries * 2) {
      const dropCount = pendingEntries.length - maxEntries;
      pendingEntries = pendingEntries.slice(dropCount);
      recordBufferDropped(dropCount);
    }

    if (rafId === null) {
      rafId = requestAnimationFrame(flush);
    }
  }

  function clearEntries(): void {
    cancelPendingFlush();
    committedEntries = [];
    setEntries([]);
    nextId = 0;
    setStats(INITIAL_OUTPUT_STATS);
  }

  function dispose(): void {
    cancelPendingFlush();
  }

  return {
    appendEntry,
    clearEntries,
    dispose,
    entries,
    reportWorkerDropped,
    stats,
  };
}

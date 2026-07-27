import type { ConsoleToken } from "@glyphide/quickjs-engine/types";
import type { OutputEntry } from "../models/output.ts";

/** Visual style variants for the ConsolePane. */
export type ConsoleVariant =
  | "error"
  | "log"
  | "system"
  | "warn"
  | "debug"
  | "info"
  | "table"
  | "group"
  | "groupCollapsed"
  | "groupEnd";

/**
 * The normalized output of a formatter.
 * Either `text` (string engines) or `tokens` (QuickJS structured output)
 * will be set — never both.
 */
export interface RenderedOutput {
  /** Plain text for string-based engines. */
  text?: string;
  /** Structured token tree from QuickJS. When set, `text` is ignored. */
  tokens?: ConsoleToken[];
  /** Visual style to apply in the ConsolePane. */
  variant: ConsoleVariant;
}

/**
 * Contract for engine-specific output formatters.
 * Each engine that provides a formatter is responsible for asserting
 * the concrete payload type it expects from `entry.data` (which is
 * typed as `unknown` due to type erasure at the RPC boundary).
 *
 * Formatters MUST NOT throw — they MUST fall back gracefully
 * when `entry.data` does not match the expected shape.
 */
export interface OutputFormatter {
  format: (entry: OutputEntry) => RenderedOutput;
}

/**
 * Runtime type guard for `ConsoleToken[]`.
 * Checks structural shape without importing the full discriminated union.
 * An empty array is considered a valid (empty) token list.
 */
export function isConsoleTokenArray(value: unknown): value is ConsoleToken[] {
  if (!Array.isArray(value)) {
    return false;
  }
  if (value.length === 0) {
    return true;
  }
  const [first] = value;
  return (
    typeof first === "object" &&
    first !== null &&
    typeof (first as Record<string, unknown>).type === "string"
  );
}

/** Maps an engine output type string to the nearest visual variant. */
export function typeToVariant(type: string): ConsoleVariant {
  switch (type) {
    case "log":
    case "print":
    case "stdout":
    case "timeLog":
    case "timeEnd":
    case "trace":
      return "log";
    case "info":
    case "count":
      return "info";
    case "debug":
      return "debug";
    case "table":
      return "table";
    case "warn":
      return "warn";
    case "error":
    case "stderr":
    case "assert":
      return "error";
    case "system":
      return "system";
    case "group":
      return "group";
    case "groupCollapsed":
      return "groupCollapsed";
    case "groupEnd":
      return "groupEnd";
    default:
      return "log";
  }
}

/**
 * Default formatter used when an engine does not provide a custom one.
 * Maps the output type to the nearest visual variant and coerces
 * `data` to a plain string via `String()`.
 */
export function defaultFormat(entry: OutputEntry): RenderedOutput {
  return {
    text: String(entry.data ?? ""),
    variant: typeToVariant(entry.type),
  };
}

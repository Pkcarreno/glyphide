export interface QuickJSEngineConfig {
  /** Maximum memory allowed for the QuickJS runtime in bytes */
  memoryLimit?: number;
}

/** AST token representing a single JS value serialized for transport. */
export type ConsoleToken =
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "boolean"; value: boolean }
  | { type: "null" }
  | { type: "undefined" }
  | { type: "function"; name: string }
  | { type: "symbol"; description: string }
  | { type: "circular" }
  | { type: "array"; elements: ConsoleToken[]; length: number }
  | { type: "object"; properties: Record<string, ConsoleToken> };

/** Discriminated output payload for QuickJS engine. */
export type QuickJSOutputPayload =
  | { data: ConsoleToken[]; type: "error" | "info" | "log" | "warn" }
  | { data: string; type: "system" };

export const defaultCapabilities = {
  stateful: true,
  interruptible: true,
  outputTypes: ["log", "warn", "error", "info"] as const,
};

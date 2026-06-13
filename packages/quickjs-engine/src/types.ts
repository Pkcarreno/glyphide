import type { EngineCapabilities } from "@glyphide/rpc-protocol/types";

export interface QuickJSEngineConfig {
  /** Maximum memory allowed for the QuickJS runtime in bytes */
  memoryLimit?: number;
}

/** AST token representing a single JS value serialized for transport. */
export type ConsoleToken =
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "bigint"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "null" }
  | { type: "undefined" }
  | { type: "function"; name: string; source?: string }
  | { type: "symbol"; description: string }
  | { type: "circular" }
  | { type: "date"; value: string }
  | { type: "regexp"; source: string; flags: string }
  | { type: "map"; entries: [ConsoleToken, ConsoleToken][]; size: number }
  | { type: "set"; elements: ConsoleToken[]; size: number }
  | { type: "error"; name: string; message: string; stack?: string }
  | { type: "promise" }
  | { type: "array"; elements: ConsoleToken[]; length: number }
  | { type: "object"; properties: Record<string, ConsoleToken> };

/** Discriminated output payload for QuickJS engine. */
export type QuickJSOutputPayload =
  | { data: ConsoleToken[]; type: "error" | "info" | "log" | "warn" }
  | { data: string; type: "system" };

export const defaultCapabilities = {
  id: "quickjs",
  supportedLanguages: ["javascript"] as const,
  isStateful: true,
  isInterruptible: true,
  outputTypes: ["log", "warn", "error", "info"] as const,
} satisfies EngineCapabilities;

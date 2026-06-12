import type { EngineCapabilities } from "@glyphide/rpc-protocol/types";

export interface MicropythonEngineConfig {
  /**
   * The maximum amount of memory the engine can use.
   */
  memoryLimit?: number;
}

/** Discriminated output payload for Micropython engine. */
export type MicropythonOutputPayload =
  | { data: string; type: "error" | "log" }
  | { data: string; type: "system" };

export const defaultCapabilities = {
  id: "micropython",
  supportedLanguages: ["python"] as const,
  isStateful: true,
  isInterruptible: false,
  outputTypes: ["log", "error", "system"] as const,
} satisfies EngineCapabilities;

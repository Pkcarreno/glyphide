import type { EngineCapabilities } from "@glyphide/rpc-protocol/types";

export interface MicropythonEngineConfig {
  /**
   * The maximum amount of memory the engine can use.
   */
  memoryLimit?: number;
  /** Maximum execution time allowed for the Micropython runtime in milliseconds */
  timeout?: number;
}

/** Discriminated output payload for Micropython engine. */
export type MicropythonOutputPayload =
  | { data: string; type: "stderr" | "stdout" }
  | { data: string; type: "system" };

export const defaultCapabilities = {
  id: "micropython",
  supportedLanguages: ["python"] as const,
  isStateful: true,
  isInterruptible: false,
  outputTypes: ["stderr", "stdout", "system"] as const,
} satisfies EngineCapabilities;

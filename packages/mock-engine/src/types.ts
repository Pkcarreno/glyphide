import type { EngineCapabilities } from "@glyphide/rpc-protocol/types";

/** Discriminated output payload for the mock engine. */
export type MockOutputPayload =
  | { data: string; type: "log" | "print" | "warn" }
  | { data: string; type: "system" };

export interface MockEngineConfig {
  /** Capabilities exposed by the engine. Default: defaultCapabilities */
  capabilities?: Partial<EngineCapabilities>;
  /** Simulated init delay in ms. Default: 0 */
  initDelay?: number;
  /**
   * Simulated input prompts. When set, the mock engine emits
   * ENGINE.INPUT_REQUEST for each prompt during RUN, waits for the
   * reply, and includes the collected values in the output.
   */
  inputPrompts?: string[];
  /** Simulated run delay in ms. Default: 0 */
  runDelay?: number;
  /** Simulated execution error. Null = success. Default: null */
  runError?: string | null;
}

export const defaultCapabilities = {
  id: "mock",
  supportedLanguages: ["plaintext"],
  isStateful: true,
  isInterruptible: true,
  outputTypes: ["print", "log", "warn"] as const,
  supportsInput: false,
} satisfies EngineCapabilities;

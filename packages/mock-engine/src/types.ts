/**
 * Mock engine configuration types.
 */

export interface MockCapabilities {
  interruptible: boolean;
  outputTypes: readonly string[];
  stateful: boolean;
}

/** Discriminated output payload for the mock engine. */
export type MockOutputPayload =
  | { data: string; type: "log" | "print" | "warn" }
  | { data: string; type: "system" };

export interface MockEngineConfig {
  /** Capabilities exposed by the engine. Default: defaultCapabilities */
  capabilities?: MockCapabilities;
  /** Simulated init delay in ms. Default: 0 */
  initDelay?: number;
  /** Simulated run delay in ms. Default: 0 */
  runDelay?: number;
  /** Simulated execution error. Null = success. Default: null */
  runError?: string | null;
}

export const defaultCapabilities: MockCapabilities = {
  stateful: true,
  interruptible: true,
  outputTypes: ["print", "log", "warn"] as const,
};

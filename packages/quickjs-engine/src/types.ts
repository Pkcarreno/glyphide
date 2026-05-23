export interface QuickJSEngineConfig {
  /** Maximum memory allowed for the QuickJS runtime in bytes */
  memoryLimit?: number;
}

/** Discriminated output payload for QuickJS engine. */
export type QuickJSOutputPayload =
  | { data: string; type: "error" | "info" | "log" | "warn" }
  | { data: string; type: "system" };

export const defaultCapabilities = {
  stateful: true,
  interruptible: true,
  outputTypes: ["log", "warn", "error", "info"] as const,
};

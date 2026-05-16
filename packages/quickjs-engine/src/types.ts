export interface QuickJSEngineConfig {
  /** Maximum memory allowed for the QuickJS runtime in bytes */
  memoryLimit?: number;
}

export const defaultCapabilities = {
  stateful: true,
  interruptible: true,
  outputTypes: ["print", "log", "warn"],
};

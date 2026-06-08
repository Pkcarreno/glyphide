export interface MicropythonEngineConfig {
  /**
   * The maximum amount of memory the engine can use.
   */
  memoryLimit?: number;
}

export const defaultCapabilities = {
  syncExecution: false,
  asyncExecution: true,
  domAccess: false,
};

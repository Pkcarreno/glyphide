import { MockEngineAdapter } from "@glyphide/mock-engine/adapter";
import type {
  MockEngineConfig,
  MockOutputPayload,
} from "@glyphide/mock-engine/types";
import {
  createDirectTransport,
  type EngineTransportFactory,
} from "@glyphide/orchestrator/transport";

/**
 * Creates an in-process direct transport connected to MockEngineAdapter.
 * Eliminates DOM Worker polyfills and asynchronous setTimeout latency.
 */
export const createMockWorker: EngineTransportFactory<
  MockOutputPayload
> = () => {
  const adapter = new MockEngineAdapter();
  return createDirectTransport(adapter);
};

/**
 * Creates a configuration object to pass to the mock engine during initialization.
 * The mock adapter accepts these parameters via the INIT message to override its internal state.
 */
export function createMockConfig(
  config?: Partial<MockEngineConfig>
): MockEngineConfig {
  return {
    capabilities: config?.capabilities,
    initDelay: config?.initDelay ?? 0,
    inputPrompts: config?.inputPrompts,
    runDelay: config?.runDelay ?? 0,
    runError: config?.runError ?? null,
  };
}

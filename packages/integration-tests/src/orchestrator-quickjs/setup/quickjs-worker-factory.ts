import {
  createDirectTransport,
  type EngineTransportFactory,
} from "@glyphide/orchestrator/transport";
import { QuickJSEngineAdapter } from "@glyphide/quickjs-engine/adapter";
import type { QuickJSOutputPayload } from "@glyphide/quickjs-engine/types";

/**
 * Creates an in-process direct transport connected to QuickJSEngineAdapter.
 * Eliminates DOM Worker polyfills and asynchronous setTimeout latency.
 */
export const createQuickJSWorker: EngineTransportFactory<
  QuickJSOutputPayload
> = () => {
  const adapter = new QuickJSEngineAdapter();
  return createDirectTransport(adapter);
};

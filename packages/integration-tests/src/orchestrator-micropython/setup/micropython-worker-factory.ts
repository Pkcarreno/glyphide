import { MicropythonEngineAdapter } from "@glyphide/micropython-engine/adapter";
import type { MicropythonOutputPayload } from "@glyphide/micropython-engine/types";
import {
  createDirectTransport,
  type EngineTransportFactory,
} from "@glyphide/orchestrator/transport";

/**
 * Creates an in-process direct transport connected to MicropythonEngineAdapter.
 * Eliminates DOM Worker polyfills and asynchronous setTimeout latency.
 */
export const createMicropythonWorker: EngineTransportFactory<
  MicropythonOutputPayload
> = () => {
  const adapter = new MicropythonEngineAdapter();
  return createDirectTransport(adapter);
};

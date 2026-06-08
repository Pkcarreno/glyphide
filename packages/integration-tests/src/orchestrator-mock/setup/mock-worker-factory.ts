import { MockEngineAdapter } from "@glyphide/mock-engine/adapter";
import type {
  MockEngineConfig,
  MockOutputPayload,
} from "@glyphide/mock-engine/types";
import type { EngineWorkerFactory } from "@glyphide/orchestrator";
import type { JsonRpcMessage } from "@glyphide/rpc-protocol/types";

/**
 * Creates a mock engine worker instance by polyfilling the Web Worker interface.
 * This allows integration tests to run in Node.js without actual Web Workers.
 */
export const createMockWorker: EngineWorkerFactory<MockOutputPayload> = () => {
  const adapter = new MockEngineAdapter();

  const worker = {
    onmessage: null as ((ev: MessageEvent) => void) | null,
    onerror: null as ((ev: ErrorEvent) => void) | null,

    postMessage(message: unknown) {
      setTimeout(() => {
        try {
          adapter.handleMessage(message as JsonRpcMessage);
        } catch (e) {
          if (worker.onerror) {
            worker.onerror({ error: e } as ErrorEvent);
          }
        }
      }, 0);
    },

    terminate() {
      adapter.dispose();
    },

    addEventListener() {
      /* noop */
    },
    removeEventListener() {
      /* noop */
    },
    dispatchEvent() {
      return true;
    },
  };

  adapter.setup(
    (response) => {
      setTimeout(() => {
        if (worker.onmessage) {
          worker.onmessage({ data: response } as MessageEvent);
        }
      }, 0);
    },
    (method, params) => {
      setTimeout(() => {
        if (worker.onmessage) {
          worker.onmessage({
            data: { jsonrpc: "2.0", method, params },
          } as MessageEvent);
        }
      }, 0);
    },
    (method, id, params) => {
      setTimeout(() => {
        if (worker.onmessage) {
          worker.onmessage({
            data: { jsonrpc: "2.0", method, id, params },
          } as MessageEvent);
        }
      }, 0);
    }
  );

  return worker as unknown as Worker;
};

/**
 * Creates a configuration object to pass to the mock engine during initialization.
 * The mock adapter accepts these parameters via the INIT message to override its internal state.
 */
export function createMockConfig(
  config?: Partial<MockEngineConfig>
): MockEngineConfig {
  return {
    initDelay: config?.initDelay ?? 0,
    inputPrompts: config?.inputPrompts,
    runDelay: config?.runDelay ?? 0,
    runError: config?.runError ?? null,
    capabilities: config?.capabilities,
  };
}

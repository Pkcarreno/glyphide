import { QuickJSEngineAdapter } from "@glyphide/quickjs-engine/adapter";
import type { JsonRpcMessage } from "@glyphide/rpc-protocol/types";

export function createQuickJSWorker(): Worker {
  const adapter = new QuickJSEngineAdapter();

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
    }
  );

  return worker as unknown as Worker;
}

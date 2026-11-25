/**
 * In-process direct transport implementation for RPC messaging.
 */

import type {
  JsonRpcFailResponse,
  JsonRpcId,
  JsonRpcMessage,
  JsonRpcOkResponse,
} from "@glyphide/rpc-protocol/types";
import type { RpcTransport, RpcTransportMessageHandler } from "./transport.ts";

/**
 * Adapter interface required to construct an in-process direct transport.
 *
 * @public
 */
export interface DirectTransportAdapter {
  dispose?: () => void;
  handleMessage: (message: JsonRpcMessage) => void;
  setup: (
    sendResponse: (response: JsonRpcOkResponse | JsonRpcFailResponse) => void,
    onNotification: (method: string, params?: unknown) => void,
    sendRequest?: (method: string, id: JsonRpcId, params?: unknown) => void
  ) => void;
}

const scheduleTask = (callback: () => void): void => {
  if (
    "setImmediate" in globalThis &&
    typeof (globalThis as { setImmediate?: unknown }).setImmediate ===
      "function"
  ) {
    (
      globalThis as unknown as { setImmediate: (fn: () => void) => void }
    ).setImmediate(callback);
    return;
  }
  setTimeout(callback, 0);
};

/**
 * In-process direct transport connecting directly to an EngineAdapter.
 * Eliminates DOM Worker requirements and artificial timeout delays.
 *
 * @public
 */
export class DirectTransport implements RpcTransport {
  readonly #adapter: DirectTransportAdapter;
  #onMessage: RpcTransportMessageHandler | null = null;
  #isDisposed: boolean;

  constructor(adapter: DirectTransportAdapter) {
    this.#adapter = adapter;
    this.#isDisposed = false;
    this.#adapter.setup(
      (response) => {
        scheduleTask(() => {
          if (!this.#isDisposed) {
            this.#onMessage?.({ data: response });
          }
        });
      },
      (method, params) => {
        scheduleTask(() => {
          if (!this.#isDisposed) {
            this.#onMessage?.({
              data: {
                jsonrpc: "2.0",
                method,
                params,
              },
            });
          }
        });
      },
      (method, id, params) => {
        scheduleTask(() => {
          if (!this.#isDisposed) {
            this.#onMessage?.({
              data: {
                id,
                jsonrpc: "2.0",
                method,
                params,
              },
            });
          }
        });
      }
    );
  }

  get onMessage(): RpcTransportMessageHandler | null {
    return this.#onMessage;
  }

  set onMessage(handler: RpcTransportMessageHandler | null) {
    this.#onMessage = handler;
  }

  postMessage(message: unknown): void {
    queueMicrotask(() => {
      if (!this.#isDisposed) {
        this.#adapter.handleMessage(message as JsonRpcMessage);
      }
    });
  }

  terminate(): void {
    this.#isDisposed = true;
    this.#adapter.dispose?.();
    this.#onMessage = null;
  }
}

/**
 * Agnostic transport seam and concrete adapters for RPC messaging.
 * Decouples the orchestrator from browser DOM Worker APIs.
 */

import type {
  EngineOutputPayload,
  JsonRpcFailResponse,
  JsonRpcId,
  JsonRpcMessage,
  JsonRpcOkResponse,
} from "@glyphide/rpc-protocol/types";

/**
 * Event wrapper for incoming transport messages.
 *
 * @public
 */
export interface RpcTransportMessageEvent {
  data: unknown;
}

/**
 * Callback handler invoked when a transport receives a message.
 *
 * @public
 */
export type RpcTransportMessageHandler = (
  event: RpcTransportMessageEvent
) => void;

/**
 * Agnostic bidirectional message transport contract.
 *
 * @public
 */
export interface RpcTransport {
  /**
   * Message handler invoked when a message is received from the peer.
   */
  onMessage: RpcTransportMessageHandler | null;

  /**
   * Dispatches an outgoing message to the peer.
   */
  postMessage: (message: unknown) => void;

  /**
   * Optional cleanup callback to terminate or dispose transport resources.
   */
  terminate?: () => void;
}

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

/**
 * In-process direct transport connecting directly to an EngineAdapter.
 * Eliminates DOM Worker requirements and artificial timeout delays.
 *
 * @public
 */
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

/**
 * Creates an in-process DirectTransport wrapping an EngineAdapter.
 *
 * @public
 */
export function createDirectTransport(
  adapter: DirectTransportAdapter
): DirectTransport {
  return new DirectTransport(adapter);
}

/**
 * Worker transport adapter wrapping a browser DOM Worker instance.
 *
 * @public
 */
export class WorkerTransport implements RpcTransport {
  readonly #worker: Worker;
  #onMessage: RpcTransportMessageHandler | null = null;

  constructor(worker: Worker) {
    this.#worker = worker;
    this.#worker.onmessage = (event: MessageEvent) => {
      this.#onMessage?.({ data: event.data });
    };
  }

  get onMessage(): RpcTransportMessageHandler | null {
    return this.#onMessage;
  }

  set onMessage(handler: RpcTransportMessageHandler | null) {
    this.#onMessage = handler;
  }

  postMessage(message: unknown): void {
    this.#worker.postMessage(message);
  }

  terminate(): void {
    this.#worker.terminate();
    this.#onMessage = null;
  }
}

/**
 * Creates a WorkerTransport wrapping a native browser Worker.
 *
 * @public
 */
export function createWorkerTransport(worker: Worker): WorkerTransport {
  return new WorkerTransport(worker);
}

/**
 * Normalizes either an existing RpcTransport or a DOM Worker into an RpcTransport.
 *
 * @public
 */
export function toRpcTransport(target: RpcTransport | Worker): RpcTransport {
  if ("onMessage" in target) {
    return target as RpcTransport;
  }
  return createWorkerTransport(target as Worker);
}

/**
 * Phantom-typed transport factory.
 * Carries the engine output payload shape without adding runtime overhead.
 *
 * @public
 */
export type EngineTransportFactory<
  TPayload extends EngineOutputPayload = EngineOutputPayload,
> = (() => RpcTransport) & {
  readonly _payloadType?: TPayload;
};

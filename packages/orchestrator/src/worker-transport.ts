/**
 * Browser DOM Worker transport implementation for RPC messaging.
 */

import type { RpcTransport, RpcTransportMessageHandler } from "./transport.ts";

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

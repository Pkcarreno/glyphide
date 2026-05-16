/**
 * Wraps postMessage/onmessage with type-safe JSON-RPC validation.
 */

import { isJsonRpcFail, isJsonRpcOk } from "@glyphide/rpc-protocol/guards";
import type {
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponse,
} from "@glyphide/rpc-protocol/types";

export type MessageHandler = (
  message: JsonRpcResponse | JsonRpcRequest | JsonRpcNotification
) => void;

interface OutgoingRequest {
  method: string;
  params?: unknown;
}

interface OutgoingNotification {
  method: string;
  params?: unknown;
}

export class MessageBus {
  readonly #worker: Worker;
  readonly #onMessage: MessageHandler;

  constructor(worker: Worker, onMessage: MessageHandler) {
    this.#worker = worker;
    this.#onMessage = onMessage;
    this.#worker.onmessage = this.#handleMessage.bind(this);
  }

  /**
   * Sends a JSON-RPC request (expects response with matching ID).
   */
  sendRequest(message: OutgoingRequest, id: number): void {
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      method: message.method,
      params: message.params,
      id,
    };
    this.#worker.postMessage(request);
  }

  /**
   * Sends a notification (fire-and-forget, no ID).
   */
  sendNotification(message: OutgoingNotification): void {
    const notification: JsonRpcNotification = {
      jsonrpc: "2.0",
      method: message.method,
      params: message.params,
    };
    this.#worker.postMessage(notification);
  }

  /**
   * Classifies and routes an incoming message.
   */
  #handleMessage(event: MessageEvent): void {
    const data = event.data;

    // Response (success or fail)
    if (isJsonRpcOk(data) || isJsonRpcFail(data)) {
      this.#onMessage(data as JsonRpcResponse);
      return;
    }

    // Request (has method AND id)
    if (
      typeof data === "object" &&
      data !== null &&
      "method" in data &&
      "id" in data
    ) {
      this.#onMessage(data as JsonRpcRequest);
      return;
    }

    // Notification (has method, no id)
    if (typeof data === "object" && data !== null && "method" in data) {
      this.#onMessage(data as JsonRpcNotification);
    }
  }

  /** Terminates the message bus listener. */
  terminate(): void {
    this.#worker.onmessage = null;
  }
}

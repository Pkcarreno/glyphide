/**
 * Wraps transport postMessage/onMessage with type-safe JSON-RPC validation.
 */

import { RpcErrorCode } from "@glyphide/rpc-protocol/constants";
import {
  isJsonRpcFail,
  isJsonRpcNotification,
  isJsonRpcOk,
  isJsonRpcRequest,
} from "@glyphide/rpc-protocol/guards";
import type {
  JsonRpcId,
  JsonRpcNotification,
  JsonRpcOkResponse,
  JsonRpcRequest,
  JsonRpcResponse,
} from "@glyphide/rpc-protocol/types";
import { type RpcTransport, toRpcTransport } from "./transport.ts";

/**
 * Handler callback for routed incoming JSON-RPC messages.
 *
 * @public
 */
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

/**
 * Manages bidirectional JSON-RPC message flow across an RpcTransport seam.
 *
 * @public
 */
export class MessageBus {
  readonly #transport: RpcTransport;
  readonly #onMessage: MessageHandler;

  constructor(
    transportOrWorker: RpcTransport | Worker,
    onMessage: MessageHandler
  ) {
    this.#transport = toRpcTransport(transportOrWorker);
    this.#onMessage = onMessage;
    this.#transport.onMessage = this.#handleMessage.bind(this);
  }

  /**
   * Sends a JSON-RPC request (expects response with matching ID).
   */
  sendRequest(message: OutgoingRequest, id: number): void {
    const request: JsonRpcRequest = {
      id,
      jsonrpc: "2.0",
      method: message.method,
      params: message.params,
    };
    this.#transport.postMessage(request);
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
    this.#transport.postMessage(notification);
  }

  /**
   * Classifies and routes an incoming message.
   */
  #handleMessage(event: { data: unknown }): void {
    const { data } = event;

    // Response (success or fail)
    if (isJsonRpcOk(data) || isJsonRpcFail(data)) {
      this.#onMessage(data);
      return;
    }

    // Request
    if (isJsonRpcRequest(data)) {
      this.#onMessage(data);
      return;
    }

    // Notification
    if (isJsonRpcNotification(data)) {
      this.#onMessage(data);
      return;
    }

    // Malformed response envelope targeting a pending request:
    // contains an identifier and no method, but failed response validation.
    if (
      typeof data === "object" &&
      data !== null &&
      !("method" in data) &&
      "id" in data &&
      (typeof (data as { id: unknown }).id === "string" ||
        typeof (data as { id: unknown }).id === "number" ||
        (data as { id: unknown }).id === null)
    ) {
      this.#onMessage({
        error: {
          code: RpcErrorCode.InvalidRequest,
          message: "Protocol error: malformed response envelope",
        },
        id: (data as { id: JsonRpcId }).id,
        jsonrpc: "2.0",
      });
    }
  }

  /**
   * Sends a JSON-RPC success response back to the transport peer.
   * Used by the orchestrator to reply to engine requests
   * (e.g., ENGINE.INPUT_REQUEST).
   */
  sendResponse(id: JsonRpcId, result: unknown): void {
    const response: JsonRpcOkResponse = {
      id,
      jsonrpc: "2.0",
      result,
    };
    this.#transport.postMessage(response);
  }

  /** Terminates the message bus listener. */
  terminate(): void {
    this.#transport.onMessage = null;
  }
}

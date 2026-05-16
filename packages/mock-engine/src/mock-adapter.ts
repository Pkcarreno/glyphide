/**
 * Mock engine adapter for testing and validation.
 * Simulates engine behavior without actual code execution.
 */

import { EngineMethod, RpcErrorCode } from "@glyphide/rpc-protocol/constants";
import {
  isJsonRpcNotification,
  isJsonRpcRequest,
} from "@glyphide/rpc-protocol/guards";
import type {
  JsonRpcFailResponse,
  JsonRpcMessage,
  JsonRpcOkResponse,
  JsonRpcRequest,
} from "@glyphide/rpc-protocol/types";

import type { MockEngineConfig } from "./types";
import { defaultCapabilities } from "./types";

type NotificationHandler = (method: string, params?: object) => void;

type ResponseSender = (
  response: JsonRpcOkResponse | JsonRpcFailResponse
) => void;

/**
 * Mock engine that responds to RPC protocol messages.
 * Used for testing orchestrator behavior and validating the RPC contract.
 */
export class MockEngineAdapter {
  readonly id = "mock";
  #config: Required<MockEngineConfig>;
  #interrupted = false;
  #running = false;
  #disposed = false;
  #timers: ReturnType<typeof setTimeout>[] = [];
  #sendResponse: ResponseSender;
  #onNotification: NotificationHandler;

  constructor(config: MockEngineConfig = {}) {
    this.#config = {
      initDelay: config.initDelay ?? 0,
      runDelay: config.runDelay ?? 0,
      runError: config.runError ?? null,
      capabilities: config.capabilities ?? defaultCapabilities,
    };
    this.#sendResponse = () => {
      throw new Error("Response sender not configured");
    };
    this.#onNotification = () => {
      /* noop */
    };
  }

  /**
   * Configures the response sender and notification handler.
   * Must be called before handling messages.
   */
  setup(
    sendResponse: ResponseSender,
    onNotification: NotificationHandler
  ): void {
    this.#sendResponse = sendResponse;
    this.#onNotification = onNotification;
  }

  /**
   * Disposes the adapter and clears all pending timers.
   * Prevents old timeouts from corrupting subsequent operations.
   */
  dispose(): void {
    this.#disposed = true;
    for (const timer of this.#timers) {
      clearTimeout(timer);
    }
    this.#timers = [];
  }

  /**
   * Handles incoming JSON-RPC messages.
   */
  handleMessage(message: JsonRpcMessage): void {
    if (!(isJsonRpcRequest(message) || isJsonRpcNotification(message))) {
      return;
    }

    switch (message.method) {
      case EngineMethod.Init:
        this.#handleInit(
          (message as JsonRpcRequest).id,
          (message as JsonRpcRequest).params
        );
        break;
      case EngineMethod.Run:
        this.#handleRun((message as JsonRpcRequest).id, message.params);
        break;
      case EngineMethod.Interrupt:
        this.#handleInterrupt();
        break;
      case EngineMethod.Reset:
        this.#handleReset((message as JsonRpcRequest).id);
        break;
      default:
        // Ignore unhandled methods
        break;
    }
  }

  #handleInit(id: string | number | null, params?: unknown): void {
    if (params && typeof params === "object") {
      this.#config = {
        ...this.#config,
        ...(params as Partial<MockEngineConfig>),
      };
    }

    const timer = setTimeout(() => {
      this.#timers = this.#timers.filter((t) => t !== timer);
      if (this.#disposed) {
        return;
      }
      this.#sendResponse({
        jsonrpc: "2.0",
        id,
        result: {
          timeout: 30_000,
          ...this.#config.capabilities,
        },
      });
    }, this.#config.initDelay);
    this.#timers.push(timer);
  }

  #handleRun(id: string | number | null, params?: unknown): void {
    this.#running = true;
    this.#interrupted = false;

    const timer = setTimeout(() => {
      this.#timers = this.#timers.filter((t) => t !== timer);
      if (this.#disposed) {
        return;
      }

      this.#running = false;

      if (this.#interrupted) {
        this.#sendResponse({
          jsonrpc: "2.0",
          id,
          result: { interrupted: true },
        });
        return;
      }

      if (this.#config.runError) {
        this.#sendResponse({
          jsonrpc: "2.0",
          id,
          error: {
            code: RpcErrorCode.InternalError,
            message: this.#config.runError,
          },
        });
        return;
      }

      const payload = params as { code?: string } | undefined;
      const code = payload?.code ?? "";

      this.#onNotification(EngineMethod.Print, { content: code });
      this.#sendResponse({
        jsonrpc: "2.0",
        id,
        result: { executed: true },
      });
    }, this.#config.runDelay);
    this.#timers.push(timer);
  }

  #handleInterrupt(): void {
    if (this.#running) {
      this.#interrupted = true;
      this.#onNotification(EngineMethod.Log, {
        content: "Execution interrupted",
      });
    }
  }

  #handleReset(id: string | number | null): void {
    this.#interrupted = false;
    this.#running = false;
    this.#sendResponse({
      jsonrpc: "2.0",
      id,
      result: { reset: true },
    });
  }
}

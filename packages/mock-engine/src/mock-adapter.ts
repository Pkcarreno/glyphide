/**
 * Mock engine adapter for testing and validation.
 * Simulates engine behavior without actual code execution.
 */

import { EngineMethod, RpcErrorCode } from "@glyphide/rpc-protocol/constants";
import {
  isJsonRpcNotification,
  isJsonRpcOk,
  isJsonRpcRequest,
} from "@glyphide/rpc-protocol/guards";
import type {
  JsonRpcFailResponse,
  JsonRpcId,
  JsonRpcMessage,
  JsonRpcOkResponse,
  JsonRpcRequest,
} from "@glyphide/rpc-protocol/types";

import type { MockEngineConfig } from "./types.ts";
import { defaultCapabilities } from "./types.ts";

type NotificationHandler = (method: string, params?: object) => void;

type ResponseSender = (
  response: JsonRpcOkResponse | JsonRpcFailResponse
) => void;

type RequestSender = (method: string, id: JsonRpcId, params?: object) => void;

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
  #sendRequest: RequestSender;
  #nextInputId = 0;
  readonly #pendingInputs = new Map<JsonRpcId, (value: string) => void>();

  constructor(config: MockEngineConfig = {}) {
    this.#config = {
      initDelay: config.initDelay ?? 0,
      inputPrompts: config.inputPrompts ?? [],
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
    this.#sendRequest = () => {
      throw new Error("Request sender not configured");
    };
  }

  /**
   * Configures the response sender, notification handler, and request sender.
   * Must be called before handling messages.
   */
  setup(
    sendResponse: ResponseSender,
    onNotification: NotificationHandler,
    sendRequest?: RequestSender
  ): void {
    this.#sendResponse = sendResponse;
    this.#onNotification = onNotification;
    if (sendRequest) {
      this.#sendRequest = sendRequest;
    }
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
    // Reject all pending input requests
    for (const resolver of this.#pendingInputs.values()) {
      resolver("");
    }
    this.#pendingInputs.clear();
  }

  /**
   * Handles incoming JSON-RPC messages.
   * Processes requests, notifications, and responses
   * (responses are used for ENGINE.INPUT_REQUEST replies).
   */
  handleMessage(message: JsonRpcMessage): void {
    // Handle incoming responses (for INPUT_REQUEST replies)
    if (isJsonRpcOk(message)) {
      this.#handleInputReply(message);
      return;
    }

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
          id: "mock",
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

      // If input prompts configured, handle them asynchronously
      if (this.#config.inputPrompts.length > 0) {
        this.#handleInputSequence(id, code);
        return;
      }

      this.#onNotification(EngineMethod.Output, {
        type: "print",
        data: code,
      });
      this.#sendResponse({
        jsonrpc: "2.0",
        id,
        result: { executed: true },
      });
    }, this.#config.runDelay);
    this.#timers.push(timer);
  }

  /**
   * Handles sequential input prompts during execution.
   * Sends ENGINE.INPUT_REQUEST for each prompt, waits for reply,
   * and emits collected values as output.
   */
  async #handleInputSequence(runId: JsonRpcId, code: string): Promise<void> {
    const values: string[] = [];
    for (const prompt of this.#config.inputPrompts) {
      if (this.#disposed) {
        return;
      }
      const value = await this.#requestInput(prompt);
      values.push(value);
    }

    if (this.#disposed) {
      return;
    }

    this.#onNotification(EngineMethod.Output, {
      type: "print",
      data: code,
    });

    if (values.length > 0) {
      this.#onNotification(EngineMethod.Output, {
        type: "print",
        data: values.join(", "),
      });
    }

    this.#sendResponse({
      jsonrpc: "2.0",
      id: runId,
      result: { executed: true },
    });
  }

  /**
   * Sends an ENGINE.INPUT_REQUEST and returns a Promise
   * that resolves with the user's reply value.
   */
  #requestInput(prompt: string): Promise<string> {
    return new Promise<string>((resolve) => {
      const id = `input-${this.#nextInputId++}`;
      this.#pendingInputs.set(id, resolve);
      this.#sendRequest(EngineMethod.InputRequest, id, { prompt });
    });
  }

  /**
   * Handles an incoming response that resolves a pending input request.
   */
  #handleInputReply(response: JsonRpcOkResponse): void {
    const resolver = this.#pendingInputs.get(response.id);
    if (resolver) {
      this.#pendingInputs.delete(response.id);
      const result = response.result as { value?: string } | undefined;
      resolver(result?.value ?? "");
    }
  }

  #handleInterrupt(): void {
    if (this.#running) {
      this.#interrupted = true;
      this.#onNotification(EngineMethod.Output, {
        type: "log",
        data: "Execution interrupted",
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

/**
 * Factory function to create a new Web Worker running the Mock engine.
 * The worker file must be bundled or served correctly by the consumer.
 */
export const createMockWorker = () =>
  new Worker(new URL("../worker/mock-worker.mjs", import.meta.url), {
    type: "module",
  });

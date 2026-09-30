/**
 * Main controller for engine execution.
 * Manages transport lifecycle, promise registry, and RPC messaging.
 */

import { EngineMethod } from "@glyphide/rpc-protocol/constants";
import {
  isJsonRpcFail,
  isJsonRpcOk,
  isJsonRpcRequest,
} from "@glyphide/rpc-protocol/guards";
import type {
  EngineInitResult,
  EngineInputRequestParams,
  EngineOutputPayload,
  JsonRpcFailResponse,
  JsonRpcNotification,
  JsonRpcOkResponse,
  JsonRpcRequest,
} from "@glyphide/rpc-protocol/types";
import { MessageBus } from "./message-bus.ts";
import { PromiseRegistry } from "./promise-registry.ts";
import {
  type EngineTransportFactory,
  type RpcTransport,
  toRpcTransport,
} from "./transport.ts";

/**
 * Extracts a human-readable message from an unknown catch value.
 * Handles Error instances, plain JSON-RPC error objects ({ code, message }),
 * and any other value via String coercion.
 */
function extractMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  const asRecord = error as Record<string, unknown>;
  if (typeof asRecord.message === "string") {
    return asRecord.message;
  }
  return String(error);
}

/**
 * Phantom-typed worker factory.
 * The generic parameter carries the engine's output payload shape
 * through the type system without adding runtime overhead.
 *
 * @public
 */
export type EngineWorkerFactory<
  TPayload extends EngineOutputPayload = EngineOutputPayload,
> = (() => Worker | RpcTransport) & {
  readonly _payloadType?: TPayload;
};

/**
 * Extracts the payload type carried by an `EngineWorkerFactory` or `EngineTransportFactory`.
 *
 * @public
 */
export type InferEnginePayload<TFactory> = TFactory extends {
  readonly _payloadType?: infer P;
}
  ? P extends EngineOutputPayload
    ? P
    : EngineOutputPayload
  : EngineOutputPayload;

/**
 * Event subscriptions for engine orchestration.
 *
 * @public
 */
export interface OrchestratorEvents<
  TPayload extends EngineOutputPayload = EngineOutputPayload,
> {
  onEngineReady?: (result: EngineInitResult) => void;
  /**
   * Called when the engine requests user input during execution.
   * The `reply` function must be called with the user's value to unblock
   * the engine. If this handler is not registered, the orchestrator
   * auto-replies with an empty string.
   */
  onInputRequest?: (prompt: string, reply: (value: string) => void) => void;
  onOutput?: (payload: TPayload) => void;
}

/**
 * Configuration options for EngineOrchestrator.
 *
 * @public
 */
export interface OrchestratorConfig<
  TFactory extends
    | EngineWorkerFactory
    | EngineTransportFactory = EngineWorkerFactory,
> {
  /** Factory function to create the engine transport instance. */
  createTransport?: TFactory;
  /** Factory function to create the engine worker instance. Kept for backwards compatibility. */
  createWorker?: TFactory;
  /** Event handlers. */
  events?: OrchestratorEvents<InferEnginePayload<TFactory>>;
  /** Enable worker mode. If false, runs inline (future). */
  useWorker?: boolean;
}

/**
 * Orchestrates engine execution and lifecycles via the RpcTransport seam.
 *
 * @public
 */
export class EngineOrchestrator<
  TFactory extends
    | EngineWorkerFactory
    | EngineTransportFactory = EngineWorkerFactory,
> {
  readonly #config: OrchestratorConfig<TFactory>;
  readonly #registry: PromiseRegistry;
  #transport: RpcTransport | null = null;
  #bus: MessageBus | null = null;
  #nextId = 0;
  #timeout = 30_000;
  #lastInitParams?: unknown;
  #recoveryPromise: Promise<void> | null = null;

  constructor(config: OrchestratorConfig<TFactory>) {
    this.#config = {
      createTransport: config.createTransport,
      createWorker: config.createWorker,
      events: config.events ?? {},
      useWorker: config.useWorker ?? true,
    } as OrchestratorConfig<TFactory>;
    this.#registry = new PromiseRegistry();
  }

  /**
   * Initializes the engine transport and performs handshake.
   * @param configParams Optional configuration to pass to the engine during initialization.
   */
  async init(configParams?: unknown): Promise<EngineInitResult> {
    this.#lastInitParams = configParams;

    if (this.#config.useWorker) {
      this.#spawnTransport();
    }

    let response: JsonRpcOkResponse<EngineInitResult>;
    try {
      response = (await this.#sendRequest({
        method: EngineMethod.Init,
        params: configParams,
      })) as JsonRpcOkResponse<EngineInitResult>;
    } catch (error) {
      throw new Error(`Init failed: ${extractMessage(error)}`, {
        cause: error,
      });
    }

    const { result } = response;
    this.#timeout = result.timeout;
    this.#config.events?.onEngineReady?.(result);

    return result;
  }

  /**
   * Executes code in the engine.
   */
  async run(code: string): Promise<void> {
    if (this.#recoveryPromise) {
      await this.#recoveryPromise;
    }

    let response: JsonRpcOkResponse | JsonRpcFailResponse;
    try {
      response = await this.#sendRequest({
        method: EngineMethod.Run,
        params: { code },
      });
    } catch (error) {
      throw new Error(`Execution failed: ${extractMessage(error)}`, {
        cause: error,
      });
    }

    if (isJsonRpcFail(response)) {
      throw new Error(`Execution failed: ${response.error.message}`);
    }
  }

  /**
   * Forcefully interrupts the running execution by terminating the transport.
   * State is lost, but the Orchestrator is automatically restored to a usable state.
   */
  async interrupt(): Promise<void> {
    if (!this.#transport) {
      return;
    }

    // Terminate transport to force stop synchronous WASM execution
    this.#transport.terminate?.();
    this.#bus?.terminate();
    this.#transport = null;
    this.#bus = null;

    // Clear pending promises (which rejects them with "Worker terminated")
    this.#registry.clear();

    // Notify listeners that execution was forcefully interrupted
    this.#config.events?.onOutput?.({
      data: "Execution interrupted",
      type: "system",
    } as InferEnginePayload<TFactory>);

    this.#recoveryPromise = (async () => {
      // Respawn transport and reinitialize
      if (this.#config.useWorker) {
        this.#spawnTransport();
      }

      try {
        await this.#sendRequest({
          method: EngineMethod.Init,
          params: this.#lastInitParams,
        });
      } catch {
        // Silently ignore init errors on respawn to keep orchestrator alive
      }
    })();

    await this.#recoveryPromise;
    this.#recoveryPromise = null;
  }

  /**
   * Resets the engine execution context without destroying
   * the worker or reloading the WASM module.
   * All previously declared variables and state are cleared.
   *
   * @throws If the orchestrator is not initialized or the reset fails.
   */
  async reset(): Promise<void> {
    const response = await this.#sendRequest({
      method: EngineMethod.Reset,
    });

    if (isJsonRpcFail(response)) {
      throw new Error(`Reset failed: ${response.error.message}`);
    }
  }

  /**
   * Terminates the transport and cleans up promises.
   */
  terminate(): void {
    if (this.#transport) {
      this.#transport.terminate?.();
      this.#bus?.terminate();
      this.#registry.clear();
      this.#transport = null;
      this.#bus = null;
    }
  }

  #spawnTransport(): void {
    const factory = this.#config.createTransport ?? this.#config.createWorker;
    if (!factory) {
      throw new Error("createTransport or createWorker factory not provided");
    }
    const raw = factory();
    this.#transport = toRpcTransport(raw);
    this.#bus = new MessageBus(this.#transport, this.#handleMessage.bind(this));
  }

  #handleMessage(
    message:
      | JsonRpcOkResponse
      | JsonRpcFailResponse
      | JsonRpcRequest
      | JsonRpcNotification
  ): void {
    if (isJsonRpcOk(message)) {
      this.#registry.resolve(message.id, message.result);
    } else if (isJsonRpcFail(message)) {
      this.#registry.reject(message.id, message.error);
    } else if (isJsonRpcRequest(message)) {
      this.#handleEngineRequest(message);
    } else if ("method" in message) {
      this.#handleNotification(message as JsonRpcNotification);
    }
  }

  /**
   * Handles incoming JSON-RPC requests from the engine.
   * Currently supports ENGINE.INPUT_REQUEST for stdin prompts.
   */
  #handleEngineRequest(request: JsonRpcRequest): void {
    if (request.method === EngineMethod.InputRequest) {
      const { prompt } = request.params as EngineInputRequestParams;

      const reply = (value: string): void => {
        this.#bus?.sendResponse(request.id, { value });
      };

      if (this.#config.events?.onInputRequest) {
        this.#config.events.onInputRequest(prompt, reply);
      } else {
        reply("");
      }
    }
  }

  #handleNotification(notification: JsonRpcNotification): void {
    if (notification.method === EngineMethod.Output) {
      const payload = notification.params as
        | InferEnginePayload<TFactory>
        | undefined;
      if (payload) {
        this.#config.events?.onOutput?.(payload);
      }
    }
  }

  async #sendRequest<T>(message: {
    method: string;
    params?: unknown;
  }): Promise<JsonRpcOkResponse<T>> {
    if (!this.#bus && this.#config.useWorker) {
      throw new Error("Orchestrator not initialized");
    }

    const id = this.#nextId;
    this.#nextId += 1;
    const [promise, _resolve, reject] = this.#registry.register<T>(id);
    this.#bus?.sendRequest(message, id);

    const isRun = message.method === EngineMethod.Run;
    const timeoutMs = isRun ? this.#timeout + 100 : 30_000;
    const requestStartTime = Date.now();

    const requestTimeoutId = setTimeout(() => {
      if (this.#registry.size > 0) {
        reject(new Error("Request timeout"));
        // We trigger an interrupt (transport.terminate()) slightly after the
        // timeout to reclaim resources if an engine lacks graceful interruption
        // support (like Micropython) and is stuck in a synchronous infinite loop.
        this.interrupt().catch(() => {
          /* noop */
        });
      }
    }, timeoutMs);

    try {
      const result = await promise;
      if (Date.now() - requestStartTime >= timeoutMs) {
        await this.interrupt().catch(() => {
          /* noop */
        });
        throw new Error("Request timeout");
      }
      return { id, jsonrpc: "2.0", result } as JsonRpcOkResponse<T>;
    } finally {
      clearTimeout(requestTimeoutId);
    }
  }
}

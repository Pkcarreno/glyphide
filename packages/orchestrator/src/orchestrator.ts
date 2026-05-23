/**
 * Main controller for engine execution.
 * Manages worker lifecycle, promise registry, and RPC messaging.
 */

import { EngineMethod } from "@glyphide/rpc-protocol/constants";
import { isJsonRpcFail, isJsonRpcOk } from "@glyphide/rpc-protocol/guards";
import type {
  EngineOutputPayload,
  JsonRpcFailResponse,
  JsonRpcNotification,
  JsonRpcOkResponse,
  JsonRpcRequest,
} from "@glyphide/rpc-protocol/types";
import { MessageBus } from "./message-bus";
import { PromiseRegistry } from "./promise-registry";

export interface EngineConfig {
  timeout?: number;
}

/**
 * Phantom-typed worker factory.
 * The generic parameter carries the engine's output payload shape
 * through the type system without adding runtime overhead.
 */
export type EngineWorkerFactory<
  TPayload extends EngineOutputPayload = EngineOutputPayload,
> = (() => Worker) & {
  readonly _payloadType?: TPayload;
};

/** Extracts the payload type carried by an `EngineWorkerFactory`. */
export type InferEnginePayload<TFactory> =
  TFactory extends EngineWorkerFactory<infer P> ? P : EngineOutputPayload;

export interface OrchestratorEvents<
  TPayload extends EngineOutputPayload = EngineOutputPayload,
> {
  onInit?: (config: EngineConfig) => void;
  onOutput?: (payload: TPayload) => void;
}

export interface OrchestratorConfig<
  TFactory extends EngineWorkerFactory = EngineWorkerFactory,
> {
  /** Factory function to create the engine worker instance. */
  createWorker?: TFactory;
  /** Event handlers. */
  events?: OrchestratorEvents<InferEnginePayload<TFactory>>;
  /** Enable worker mode. If false, runs inline (future). */
  useWorker?: boolean;
}

export class EngineOrchestrator<
  TFactory extends EngineWorkerFactory = EngineWorkerFactory,
> {
  readonly #config: Required<OrchestratorConfig<TFactory>>;
  readonly #registry: PromiseRegistry;
  #worker: Worker | null = null;
  #bus: MessageBus | null = null;
  #nextId = 0;
  #timeout = 30_000;

  constructor(config: OrchestratorConfig<TFactory>) {
    this.#config = {
      createWorker:
        config.createWorker ??
        ((() => {
          throw new Error("createWorker factory not provided");
        }) as unknown as TFactory),
      useWorker: config.useWorker ?? true,
      events: config.events ?? {},
    };
    this.#registry = new PromiseRegistry();
  }

  /**
   * Initializes the engine worker and performs handshake.
   * @param configParams Optional configuration to pass to the engine during initialization.
   */
  async init(configParams?: unknown): Promise<EngineConfig> {
    if (this.#config.useWorker) {
      this.#spawnWorker();
    }

    const response = await this.#sendRequest({
      method: EngineMethod.Init,
      params: configParams,
    });

    const config = response.result as EngineConfig;
    this.#timeout = config.timeout ?? 30_000;
    this.#config.events.onInit?.(config);

    return config;
  }

  /**
   * Executes code in the engine.
   */
  async run(code: string): Promise<void> {
    let response: JsonRpcOkResponse | JsonRpcFailResponse;
    try {
      response = await this.#sendRequest({
        method: EngineMethod.Run,
        params: { code },
      });
    } catch (error) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
      throw new Error(`Execution failed: ${message}`);
    }

    if (isJsonRpcFail(response)) {
      throw new Error(`Execution failed: ${response.error.message}`);
    }
  }

  /**
   * Gracefully interrupts the running execution.
   */
  async interrupt(): Promise<void> {
    if (!this.#worker) {
      return;
    }

    this.#sendNotification({ method: EngineMethod.Interrupt });

    await new Promise((resolve) => setTimeout(resolve, 100));
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
   * Terminates the worker and cleans up promises.
   */
  terminate(): void {
    if (this.#worker) {
      this.#worker.terminate();
      this.#bus?.terminate();
      this.#registry.clear();
      this.#worker = null;
      this.#bus = null;
    }
  }

  #spawnWorker(): void {
    if (!this.#config.createWorker) {
      throw new Error("createWorker is required when useWorker is true");
    }
    this.#worker = this.#config.createWorker();
    this.#bus = new MessageBus(this.#worker, this.#handleMessage.bind(this));
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
    } else if ("method" in message && "id" in message) {
      // Request from engine (future use)
    } else if ("method" in message) {
      this.#handleNotification(message as JsonRpcNotification);
    }
  }

  #handleNotification(notification: JsonRpcNotification): void {
    if (notification.method === EngineMethod.Output) {
      const payload = notification.params as
        | InferEnginePayload<TFactory>
        | undefined;
      if (payload) {
        this.#config.events.onOutput?.(payload);
      }
    }
  }

  #sendRequest<T>(message: {
    method: string;
    params?: unknown;
  }): Promise<JsonRpcOkResponse<T>> {
    if (!this.#bus && this.#config.useWorker) {
      throw new Error("Orchestrator not initialized");
    }

    const id = this.#nextId++;
    const [promise, _resolve, reject] = this.#registry.register<T>(id);
    this.#bus?.sendRequest(message, id);

    const timeoutId = setTimeout(() => {
      if (this.#registry.size > 0) {
        reject(new Error("Request timeout"));
      }
    }, this.#timeout);

    return promise.then((result) => {
      clearTimeout(timeoutId);
      return { jsonrpc: "2.0", id, result } as JsonRpcOkResponse<T>;
    }) as Promise<JsonRpcOkResponse<T>>;
  }

  #sendNotification(message: { method: string; params?: unknown }): void {
    if (!this.#bus) {
      throw new Error("Orchestrator not initialized");
    }
    this.#bus.sendNotification(message);
  }
}

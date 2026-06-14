/**
 * Main controller for engine execution.
 * Manages worker lifecycle, promise registry, and RPC messaging.
 */

import { EngineMethod } from "@glyphide/rpc-protocol/constants";
import {
  isJsonRpcFail,
  isJsonRpcOk,
  isJsonRpcRequest,
} from "@glyphide/rpc-protocol/guards";
import type {
  EngineInputRequestParams,
  EngineOutputPayload,
  JsonRpcFailResponse,
  JsonRpcNotification,
  JsonRpcOkResponse,
  JsonRpcRequest,
} from "@glyphide/rpc-protocol/types";
import { MessageBus } from "./message-bus.ts";
import { PromiseRegistry } from "./promise-registry.ts";

/**
 * Result returned by the engine after a successful INIT handshake.
 * The orchestrator extracts `timeout` for internal use and forwards
 * the full result to consumers via `onEngineReady`.
 *
 * This is a re-export alias — the canonical definition lives in
 * `@glyphide/rpc-protocol/types` as `EngineInitResult`.
 */
export interface EngineInitResult {
  id: string;
  isInterruptible: boolean;
  isStateful: boolean;
  supportedLanguages: readonly string[];
  /** Whether the engine may emit ENGINE.INPUT_REQUEST during execution. */
  supportsInput?: boolean;
  timeout: number;
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
  #lastInitParams?: unknown;
  #recoveryPromise: Promise<void> | null = null;

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
  async init(configParams?: unknown): Promise<EngineInitResult> {
    this.#lastInitParams = configParams;

    if (this.#config.useWorker) {
      this.#spawnWorker();
    }

    const response = await this.#sendRequest({
      method: EngineMethod.Init,
      params: configParams,
    });

    const result = response.result as EngineInitResult;
    this.#timeout = result.timeout ?? 30_000;
    this.#config.events.onEngineReady?.(result);

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
   * Forcefully interrupts the running execution by terminating the worker.
   * State is lost, but the Orchestrator is automatically restored to a usable state.
   */
  async interrupt(): Promise<void> {
    if (!this.#worker) {
      return;
    }

    // Terminate worker to force stop synchronous WASM execution
    this.#worker.terminate();
    this.#bus?.terminate();
    this.#worker = null;
    this.#bus = null;

    // Clear pending promises (which rejects them with "Worker terminated")
    this.#registry.clear();

    // Notify listeners that execution was forcefully interrupted
    this.#config.events.onOutput?.({
      type: "system",
      data: "Execution interrupted",
    } as InferEnginePayload<TFactory>);

    this.#recoveryPromise = (async () => {
      // Respawn worker and reinitialize
      if (this.#config.useWorker) {
        this.#spawnWorker();
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
      const params = request.params as EngineInputRequestParams | undefined;
      const prompt = params?.prompt ?? "";

      const reply = (value: string): void => {
        this.#bus?.sendResponse(request.id, { value });
      };

      if (this.#config.events.onInputRequest) {
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

    const isRun = message.method === EngineMethod.Run;
    const timeoutMs = isRun ? this.#timeout + 100 : 30_000;

    const requestTimeoutId = setTimeout(() => {
      if (this.#registry.size > 0) {
        reject(new Error("Request timeout"));
        // We trigger an interrupt (Worker.terminate()) slightly after the
        // timeout to reclaim resources if an engine lacks graceful interruption
        // support (like Micropython) and is stuck in a synchronous infinite loop.
        this.interrupt().catch(() => {
          /* noop */
        });
      }
    }, timeoutMs);

    return promise.then((result) => {
      clearTimeout(requestTimeoutId);
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

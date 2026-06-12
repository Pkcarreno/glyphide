import type { EngineWorkerFactory } from "@glyphide/orchestrator";
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
import {
  getQuickJS,
  type QuickJSContext,
  type QuickJSHandle,
  type QuickJSRuntime,
} from "quickjs-emscripten";
import { consoleAstSource } from "./console-ast-builder.ts";
import {
  type ConsoleToken,
  defaultCapabilities,
  type QuickJSEngineConfig,
  type QuickJSOutputPayload,
} from "./types.ts";

type NotificationHandler = (method: string, params?: object) => void;
type ResponseSender = (
  response: JsonRpcOkResponse | JsonRpcFailResponse
) => void;

/**
 * QuickJS engine that responds to RPC protocol messages.
 * Integrates quickjs-emscripten to execute arbitrary code safely.
 */
export class QuickJSEngineAdapter {
  readonly id = defaultCapabilities.id;
  #config: Required<QuickJSEngineConfig>;
  #runtime: QuickJSRuntime | null = null;
  #context: QuickJSContext | null = null;
  #sendResponse: ResponseSender;
  #onNotification: NotificationHandler;

  constructor(config: QuickJSEngineConfig = {}) {
    this.#config = {
      memoryLimit: config.memoryLimit ?? 1024 * 1024 * 100, // 100MB default
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
   */
  setup(
    sendResponse: ResponseSender,
    onNotification: NotificationHandler
  ): void {
    this.#sendResponse = sendResponse;
    this.#onNotification = onNotification;
  }

  /**
   * Disposes the engine and frees WebAssembly memory.
   */
  dispose(): void {
    this.#context?.dispose();
    this.#context = null;
    this.#runtime?.dispose();
    this.#runtime = null;
  }

  /**
   * Handles incoming JSON-RPC messages from the orchestrator.
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

      case EngineMethod.Reset:
        this.#handleReset((message as JsonRpcRequest).id);
        break;
      default:
        // Ignore unknown methods
        break;
    }
  }

  async #handleInit(
    id: string | number | null,
    params?: unknown
  ): Promise<void> {
    try {
      if (params && typeof params === "object") {
        this.#config = {
          ...this.#config,
          ...(params as Partial<QuickJSEngineConfig>),
        };
      }

      const qjs = await getQuickJS();
      this.dispose();

      this.#runtime = qjs.newRuntime();
      if (this.#config.memoryLimit > 0) {
        this.#runtime.setMemoryLimit(this.#config.memoryLimit);
      }

      this.#context = this.#runtime.newContext();
      this.#injectConsole();
      this.#injectFetch();

      this.#sendResponse({
        jsonrpc: "2.0",
        id,
        result: { timeout: 30_000, ...defaultCapabilities },
      });
    } catch (error) {
      this.#sendResponse({
        jsonrpc: "2.0",
        id,
        error: {
          code: RpcErrorCode.ServerError,
          message: `Init failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      });
    }
  }

  #handleRun(id: string | number | null, params?: unknown): void {
    if (!(this.#context && this.#runtime)) {
      this.#sendResponse({
        jsonrpc: "2.0",
        id,
        error: {
          code: RpcErrorCode.ServerError,
          message: "Engine not initialized",
        },
      });
      return;
    }

    // Reset interrupt handler if any
    this.#runtime.setInterruptHandler(() => false);

    const payload = params as { code?: string } | undefined;
    const code = payload?.code ?? "";

    try {
      const result = this.#context.evalCode(code);

      if (result.error) {
        const errorVal = this.#context.dump(result.error);
        result.error.dispose();

        const errorMsg =
          typeof errorVal === "object" && errorVal !== null
            ? `${(errorVal as Record<string, unknown>).name || "Error"}: ${(errorVal as Record<string, unknown>).message || JSON.stringify(errorVal)}`
            : String(errorVal);

        this.#sendResponse({
          jsonrpc: "2.0",
          id,
          error: { code: RpcErrorCode.InternalError, message: errorMsg },
        });
        return;
      }

      const valueMsg = this.#safeDump(result.value);
      result.value.dispose();

      // QuickJS handles async jobs separately. We execute any pending promises.
      this.#runtime.executePendingJobs();

      this.#sendResponse({
        jsonrpc: "2.0",
        id,
        result: { executed: true, value: valueMsg },
      });
    } catch (error) {
      this.#sendResponse({
        jsonrpc: "2.0",
        id,
        error: {
          code: RpcErrorCode.InternalError,
          message: `Execution failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      });
    }
  }

  /**
   * Resets the execution context within the existing runtime.
   * Disposes the current QuickJSContext and creates a fresh one
   * with console and fetch re-injected. The WASM module and
   * runtime memory pool persist across resets.
   *
   * @param id - JSON-RPC request ID for the response.
   */
  #handleReset(id: string | number | null): void {
    if (!this.#runtime) {
      this.#sendResponse({
        jsonrpc: "2.0",
        id,
        error: {
          code: RpcErrorCode.ServerError,
          message: "Engine not initialized",
        },
      });
      return;
    }

    try {
      this.#context?.dispose();
      this.#context = this.#runtime.newContext();
      this.#injectConsole();
      this.#injectFetch();

      this.#sendResponse({
        jsonrpc: "2.0",
        id,
        result: { reset: true },
      });
    } catch (error) {
      this.#sendResponse({
        jsonrpc: "2.0",
        id,
        error: {
          code: RpcErrorCode.ServerError,
          message: `Reset failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      });
    }
  }

  /**
   * Safely serializes a QuickJSHandle to a native JS value.
   *
   * Uses getPromiseState() to distinguish between regular values
   * and Promises. For non-Promises, getPromiseState returns
   * `{ type: "fulfilled", value: handle, notAPromise: true }`
   * where `value` is the same handle reference. For actual
   * Promises, it returns a separate handle to the resolved value
   * (or error) that must be disposed independently.
   *
   * Calling dump() directly on a Promise handle crashes with
   * "Lifetime not alive" because WASM-backed promise internals
   * are not safely traversable.
   */
  #safeDump(handle: QuickJSHandle): unknown {
    if (!this.#context) {
      return;
    }

    const state = this.#context.getPromiseState(handle);

    if ((state as { notAPromise?: boolean }).notAPromise) {
      // Regular value — state.value IS the same handle, do NOT dispose it.
      return this.#context.dump(handle);
    }

    if (state.type === "fulfilled") {
      const value = this.#context.dump(state.value);
      state.value.dispose();
      return value;
    }

    if (state.type === "rejected") {
      state.error.dispose();
    }

    return;
  }

  #injectConsole(): void {
    if (!this.#context) {
      return;
    }
    const ctx = this.#context;

    // Bind host callback that receives (method, jsonTokens)
    const emitHandle = ctx.newFunction(
      "__glyphide_emit__",
      (methodHandle, jsonHandle) => {
        const method = ctx.getString(methodHandle);
        const json = ctx.getString(jsonHandle);

        let tokens: ConsoleToken[];
        try {
          tokens = JSON.parse(json) as ConsoleToken[];
        } catch {
          tokens = [{ type: "string", value: json }];
        }

        this.#onNotification(EngineMethod.Output, {
          type: method as "log" | "warn" | "error" | "info",
          data: tokens,
        } satisfies QuickJSOutputPayload);
      }
    );

    ctx.setProp(ctx.global, "__glyphide_emit__", emitHandle);
    emitHandle.dispose();

    // Evaluate the AST builder which sets up globalThis.console
    const result = ctx.evalCode(consoleAstSource);
    if (result.error) {
      result.error.dispose();
    } else {
      result.value.dispose();
    }
  }

  #injectFetch(): void {
    if (!this.#context) {
      return;
    }

    const ctx = this.#context;
    const fetchHandle = ctx.newFunction("fetch", (urlHandle, initHandle) => {
      const url = ctx.getString(urlHandle);

      const initObj =
        initHandle && ctx.typeof(initHandle) === "object"
          ? (ctx.dump(initHandle) as RequestInit)
          : undefined;

      const promise = ctx.newPromise();

      globalThis
        .fetch(url, initObj)
        .then(async (res) => {
          if (!(this.#context && this.#runtime)) {
            return; // Prevent memory access after dispose
          }
          const text = await res.text();
          const responseHandle = ctx.newObject();

          const okHandle = res.ok ? ctx.true : ctx.false;
          ctx.setProp(responseHandle, "ok", okHandle);

          const statusHandle = ctx.newNumber(res.status);
          ctx.setProp(responseHandle, "status", statusHandle);
          statusHandle.dispose();

          const jsonFn = ctx.newFunction("json", () => {
            const innerPromise = ctx.newPromise();
            try {
              const parsed = JSON.parse(text);
              const valHandle = ctx.evalCode(`(${JSON.stringify(parsed)})`);
              if (valHandle.error) {
                innerPromise.reject(valHandle.error);
                valHandle.error.dispose();
              } else {
                innerPromise.resolve(valHandle.value);
                valHandle.value.dispose();
              }
            } catch (e) {
              const errHandle = ctx.newString(String(e));
              innerPromise.reject(errHandle);
              errHandle.dispose();
            }
            this.#runtime?.executePendingJobs();
            return innerPromise.handle;
          });

          const textFn = ctx.newFunction("text", () => {
            const innerPromise = ctx.newPromise();
            const textHandle = ctx.newString(text);
            innerPromise.resolve(textHandle);
            textHandle.dispose();
            this.#runtime?.executePendingJobs();
            return innerPromise.handle;
          });

          this.#context.setProp(responseHandle, "json", jsonFn);
          this.#context.setProp(responseHandle, "text", textFn);

          promise.resolve(responseHandle);
          responseHandle.dispose();
          jsonFn.dispose();
          textFn.dispose();
          this.#runtime.executePendingJobs();
        })
        .catch((err) => {
          if (!(this.#context && this.#runtime)) {
            return;
          }
          const errHandle = this.#context.newString(err.message);
          promise.reject(errHandle);
          errHandle.dispose();
          this.#runtime.executePendingJobs();
        });

      return promise.handle;
    });

    ctx.setProp(ctx.global, "fetch", fetchHandle);
    fetchHandle.dispose();
  }
}

/**
 * Factory function to create a new Web Worker running the QuickJS engine.
 * The worker file must be bundled or served correctly by the consumer.
 */
export const createQuickJSWorker: EngineWorkerFactory<
  QuickJSOutputPayload
> = () =>
  new Worker(new URL("../worker/quickjs-worker.mjs", import.meta.url), {
    type: "module",
  });

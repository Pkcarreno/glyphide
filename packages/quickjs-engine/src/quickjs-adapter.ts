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
  type QuickJSRuntime,
} from "quickjs-emscripten";
import { defaultCapabilities, type QuickJSEngineConfig } from "./types";

type NotificationHandler = (method: string, params?: object) => void;
type ResponseSender = (
  response: JsonRpcOkResponse | JsonRpcFailResponse
) => void;

/**
 * QuickJS engine that responds to RPC protocol messages.
 * Integrates quickjs-emscripten to execute arbitrary code safely.
 */
export class QuickJSEngineAdapter {
  readonly id = "quickjs";
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
      case EngineMethod.Interrupt:
        this.#handleInterrupt();
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

      const valueMsg = this.#context.dump(result.value);
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

  #handleInterrupt(): void {
    if (this.#runtime) {
      this.#runtime.setInterruptHandler(() => true);
      this.#onNotification(EngineMethod.Log, {
        content: "Execution interrupted",
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

  #injectConsole(): void {
    if (!this.#context) {
      return;
    }
    const ctx = this.#context;
    const consoleHandle = ctx.newObject();

    const createLogger = (method: string) => {
      return ctx.newFunction(method, (...args) => {
        const texts = args.map((arg) => {
          const dumped = ctx.dump(arg);
          return typeof dumped === "object"
            ? JSON.stringify(dumped)
            : String(dumped);
        });
        const targetMethod =
          method === "warn" || method === "error"
            ? EngineMethod.Warn
            : EngineMethod.Log;
        this.#onNotification(targetMethod, { content: texts.join(" ") });
      });
    };

    const logHandle = createLogger("log");
    const warnHandle = createLogger("warn");
    const errorHandle = createLogger("error");
    const infoHandle = createLogger("info");

    ctx.setProp(consoleHandle, "log", logHandle);
    ctx.setProp(consoleHandle, "warn", warnHandle);
    ctx.setProp(consoleHandle, "error", errorHandle);
    ctx.setProp(consoleHandle, "info", infoHandle);
    ctx.setProp(ctx.global, "console", consoleHandle);

    logHandle.dispose();
    warnHandle.dispose();
    errorHandle.dispose();
    infoHandle.dispose();
    consoleHandle.dispose();
  }

  #injectFetch(): void {
    if (!this.#context) {
      return;
    }

    const ctx = this.#context;
    const fetchHandle = ctx.newFunction("fetch", (urlHandle) => {
      const url = ctx.getString(urlHandle);
      const promise = ctx.newPromise();

      globalThis
        .fetch(url)
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
export function createQuickJSWorker(): Worker {
  return new Worker(new URL("../worker/quickjs-worker.js", import.meta.url), {
    type: "module",
  });
}

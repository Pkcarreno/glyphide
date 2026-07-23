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
  loadMicroPython,
  type MicroPythonInstance,
} from "@micropython/micropython-webassembly-pyscript/micropython.mjs";
import wasmUrl from "@micropython/micropython-webassembly-pyscript/micropython.wasm?url";
import { captureHostXMLHttpRequest, installHttpClient } from "./http-client.ts";
import {
  defaultCapabilities,
  type MicropythonEngineConfig,
  type MicropythonOutputPayload,
} from "./types.ts";

const resolvedWasmUrl =
  typeof process !== "undefined" &&
  process?.env?.VITEST &&
  wasmUrl.startsWith("/@fs")
    ? wasmUrl.replace("/@fs", "")
    : wasmUrl;

type NotificationHandler = (method: string, params?: object) => void;
type ResponseSender = (
  response: JsonRpcOkResponse | JsonRpcFailResponse
) => void;

/**
 * Micropython engine that responds to RPC protocol messages.
 * Integrates micropython to execute Python code safely in the browser.
 */
export class MicropythonEngineAdapter {
  readonly id = defaultCapabilities.id;
  #config: Required<MicropythonEngineConfig>;
  #mp: MicroPythonInstance | null = null;
  #sendResponse: ResponseSender;
  #onNotification: NotificationHandler;

  constructor(config: MicropythonEngineConfig = {}) {
    this.#config = {
      memoryLimit: config.memoryLimit ?? 1024 * 1024 * 50,
      timeout: config.timeout ?? 30_000,
    };
    this.#sendResponse = () => {
      throw new Error("Response sender not configured");
    };
    this.#onNotification = () => {
      /* noop */
    };
  }

  setup(
    sendResponse: ResponseSender,
    onNotification: NotificationHandler
  ): void {
    this.#sendResponse = sendResponse;
    this.#onNotification = onNotification;
  }

  dispose(): void {
    this.#mp = null;
  }

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
          ...(params as Partial<MicropythonEngineConfig>),
        };
      }

      await this.#initializeEngine();

      this.#sendResponse({
        id,
        jsonrpc: "2.0",
        result: { timeout: this.#config.timeout, ...defaultCapabilities },
      });
    } catch (error) {
      this.#sendResponse({
        error: {
          code: RpcErrorCode.ServerError,
          message: `Init failed: ${error instanceof Error ? error.message : String(error)}`,
        },
        id,
        jsonrpc: "2.0",
      });
    }
  }

  async #initializeEngine(): Promise<void> {
    this.dispose();
    captureHostXMLHttpRequest();

    this.#mp = await loadMicroPython({
      heapsize:
        this.#config.memoryLimit > 0 ? this.#config.memoryLimit : undefined,
      stderr: (text: string) => {
        this.#onNotification(EngineMethod.Output, {
          data: text,
          type: "stderr",
        } satisfies MicropythonOutputPayload);
      },
      stdout: (text: string) => {
        this.#onNotification(EngineMethod.Output, {
          data: text,
          type: "stdout",
        } satisfies MicropythonOutputPayload);
      },
      url: resolvedWasmUrl,
    });

    const sensitiveGlobals = [
      "indexedDB",
      "localStorage",
      "Worker",
      "SharedWorker",
      "WebSocket",
      "fetch",
      "XMLHttpRequest",
      "importScripts",
      "document",
    ];
    for (const key of sensitiveGlobals) {
      if (!(key in globalThis)) {
        continue;
      }
      try {
        const deleted = delete (globalThis as Record<string, unknown>)[key];
        if (deleted && !(key in globalThis)) {
          continue;
        }
      } catch {
        // non-configurable — fall through to defineProperty
      }
      try {
        Object.defineProperty(globalThis, key, {
          configurable: false,
          enumerable: false,
          value: undefined,
          writable: false,
        });
      } catch {
        // Already non-configurable from a prior init cycle
      }
    }

    installHttpClient(this.#mp);
  }

  #handleRun(id: string | number | null, params?: unknown): void {
    if (!this.#mp) {
      this.#sendResponse({
        error: {
          code: RpcErrorCode.ServerError,
          message: "Engine not initialized",
        },
        id,
        jsonrpc: "2.0",
      });
      return;
    }

    const payload = params as { code?: string } | undefined;
    const code = payload?.code ?? "";

    try {
      this.#mp.runPython(code);

      this.#sendResponse({
        id,
        jsonrpc: "2.0",
        result: { executed: true, value: "undefined" },
      });
    } catch (error) {
      this.#sendResponse({
        error: {
          code: RpcErrorCode.InternalError,
          message: `Execution failed: ${error instanceof Error ? error.message : String(error)}`,
        },
        id,
        jsonrpc: "2.0",
      });
    }
  }

  async #handleReset(id: string | number | null): Promise<void> {
    if (!this.#mp) {
      this.#sendResponse({
        error: {
          code: RpcErrorCode.ServerError,
          message: "Engine not initialized",
        },
        id,
        jsonrpc: "2.0",
      });
      return;
    }

    try {
      await this.#initializeEngine();

      this.#sendResponse({
        id,
        jsonrpc: "2.0",
        result: { reset: true },
      });
    } catch (error) {
      this.#sendResponse({
        error: {
          code: RpcErrorCode.ServerError,
          message: `Reset failed: ${error instanceof Error ? error.message : String(error)}`,
        },
        id,
        jsonrpc: "2.0",
      });
    }
  }
}

export const createMicropythonWorker: EngineWorkerFactory<
  MicropythonOutputPayload
> = () =>
  new Worker(new URL("../worker/micropython-worker.mjs", import.meta.url), {
    type: "module",
  });

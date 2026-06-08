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
import { installHttpClient } from "./http-client.ts";
import { defaultCapabilities, type MicropythonEngineConfig } from "./types.ts";

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
  readonly id = "micropython";
  #config: Required<MicropythonEngineConfig>;
  #mp: MicroPythonInstance | null = null;
  #sendResponse: ResponseSender;
  #onNotification: NotificationHandler;

  constructor(config: MicropythonEngineConfig = {}) {
    this.#config = {
      memoryLimit: config.memoryLimit ?? 1024 * 1024 * 50,
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

      this.#mp = await loadMicroPython({
        url: resolvedWasmUrl,
        stdout: (text: string) => {
          this.#onNotification(EngineMethod.Output, {
            type: "log",
            data: text,
          });
        },
        stderr: (text: string) => {
          this.#onNotification(EngineMethod.Output, {
            type: "error",
            data: text,
          });
        },
      });

      installHttpClient(this.#mp);

      this.#sendResponse({
        jsonrpc: "2.0",
        id,
        result: { id: "micropython", timeout: 30_000, ...defaultCapabilities },
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
    if (!this.#mp) {
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

    const payload = params as { code?: string } | undefined;
    const code = payload?.code ?? "";

    try {
      this.#mp.runPython(code);

      this.#sendResponse({
        jsonrpc: "2.0",
        id,
        result: { executed: true, value: "undefined" },
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

  #handleReset(id: string | number | null): void {
    if (!this.#mp) {
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
}

export const createMicropythonWorker = () =>
  new Worker(new URL("../worker/micropython-worker.mjs", import.meta.url), {
    type: "module",
  });

/**
 * JSON-RPC 2.0 base types.
 * Minimal contract shared by all engines.
 */

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest<T = unknown> {
  id: JsonRpcId;
  jsonrpc: "2.0";
  method: string;
  params?: T;
}

export interface JsonRpcNotification<T = unknown> {
  jsonrpc: "2.0";
  method: string;
  params?: T;
}

export interface JsonRpcOkResponse<T = unknown> {
  id: JsonRpcId;
  jsonrpc: "2.0";
  result: T;
}

export interface JsonRpcFailResponse {
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: JsonRpcId;
  jsonrpc: "2.0";
}

export type JsonRpcResponse<T = unknown> =
  | JsonRpcOkResponse<T>
  | JsonRpcFailResponse;

export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcResponse;

/**
 * Generic output payload sent by engines via ENGINE.OUTPUT notifications.
 * The `type` field is engine-defined, allowing arbitrary output categories
 * (e.g., "log", "warn", "table", "debug"). The consuming application
 * decides how to render each type or falls back to plain text.
 */
export interface EngineOutputPayload {
  data?: unknown;
  type: string;
}

/**
 * Payload sent by the engine when it needs user input (e.g., Python's input()).
 * Delivered as the `params` of an ENGINE.INPUT_REQUEST JSON-RPC request.
 */
export interface EngineInputRequestParams {
  /** Prompt string shown to the user. */
  prompt: string;
}

/**
 * Result sent by the host in response to an ENGINE.INPUT_REQUEST.
 * Delivered as the `result` of a standard JsonRpcOkResponse.
 */
export interface EngineInputResult {
  /** Value entered by the user. */
  value: string;
}

/**
 * Parameters sent to the engine in an INIT request.
 * The host passes these to configure engine behavior before execution.
 */
export interface EngineInitParams {
  /** Language the engine should activate for this session. */
  language: string;
  /** Maximum execution time in milliseconds before timeout. */
  timeout?: number;
}

/**
 * Capabilities reported by an engine in its INIT response.
 * Engines self-report what they support; the host uses this
 * to adapt the UI and available operations.
 */
export interface EngineCapabilities {
  /** Engine's self-reported canonical identifier. */
  id: string;
  /** Whether the engine supports mid-execution interruption. */
  isInterruptible: boolean;
  /** Whether the engine retains state between RUN calls. */
  isStateful: boolean;
  /** Languages this engine can execute. */
  supportedLanguages: readonly string[];
  /** Whether the engine may emit ENGINE.INPUT_REQUEST during execution. */
  supportsInput?: boolean;
}

/**
 * Full result returned by the engine after a successful INIT handshake.
 * Combines confirmed runtime config with engine capabilities.
 */
export interface EngineInitResult extends EngineCapabilities {
  /** Confirmed execution timeout in milliseconds. */
  timeout: number;
}

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

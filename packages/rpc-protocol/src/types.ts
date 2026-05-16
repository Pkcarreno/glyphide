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

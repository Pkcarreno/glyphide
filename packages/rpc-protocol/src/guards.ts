/**
 * Runtime type guards for JSON-RPC validation.
 * Pure TypeScript, zero dependencies.
 */

import type {
  JsonRpcFailResponse,
  JsonRpcNotification,
  JsonRpcOkResponse,
  JsonRpcRequest,
  JsonRpcResponse,
} from "./types.ts";

export function isJsonRpcMessage(value: unknown): value is JsonRpcResponse {
  return (
    value !== null &&
    typeof value === "object" &&
    "jsonrpc" in value &&
    (value as Record<string, unknown>).jsonrpc === "2.0"
  );
}

export function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  return (
    isJsonRpcMessage(value) &&
    "method" in value &&
    "id" in value &&
    (value as JsonRpcRequest).id !== undefined
  );
}

export function isJsonRpcNotification(
  value: unknown
): value is JsonRpcNotification {
  return isJsonRpcMessage(value) && "method" in value && !("id" in value);
}

export function isJsonRpcResponse(value: unknown): value is JsonRpcResponse {
  return (
    isJsonRpcMessage(value) &&
    "id" in value &&
    ("result" in value || "error" in value)
  );
}

export function isJsonRpcOk(value: unknown): value is JsonRpcOkResponse {
  return isJsonRpcResponse(value) && "result" in value;
}

export function isJsonRpcFail(value: unknown): value is JsonRpcFailResponse {
  return isJsonRpcResponse(value) && "error" in value;
}

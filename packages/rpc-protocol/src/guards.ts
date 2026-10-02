/**
 * Runtime type guards for JSON-RPC validation.
 * Pure TypeScript, zero dependencies.
 */

import type {
  JsonRpcFailResponse,
  JsonRpcId,
  JsonRpcMessage,
  JsonRpcNotification,
  JsonRpcOkResponse,
  JsonRpcRequest,
  JsonRpcResponse,
} from "./types.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidJsonRpcId(id: unknown): id is JsonRpcId {
  return (
    typeof id === "string" ||
    (typeof id === "number" && Number.isFinite(id)) ||
    id === null
  );
}

function isJsonRpcErrorObject(
  value: unknown
): value is { code: number; message: string; data?: unknown } {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.code === "number" &&
    Number.isInteger(value.code) &&
    typeof value.message === "string"
  );
}

/**
 * Validates whether a value is a valid JSON-RPC 2.0 message object.
 *
 * @param value - Unknown candidate value to validate.
 * @returns True if value is a non-null object with jsonrpc "2.0".
 *
 * @public
 */
export function isJsonRpcMessage(value: unknown): value is JsonRpcMessage {
  return (
    isRecord(value) &&
    Object.hasOwn(value, "jsonrpc") &&
    value.jsonrpc === "2.0"
  );
}

/**
 * Validates whether a value is a valid JSON-RPC 2.0 request.
 *
 * @param value - Unknown candidate value to validate.
 * @returns True if value has a string method and a primitive identifier.
 *
 * @public
 */
export function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (!isRecord(value)) {
    return false;
  }
  const { id, method } = value;
  return (
    isJsonRpcMessage(value) &&
    typeof method === "string" &&
    Object.hasOwn(value, "id") &&
    isValidJsonRpcId(id)
  );
}

/**
 * Validates whether a value is a valid JSON-RPC 2.0 notification.
 *
 * @param value - Unknown candidate value to validate.
 * @returns True if value has a string method and no identifier member.
 *
 * @public
 */
export function isJsonRpcNotification(
  value: unknown
): value is JsonRpcNotification {
  if (!isRecord(value)) {
    return false;
  }
  const { method } = value;
  return (
    isJsonRpcMessage(value) &&
    typeof method === "string" &&
    !Object.hasOwn(value, "id") &&
    !("id" in value)
  );
}

/**
 * Validates whether a successful JSON-RPC 2.0 response was provided.
 *
 * @param value - Unknown candidate value to validate.
 * @returns True if result is present and error is strictly absent.
 *
 * @public
 */
export function isJsonRpcOk(value: unknown): value is JsonRpcOkResponse {
  if (!isRecord(value)) {
    return false;
  }
  const { id } = value;
  return (
    isJsonRpcMessage(value) &&
    Object.hasOwn(value, "id") &&
    isValidJsonRpcId(id) &&
    Object.hasOwn(value, "result") &&
    !Object.hasOwn(value, "error") &&
    !("error" in value)
  );
}

/**
 * Validates whether a failed JSON-RPC 2.0 error response was provided.
 *
 * @param value - Unknown candidate value to validate.
 * @returns True if error is valid and result is strictly absent.
 *
 * @public
 */
export function isJsonRpcFail(value: unknown): value is JsonRpcFailResponse {
  if (!isRecord(value)) {
    return false;
  }
  const { error, id } = value;
  return (
    isJsonRpcMessage(value) &&
    Object.hasOwn(value, "id") &&
    isValidJsonRpcId(id) &&
    Object.hasOwn(value, "error") &&
    !Object.hasOwn(value, "result") &&
    !("result" in value) &&
    isJsonRpcErrorObject(error)
  );
}

/**
 * Validates whether a value is a valid JSON-RPC 2.0 response.
 *
 * @param value - Unknown candidate value to validate.
 * @returns True if value is a valid success or error response.
 *
 * @public
 */
export function isJsonRpcResponse(value: unknown): value is JsonRpcResponse {
  return isJsonRpcOk(value) || isJsonRpcFail(value);
}

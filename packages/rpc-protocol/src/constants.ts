/**
 * Standard method names for the engine protocol.
 */
export const EngineMethod = {
  Init: "INIT",
  InputRequest: "ENGINE.INPUT_REQUEST",
  Interrupt: "ENGINE.INTERRUPT",
  Output: "ENGINE.OUTPUT",
  Reset: "ENGINE.RESET",
  Run: "RUN",
} as const;

export type EngineMethod = (typeof EngineMethod)[keyof typeof EngineMethod];

/**
 * Standard JSON-RPC 2.0 Error Codes.
 * Refer to: https://www.jsonrpc.org/specification#error_object
 */
export const RpcErrorCode = {
  InternalError: -32_603,
  InvalidParams: -32_602,
  InvalidRequest: -32_600,
  MethodNotFound: -32_601,
  ParseError: -32_700,
  // -32000 to -32099 are reserved for implementation-defined server-errors.
  ServerError: -32_000,
} as const;

export type RpcErrorCode = (typeof RpcErrorCode)[keyof typeof RpcErrorCode];

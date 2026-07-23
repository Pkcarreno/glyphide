/**
 * Unit tests for JSON-RPC type guards.
 */

import { describe, expect, it } from "vitest";
import { EngineMethod } from "./constants.ts";
import {
  isJsonRpcFail,
  isJsonRpcMessage,
  isJsonRpcNotification,
  isJsonRpcOk,
  isJsonRpcRequest,
  isJsonRpcResponse,
} from "./guards.ts";

describe("JSON-RPC Type Guards", () => {
  describe("isJsonRpcMessage", () => {
    it("returns true for valid response", () => {
      expect(isJsonRpcMessage({ id: 1, jsonrpc: "2.0", result: "ok" })).toBe(
        true
      );
    });

    it("returns false for null", () => {
      expect(isJsonRpcMessage(null)).toBe(false);
    });

    it("returns false for non-object", () => {
      expect(isJsonRpcMessage("string")).toBe(false);
    });

    it("returns false for wrong version", () => {
      expect(isJsonRpcMessage({ id: 1, jsonrpc: "1.0", result: "ok" })).toBe(
        false
      );
    });
  });

  describe("isJsonRpcRequest", () => {
    it("returns true for valid request", () => {
      const msg = {
        id: 1,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: {},
      };
      expect(isJsonRpcRequest(msg)).toBe(true);
    });

    it("returns false for notification", () => {
      const msg = { jsonrpc: "2.0", method: EngineMethod.Output, params: {} };
      expect(isJsonRpcRequest(msg)).toBe(false);
    });

    it("returns false when id is undefined", () => {
      const msg = { id: undefined, jsonrpc: "2.0", method: EngineMethod.Run };
      expect(isJsonRpcRequest(msg)).toBe(false);
    });

    it("returns true for ENGINE.INPUT_REQUEST", () => {
      const msg = {
        id: 42,
        jsonrpc: "2.0",
        method: EngineMethod.InputRequest,
        params: { prompt: "Name: " },
      };
      expect(isJsonRpcRequest(msg)).toBe(true);
    });
  });

  describe("isJsonRpcNotification", () => {
    it("returns true for valid notification", () => {
      const msg = {
        jsonrpc: "2.0",
        method: EngineMethod.Output,
        params: { content: "test" },
      };
      expect(isJsonRpcNotification(msg)).toBe(true);
    });

    it("returns false for request", () => {
      const msg = { id: 1, jsonrpc: "2.0", method: EngineMethod.Run };
      expect(isJsonRpcNotification(msg)).toBe(false);
    });
  });

  describe("isJsonRpcResponse", () => {
    it("returns true for success response", () => {
      expect(isJsonRpcResponse({ id: 1, jsonrpc: "2.0", result: "ok" })).toBe(
        true
      );
    });

    it("returns true for fail response", () => {
      const msg = {
        error: { code: -1, message: "bad" },
        id: 1,
        jsonrpc: "2.0",
      };
      expect(isJsonRpcResponse(msg)).toBe(true);
    });
  });

  describe("isJsonRpcOk", () => {
    it("returns true for success", () => {
      expect(isJsonRpcOk({ id: 1, jsonrpc: "2.0", result: "ok" })).toBe(true);
    });

    it("returns false for fail", () => {
      const msg = {
        error: { code: -1, message: "err" },
        id: 1,
        jsonrpc: "2.0",
      };
      expect(isJsonRpcOk(msg)).toBe(false);
    });
  });

  describe("isJsonRpcFail", () => {
    it("returns true for fail response", () => {
      const msg = {
        error: { code: -1, message: "fail" },
        id: 1,
        jsonrpc: "2.0",
      };
      expect(isJsonRpcFail(msg)).toBe(true);
    });

    it("returns false for success response", () => {
      const msg = { id: 1, jsonrpc: "2.0", result: "ok" };
      expect(isJsonRpcFail(msg)).toBe(false);
    });
  });
});

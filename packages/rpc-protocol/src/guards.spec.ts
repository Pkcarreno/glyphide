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
    it("returns true for valid object with jsonrpc 2.0", () => {
      expect(isJsonRpcMessage({ jsonrpc: "2.0" })).toBe(true);
      expect(isJsonRpcMessage({ id: 1, jsonrpc: "2.0", result: "ok" })).toBe(
        true
      );
    });

    it("returns false for null and undefined", () => {
      expect(isJsonRpcMessage(null)).toBe(false);
      expect(isJsonRpcMessage(undefined)).toBe(false);
    });

    it("returns false for non-object primitives", () => {
      expect(isJsonRpcMessage("string")).toBe(false);
      expect(isJsonRpcMessage(123)).toBe(false);
      expect(isJsonRpcMessage(true)).toBe(false);
      expect(isJsonRpcMessage(Symbol("rpc"))).toBe(false);
      expect(isJsonRpcMessage(100n)).toBe(false);
    });

    it("returns false for arrays", () => {
      expect(isJsonRpcMessage([])).toBe(false);
      expect(isJsonRpcMessage([{ jsonrpc: "2.0" }])).toBe(false);
    });

    it("returns false for objects without jsonrpc property or wrong version", () => {
      expect(isJsonRpcMessage({})).toBe(false);
      expect(isJsonRpcMessage({ id: 1, result: "ok" })).toBe(false);
      expect(isJsonRpcMessage({ id: 1, jsonrpc: "1.0", result: "ok" })).toBe(
        false
      );
      expect(isJsonRpcMessage({ jsonrpc: 2.0 })).toBe(false);
      expect(isJsonRpcMessage({ jsonrpc: "" })).toBe(false);
    });

    it("returns false for objects inheriting jsonrpc from prototype", () => {
      const proto = { jsonrpc: "2.0" };
      const child = Object.create(proto);
      expect(isJsonRpcMessage(child)).toBe(false);
    });
  });

  describe("isJsonRpcRequest", () => {
    it("returns true for valid request with number id", () => {
      const msg = {
        id: 1,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "1 + 1" },
      };
      expect(isJsonRpcRequest(msg)).toBe(true);
    });

    it("returns true for valid request with 0 or negative number id", () => {
      expect(
        isJsonRpcRequest({ id: 0, jsonrpc: "2.0", method: EngineMethod.Run })
      ).toBe(true);
      expect(
        isJsonRpcRequest({ id: -1, jsonrpc: "2.0", method: EngineMethod.Run })
      ).toBe(true);
    });

    it("returns true for valid request with string id", () => {
      const msg = {
        id: "req-abc-123",
        jsonrpc: "2.0",
        method: EngineMethod.Run,
      };
      expect(isJsonRpcRequest(msg)).toBe(true);
    });

    it("returns true for valid request with null id", () => {
      const msg = {
        id: null,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
      };
      expect(isJsonRpcRequest(msg)).toBe(true);
    });

    it("returns false when method is missing or not a string", () => {
      expect(isJsonRpcRequest({ id: 1, jsonrpc: "2.0" })).toBe(false);
      expect(isJsonRpcRequest({ id: 1, jsonrpc: "2.0", method: 123 })).toBe(
        false
      );
      expect(isJsonRpcRequest({ id: 1, jsonrpc: "2.0", method: null })).toBe(
        false
      );
      expect(isJsonRpcRequest({ id: 1, jsonrpc: "2.0", method: {} })).toBe(
        false
      );
      expect(isJsonRpcRequest({ id: 1, jsonrpc: "2.0", method: true })).toBe(
        false
      );
    });

    it("returns false when id is missing or explicitly undefined", () => {
      expect(
        isJsonRpcRequest({ jsonrpc: "2.0", method: EngineMethod.Run })
      ).toBe(false);
      expect(
        isJsonRpcRequest({
          id: undefined,
          jsonrpc: "2.0",
          method: EngineMethod.Run,
        })
      ).toBe(false);
    });

    it("returns false when id is a non-primitive or non-finite number", () => {
      expect(
        isJsonRpcRequest({ id: {}, jsonrpc: "2.0", method: EngineMethod.Run })
      ).toBe(false);
      expect(
        isJsonRpcRequest({ id: [], jsonrpc: "2.0", method: EngineMethod.Run })
      ).toBe(false);
      expect(
        isJsonRpcRequest({
          id: true,
          jsonrpc: "2.0",
          method: EngineMethod.Run,
        })
      ).toBe(false);
      expect(
        isJsonRpcRequest({
          id: false,
          jsonrpc: "2.0",
          method: EngineMethod.Run,
        })
      ).toBe(false);
      expect(
        isJsonRpcRequest({
          id: Number.NaN,
          jsonrpc: "2.0",
          method: EngineMethod.Run,
        })
      ).toBe(false);
      expect(
        isJsonRpcRequest({
          id: Number.POSITIVE_INFINITY,
          jsonrpc: "2.0",
          method: EngineMethod.Run,
        })
      ).toBe(false);
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

    it("returns false when method is missing or not a string", () => {
      expect(isJsonRpcNotification({ jsonrpc: "2.0" })).toBe(false);
      expect(isJsonRpcNotification({ jsonrpc: "2.0", method: 42 })).toBe(false);
      expect(isJsonRpcNotification({ jsonrpc: "2.0", method: null })).toBe(
        false
      );
      expect(isJsonRpcNotification({ jsonrpc: "2.0", method: {} })).toBe(false);
    });

    it("returns false when id property key exists, even if undefined", () => {
      expect(
        isJsonRpcNotification({
          id: undefined,
          jsonrpc: "2.0",
          method: EngineMethod.Output,
        })
      ).toBe(false);
      expect(
        isJsonRpcNotification({
          id: 1,
          jsonrpc: "2.0",
          method: EngineMethod.Output,
        })
      ).toBe(false);
      expect(
        isJsonRpcNotification({
          id: null,
          jsonrpc: "2.0",
          method: EngineMethod.Output,
        })
      ).toBe(false);
    });

    it("returns false when id is inherited from prototype", () => {
      const proto = { id: 1 };
      const child = Object.create(proto);
      child.jsonrpc = "2.0";
      child.method = EngineMethod.Output;
      expect(isJsonRpcNotification(child)).toBe(false);
    });
  });

  describe("isJsonRpcResponse", () => {
    it("returns true for valid ok response", () => {
      expect(isJsonRpcResponse({ id: 1, jsonrpc: "2.0", result: "ok" })).toBe(
        true
      );
    });

    it("returns true for valid fail response", () => {
      const msg = {
        error: { code: -32_600, message: "Invalid Request" },
        id: 1,
        jsonrpc: "2.0",
      };
      expect(isJsonRpcResponse(msg)).toBe(true);
    });

    it("returns false when payload contains both result and error members simultaneously", () => {
      const dualMsg = {
        error: { code: -32_600, message: "fail" },
        id: 1,
        jsonrpc: "2.0",
        result: "ok",
      };
      expect(isJsonRpcResponse(dualMsg)).toBe(false);

      const dualWithUndefinedError = {
        error: undefined,
        id: 1,
        jsonrpc: "2.0",
        result: "ok",
      };
      expect(isJsonRpcResponse(dualWithUndefinedError)).toBe(false);

      const dualWithUndefinedResult = {
        error: { code: -32_600, message: "fail" },
        id: 1,
        jsonrpc: "2.0",
        result: undefined,
      };
      expect(isJsonRpcResponse(dualWithUndefinedResult)).toBe(false);
    });

    it("returns false when both result and error are missing", () => {
      expect(isJsonRpcResponse({ id: 1, jsonrpc: "2.0" })).toBe(false);
    });

    it("returns false when id is invalid or missing", () => {
      expect(
        isJsonRpcResponse({
          id: {},
          jsonrpc: "2.0",
          result: "ok",
        })
      ).toBe(false);
      expect(
        isJsonRpcResponse({
          jsonrpc: "2.0",
          result: "ok",
        })
      ).toBe(false);
    });

    it("returns false when error object is malformed", () => {
      expect(
        isJsonRpcResponse({
          error: "plain string error",
          id: 1,
          jsonrpc: "2.0",
        })
      ).toBe(false);
    });
  });

  describe("isJsonRpcOk", () => {
    it("returns true for valid success response with various result types", () => {
      expect(isJsonRpcOk({ id: 1, jsonrpc: "2.0", result: "ok" })).toBe(true);
      expect(isJsonRpcOk({ id: "req-1", jsonrpc: "2.0", result: 0 })).toBe(
        true
      );
      expect(isJsonRpcOk({ id: null, jsonrpc: "2.0", result: false })).toBe(
        true
      );
      expect(isJsonRpcOk({ id: 1, jsonrpc: "2.0", result: null })).toBe(true);
      expect(isJsonRpcOk({ id: 1, jsonrpc: "2.0", result: {} })).toBe(true);
      expect(isJsonRpcOk({ id: 1, jsonrpc: "2.0", result: [] })).toBe(true);
      expect(isJsonRpcOk({ id: 1, jsonrpc: "2.0", result: undefined })).toBe(
        true
      );
    });

    it("returns false when payload contains both result and error members", () => {
      expect(
        isJsonRpcOk({
          error: { code: -1, message: "err" },
          id: 1,
          jsonrpc: "2.0",
          result: "ok",
        })
      ).toBe(false);

      expect(
        isJsonRpcOk({
          error: undefined,
          id: 1,
          jsonrpc: "2.0",
          result: "ok",
        })
      ).toBe(false);

      expect(
        isJsonRpcOk({
          error: null,
          id: 1,
          jsonrpc: "2.0",
          result: "ok",
        })
      ).toBe(false);
    });

    it("returns false when result member is absent", () => {
      expect(
        isJsonRpcOk({
          error: { code: -1, message: "err" },
          id: 1,
          jsonrpc: "2.0",
        })
      ).toBe(false);
      expect(isJsonRpcOk({ id: 1, jsonrpc: "2.0" })).toBe(false);
    });

    it("returns false when id is missing or invalid", () => {
      expect(isJsonRpcOk({ jsonrpc: "2.0", result: "ok" })).toBe(false);
      expect(isJsonRpcOk({ id: true, jsonrpc: "2.0", result: "ok" })).toBe(
        false
      );
      expect(isJsonRpcOk({ id: {}, jsonrpc: "2.0", result: "ok" })).toBe(false);
    });
  });

  describe("isJsonRpcFail", () => {
    it("returns true for valid fail response", () => {
      const msg = {
        error: { code: -32_600, message: "fail" },
        id: 1,
        jsonrpc: "2.0",
      };
      expect(isJsonRpcFail(msg)).toBe(true);
    });

    it("returns true for valid fail response with data member and null id", () => {
      const msg = {
        error: {
          code: -32_700,
          data: { detail: "syntax" },
          message: "Parse error",
        },
        id: null,
        jsonrpc: "2.0",
      };
      expect(isJsonRpcFail(msg)).toBe(true);
    });

    it("returns false when payload contains both error and result members", () => {
      expect(
        isJsonRpcFail({
          error: { code: -1, message: "fail" },
          id: 1,
          jsonrpc: "2.0",
          result: "ok",
        })
      ).toBe(false);

      expect(
        isJsonRpcFail({
          error: { code: -1, message: "fail" },
          id: 1,
          jsonrpc: "2.0",
          result: undefined,
        })
      ).toBe(false);

      expect(
        isJsonRpcFail({
          error: { code: -1, message: "fail" },
          id: 1,
          jsonrpc: "2.0",
          result: null,
        })
      ).toBe(false);
    });

    it("returns false when error is absent or not an object", () => {
      expect(isJsonRpcFail({ id: 1, jsonrpc: "2.0", result: "ok" })).toBe(
        false
      );
      expect(
        isJsonRpcFail({
          error: "error message string",
          id: 1,
          jsonrpc: "2.0",
        })
      ).toBe(false);
      expect(
        isJsonRpcFail({
          error: null,
          id: 1,
          jsonrpc: "2.0",
        })
      ).toBe(false);
      expect(
        isJsonRpcFail({
          error: 12_345,
          id: 1,
          jsonrpc: "2.0",
        })
      ).toBe(false);
      expect(
        isJsonRpcFail({
          error: [],
          id: 1,
          jsonrpc: "2.0",
        })
      ).toBe(false);
      expect(
        isJsonRpcFail({
          error: true,
          id: 1,
          jsonrpc: "2.0",
        })
      ).toBe(false);
    });

    it("returns false when error.code is missing or not an integer", () => {
      expect(
        isJsonRpcFail({
          error: { message: "no code" },
          id: 1,
          jsonrpc: "2.0",
        })
      ).toBe(false);
      expect(
        isJsonRpcFail({
          error: { code: "1", message: "string code" },
          id: 1,
          jsonrpc: "2.0",
        })
      ).toBe(false);
      expect(
        isJsonRpcFail({
          error: { code: 1.5, message: "float code" },
          id: 1,
          jsonrpc: "2.0",
        })
      ).toBe(false);
      expect(
        isJsonRpcFail({
          error: { code: Number.NaN, message: "NaN code" },
          id: 1,
          jsonrpc: "2.0",
        })
      ).toBe(false);
      expect(
        isJsonRpcFail({
          error: { code: Number.POSITIVE_INFINITY, message: "Infinity code" },
          id: 1,
          jsonrpc: "2.0",
        })
      ).toBe(false);
    });

    it("returns false when error.message is missing or not a string", () => {
      expect(
        isJsonRpcFail({
          error: { code: -32_600 },
          id: 1,
          jsonrpc: "2.0",
        })
      ).toBe(false);
      expect(
        isJsonRpcFail({
          error: { code: -32_600, message: 123 },
          id: 1,
          jsonrpc: "2.0",
        })
      ).toBe(false);
      expect(
        isJsonRpcFail({
          error: { code: -32_600, message: null },
          id: 1,
          jsonrpc: "2.0",
        })
      ).toBe(false);
      expect(
        isJsonRpcFail({
          error: { code: -32_600, message: {} },
          id: 1,
          jsonrpc: "2.0",
        })
      ).toBe(false);
    });

    it("returns false when id is missing or invalid", () => {
      expect(
        isJsonRpcFail({
          error: { code: -32_600, message: "fail" },
          jsonrpc: "2.0",
        })
      ).toBe(false);
      expect(
        isJsonRpcFail({
          error: { code: -32_600, message: "fail" },
          id: true,
          jsonrpc: "2.0",
        })
      ).toBe(false);
      expect(
        isJsonRpcFail({
          error: { code: -32_600, message: "fail" },
          id: {},
          jsonrpc: "2.0",
        })
      ).toBe(false);
    });
  });
});

/**
 * Cross-package JSON-RPC 2.0 protocol conformance test suite.
 * Validates that orchestrator rejects malformed engine envelopes, dual result/error
 * payloads, and invalid IDs with strict protocol compliance.
 */

import { EngineOrchestrator } from "@glyphide/orchestrator";
import type {
  RpcTransport,
  RpcTransportMessageHandler,
} from "@glyphide/orchestrator/transport";
import { EngineMethod } from "@glyphide/rpc-protocol/constants";
import type { JsonRpcRequest } from "@glyphide/rpc-protocol/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface TestTransportSeam extends RpcTransport {
  deliverMessage: (data: unknown) => void;
  getDispatchedRequests: () => JsonRpcRequest[];
}

function createTestTransport(): TestTransportSeam {
  let messageHandler: RpcTransportMessageHandler | null = null;
  const dispatchedRequests: JsonRpcRequest[] = [];

  return {
    deliverMessage(data: unknown): void {
      messageHandler?.({ data });
    },
    getDispatchedRequests(): JsonRpcRequest[] {
      return dispatchedRequests;
    },
    get onMessage(): RpcTransportMessageHandler | null {
      return messageHandler;
    },
    set onMessage(handler: RpcTransportMessageHandler | null) {
      messageHandler = handler;
    },
    postMessage(message: unknown): void {
      dispatchedRequests.push(message as JsonRpcRequest);
    },
    terminate: vi.fn(),
  };
}

describe("JSON-RPC 2.0 Protocol Conformance & Engine Robustness", () => {
  let transport: TestTransportSeam;
  let orchestrator: EngineOrchestrator;

  beforeEach(() => {
    transport = createTestTransport();
    orchestrator = new EngineOrchestrator({
      createTransport: () => transport,
    });
  });

  afterEach(() => {
    orchestrator.terminate();
  });

  describe("dual result and error rejection", () => {
    it("rejects engine init response containing dual result and error members", async () => {
      const initPromise = orchestrator.init();

      const [dispatchedRequest] = transport.getDispatchedRequests();
      expect(dispatchedRequest).toBeDefined();
      expect(dispatchedRequest.method).toBe(EngineMethod.Init);

      // Adversarial payload violating JSON-RPC 2.0 Section 5: both result and error members
      transport.deliverMessage({
        error: {
          code: -32_603,
          message: "Conflicting internal error",
        },
        id: dispatchedRequest.id,
        jsonrpc: "2.0",
        result: {
          id: "mock",
          isInterruptible: true,
          isStateful: true,
          supportedLanguages: ["javascript"],
          timeout: 30_000,
        },
      });

      await expect(initPromise).rejects.toThrow(
        "Init failed: Protocol error: malformed response envelope"
      );
    });

    it("rejects engine run response containing dual result and error members", async () => {
      // First initialize cleanly
      const initPromise = orchestrator.init();
      const [initRequest] = transport.getDispatchedRequests();
      transport.deliverMessage({
        id: initRequest.id,
        jsonrpc: "2.0",
        result: {
          id: "mock",
          isInterruptible: true,
          isStateful: true,
          supportedLanguages: ["javascript"],
          timeout: 30_000,
        },
      });
      await initPromise;

      // Now execute code and return dual payload
      const runPromise = orchestrator.run("const answer = 42;");
      const [, runRequest] = transport.getDispatchedRequests();
      expect(runRequest.method).toBe(EngineMethod.Run);

      transport.deliverMessage({
        error: {
          code: -32_603,
          message: "Engine crashed during evaluation",
        },
        id: runRequest.id,
        jsonrpc: "2.0",
        result: { executed: true },
      });

      await expect(runPromise).rejects.toThrow(
        "Execution failed: Protocol error: malformed response envelope"
      );
    });

    it("rejects engine reset response containing dual result and error members", async () => {
      const initPromise = orchestrator.init();
      const [initRequest] = transport.getDispatchedRequests();
      transport.deliverMessage({
        id: initRequest.id,
        jsonrpc: "2.0",
        result: {
          id: "mock",
          isInterruptible: true,
          isStateful: true,
          supportedLanguages: ["javascript"],
          timeout: 30_000,
        },
      });
      await initPromise;

      const resetPromise = orchestrator.reset();
      const [, resetRequest] = transport.getDispatchedRequests();
      expect(resetRequest.method).toBe(EngineMethod.Reset);

      transport.deliverMessage({
        error: {
          code: -32_603,
          message: "Reset failure",
        },
        id: resetRequest.id,
        jsonrpc: "2.0",
        result: { reset: true },
      });

      await expect(resetPromise).rejects.toThrow(
        "Reset failed: Protocol error: malformed response envelope"
      );
    });
  });

  describe("invalid and non-primitive identifier handling", () => {
    it("ignores responses with non-primitive object identifiers without resolving pending request", async () => {
      const initPromise = orchestrator.init();
      const [initRequest] = transport.getDispatchedRequests();

      // Send response with non-primitive object as ID
      transport.deliverMessage({
        id: { nestedId: 1 },
        jsonrpc: "2.0",
        result: {
          id: "mock",
          isInterruptible: true,
          isStateful: true,
          supportedLanguages: ["javascript"],
          timeout: 30_000,
        },
      });

      // Pending promise remains pending; deliver legitimate response to confirm clean recovery
      transport.deliverMessage({
        id: initRequest.id,
        jsonrpc: "2.0",
        result: {
          id: "mock",
          isInterruptible: true,
          isStateful: true,
          supportedLanguages: ["javascript"],
          timeout: 30_000,
        },
      });

      const result = await initPromise;
      expect(result.id).toBe("mock");
    });

    it("ignores responses with non-primitive array identifiers", async () => {
      const initPromise = orchestrator.init();
      const [initRequest] = transport.getDispatchedRequests();

      transport.deliverMessage({
        id: [initRequest.id],
        jsonrpc: "2.0",
        result: {
          id: "mock",
          isInterruptible: true,
          isStateful: true,
          supportedLanguages: ["javascript"],
          timeout: 30_000,
        },
      });

      transport.deliverMessage({
        id: initRequest.id,
        jsonrpc: "2.0",
        result: {
          id: "mock",
          isInterruptible: true,
          isStateful: true,
          supportedLanguages: ["javascript"],
          timeout: 30_000,
        },
      });

      const result = await initPromise;
      expect(result.id).toBe("mock");
    });

    it("ignores responses with boolean identifiers", async () => {
      const initPromise = orchestrator.init();
      const [initRequest] = transport.getDispatchedRequests();

      transport.deliverMessage({
        id: true,
        jsonrpc: "2.0",
        result: {
          id: "mock",
          isInterruptible: true,
          isStateful: true,
          supportedLanguages: ["javascript"],
          timeout: 30_000,
        },
      });

      transport.deliverMessage({
        id: initRequest.id,
        jsonrpc: "2.0",
        result: {
          id: "mock",
          isInterruptible: true,
          isStateful: true,
          supportedLanguages: ["javascript"],
          timeout: 30_000,
        },
      });

      const result = await initPromise;
      expect(result.id).toBe("mock");
    });

    it("handles unsolicited responses with non-existent request IDs gracefully", async () => {
      const initPromise = orchestrator.init();
      const [initRequest] = transport.getDispatchedRequests();

      // Deliver unsolicited response for non-existent ID
      transport.deliverMessage({
        id: 999_999,
        jsonrpc: "2.0",
        result: { unprompted: true },
      });

      // Valid response for actual request succeeds without disruption
      transport.deliverMessage({
        id: initRequest.id,
        jsonrpc: "2.0",
        result: {
          id: "mock",
          isInterruptible: true,
          isStateful: true,
          supportedLanguages: ["javascript"],
          timeout: 30_000,
        },
      });

      const result = await initPromise;
      expect(result.id).toBe("mock");
    });
  });

  describe("malformed error response handling", () => {
    it("rejects responses where error member is a raw string instead of an object", async () => {
      const initPromise = orchestrator.init();
      const [initRequest] = transport.getDispatchedRequests();

      transport.deliverMessage({
        error: "fatal runtime crash",
        id: initRequest.id,
        jsonrpc: "2.0",
      });

      await expect(initPromise).rejects.toThrow(
        "Init failed: Protocol error: malformed response envelope"
      );
    });

    it("rejects responses where error code is not an integer number", async () => {
      const initPromise = orchestrator.init();
      const [initRequest] = transport.getDispatchedRequests();

      transport.deliverMessage({
        error: {
          code: "NOT_AN_INTEGER",
          message: "Invalid code type",
        },
        id: initRequest.id,
        jsonrpc: "2.0",
      });

      await expect(initPromise).rejects.toThrow(
        "Init failed: Protocol error: malformed response envelope"
      );
    });

    it("rejects responses where error message is missing", async () => {
      const initPromise = orchestrator.init();
      const [initRequest] = transport.getDispatchedRequests();

      transport.deliverMessage({
        error: {
          code: -32_603,
        },
        id: initRequest.id,
        jsonrpc: "2.0",
      });

      await expect(initPromise).rejects.toThrow(
        "Init failed: Protocol error: malformed response envelope"
      );
    });
  });

  describe("notification conformance", () => {
    it("drops notifications containing an identifier member to adhere to JSON-RPC 2.0 Section 4.1", async () => {
      const onOutputSpy = vi.fn();
      const notifyingOrchestrator = new EngineOrchestrator({
        createTransport: () => transport,
        events: { onOutput: onOutputSpy },
      });

      const initPromise = notifyingOrchestrator.init();
      const [initRequest] = transport.getDispatchedRequests();
      transport.deliverMessage({
        id: initRequest.id,
        jsonrpc: "2.0",
        result: {
          id: "mock",
          isInterruptible: true,
          isStateful: true,
          supportedLanguages: ["javascript"],
          timeout: 30_000,
        },
      });
      await initPromise;

      // Deliver illegal notification with an id property
      transport.deliverMessage({
        id: 42,
        jsonrpc: "2.0",
        method: EngineMethod.Output,
        params: { data: "illegal notification with id", type: "log" },
      });

      expect(onOutputSpy).not.toHaveBeenCalled();

      // Deliver legal notification without id property
      transport.deliverMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Output,
        params: { data: "valid notification", type: "log" },
      });

      expect(onOutputSpy).toHaveBeenCalledWith({
        data: "valid notification",
        type: "log",
      });

      notifyingOrchestrator.terminate();
    });
  });

  describe("input request parameter inspection", () => {
    it("safely handles input requests with non-object params without throwing", async () => {
      let promptReceived: string | null = null;
      let replyHandler: ((value: string) => void) | undefined;

      const inputOrchestrator = new EngineOrchestrator({
        createTransport: () => transport,
        events: {
          onInputRequest: (prompt, reply) => {
            promptReceived = prompt;
            replyHandler = reply;
          },
        },
      });

      const initPromise = inputOrchestrator.init();
      const [initRequest] = transport.getDispatchedRequests();
      transport.deliverMessage({
        id: initRequest.id,
        jsonrpc: "2.0",
        result: {
          id: "mock",
          isInterruptible: true,
          isStateful: true,
          supportedLanguages: ["javascript"],
          timeout: 30_000,
        },
      });
      await initPromise;

      // Emit input request with non-object params
      transport.deliverMessage({
        id: "input-req-1",
        jsonrpc: "2.0",
        method: EngineMethod.InputRequest,
        params: "invalid params string",
      });

      expect(promptReceived).toBe("");
      expect(replyHandler).toBeDefined();

      // Reply and check that orchestrator dispatched response
      const dispatchReply = replyHandler as
        | ((value: string) => void)
        | undefined;
      dispatchReply?.("user response");

      const responses = transport.getDispatchedRequests();
      const matchingReply = responses.find((r) => r.id === "input-req-1");
      expect(matchingReply).toBeDefined();
      expect(
        (matchingReply as unknown as { result: { value: string } }).result.value
      ).toBe("user response");

      inputOrchestrator.terminate();
    });

    it("auto-replies with empty string when onInputRequest event handler is omitted", async () => {
      const inputOrchestrator = new EngineOrchestrator({
        createTransport: () => transport,
      });

      const initPromise = inputOrchestrator.init();
      const [initRequest] = transport.getDispatchedRequests();
      transport.deliverMessage({
        id: initRequest.id,
        jsonrpc: "2.0",
        result: {
          id: "mock",
          isInterruptible: true,
          isStateful: true,
          supportedLanguages: ["javascript"],
          timeout: 30_000,
        },
      });
      await initPromise;

      transport.deliverMessage({
        id: "input-req-auto",
        jsonrpc: "2.0",
        method: EngineMethod.InputRequest,
        params: { prompt: "Enter value: " },
      });

      const responses = transport.getDispatchedRequests();
      const matchingReply = responses.find((r) => r.id === "input-req-auto");
      expect(matchingReply).toBeDefined();
      expect(
        (matchingReply as unknown as { result: { value: string } }).result.value
      ).toBe("");

      inputOrchestrator.terminate();
    });
  });
});

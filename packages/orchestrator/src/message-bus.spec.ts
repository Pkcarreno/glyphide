import type {
  JsonRpcFailResponse,
  JsonRpcNotification,
  JsonRpcOkResponse,
  JsonRpcRequest,
} from "@glyphide/rpc-protocol/types";
import { describe, expect, it, vi } from "vitest";
import { MessageBus } from "./message-bus.ts";
import type { RpcTransport } from "./transport.ts";

describe("MessageBus", () => {
  function createFakeTransport(): {
    emit: (data: unknown) => void;
    transport: RpcTransport;
  } {
    const transport: RpcTransport = {
      onMessage: null,
      postMessage: vi.fn(),
      terminate: vi.fn(),
    };

    return {
      emit: (data: unknown) => {
        transport.onMessage?.({ data });
      },
      transport,
    };
  }

  it("subscribes to transport onMessage during construction", () => {
    const { transport } = createFakeTransport();
    const onMessage = vi.fn();
    const bus = new MessageBus(transport, onMessage);

    expect(bus).toBeDefined();
    expect(transport.onMessage).toBeTypeOf("function");
  });

  it("sends a JSON-RPC 2.0 request through the transport", () => {
    const { transport } = createFakeTransport();
    const bus = new MessageBus(transport, vi.fn());

    bus.sendRequest({ method: "engine.init", params: { timeout: 5000 } }, 1);

    expect(transport.postMessage).toHaveBeenCalledWith({
      id: 1,
      jsonrpc: "2.0",
      method: "engine.init",
      params: { timeout: 5000 },
    });
  });

  it("sends a JSON-RPC 2.0 notification through the transport", () => {
    const { transport } = createFakeTransport();
    const bus = new MessageBus(transport, vi.fn());

    bus.sendNotification({ method: "engine.interrupt" });

    expect(transport.postMessage).toHaveBeenCalledWith({
      jsonrpc: "2.0",
      method: "engine.interrupt",
      params: undefined,
    });
  });

  it("sends a JSON-RPC 2.0 response through the transport", () => {
    const { transport } = createFakeTransport();
    const bus = new MessageBus(transport, vi.fn());

    bus.sendResponse("req-1", { value: "user input" });

    expect(transport.postMessage).toHaveBeenCalledWith({
      id: "req-1",
      jsonrpc: "2.0",
      result: { value: "user input" },
    });
  });

  it("routes incoming ok response to the handler", () => {
    const { emit, transport } = createFakeTransport();
    const onMessage = vi.fn();
    const _bus = new MessageBus(transport, onMessage);

    const okResponse: JsonRpcOkResponse = {
      id: 1,
      jsonrpc: "2.0",
      result: { status: "ready" },
    };
    emit(okResponse);

    expect(onMessage).toHaveBeenCalledWith(okResponse);
  });

  it("routes incoming error response to the handler", () => {
    const { emit, transport } = createFakeTransport();
    const onMessage = vi.fn();
    const _bus = new MessageBus(transport, onMessage);

    const failResponse: JsonRpcFailResponse = {
      error: { code: -32_603, message: "Execution error" },
      id: 1,
      jsonrpc: "2.0",
    };
    emit(failResponse);

    expect(onMessage).toHaveBeenCalledWith(failResponse);
  });

  it("routes incoming engine request to the handler", () => {
    const { emit, transport } = createFakeTransport();
    const onMessage = vi.fn();
    const _bus = new MessageBus(transport, onMessage);

    const request: JsonRpcRequest = {
      id: "input-1",
      jsonrpc: "2.0",
      method: "engine.input_request",
      params: { prompt: "Enter:" },
    };
    emit(request);

    expect(onMessage).toHaveBeenCalledWith(request);
  });

  it("routes incoming notification to the handler", () => {
    const { emit, transport } = createFakeTransport();
    const onMessage = vi.fn();
    const _bus = new MessageBus(transport, onMessage);

    const notification: JsonRpcNotification = {
      jsonrpc: "2.0",
      method: "engine.output",
      params: { data: "output text", type: "log" },
    };
    emit(notification);

    expect(onMessage).toHaveBeenCalledWith(notification);
  });

  it("filters out non-RPC messages at the transport seam", () => {
    const { emit, transport } = createFakeTransport();
    const onMessage = vi.fn();
    const _bus = new MessageBus(transport, onMessage);

    emit({ type: "worker-ready" });
    emit("plain-text-message");
    emit(12_345);
    emit(null);
    emit(undefined);
    emit({ foo: "bar" });
    emit([]);

    expect(onMessage).not.toHaveBeenCalled();
  });

  it("filters out notifications and requests failing JSON-RPC 2.0 validation", () => {
    const { emit, transport } = createFakeTransport();
    const onMessage = vi.fn();
    const _bus = new MessageBus(transport, onMessage);

    // Missing jsonrpc member
    emit({ method: "engine.output", params: { data: "test" } });
    emit({ id: 1, method: "engine.init" });

    // Invalid jsonrpc version
    emit({ jsonrpc: "1.0", method: "engine.output" });
    emit({ id: 1, jsonrpc: "1.0", method: "engine.init" });

    // Non-string method
    emit({ jsonrpc: "2.0", method: 123 });

    expect(onMessage).not.toHaveBeenCalled();
  });

  it("routes malformed response envelopes as protocol errors", () => {
    const { emit, transport } = createFakeTransport();
    const onMessage = vi.fn();
    const _bus = new MessageBus(transport, onMessage);

    // Dual result and error
    emit({
      error: { code: -32_600, message: "failed" },
      id: 1,
      jsonrpc: "2.0",
      result: { ready: true },
    });

    expect(onMessage).toHaveBeenCalledWith({
      error: {
        code: -32_600,
        message: "Protocol error: malformed response envelope",
      },
      id: 1,
      jsonrpc: "2.0",
    });

    // Malformed error member (string instead of object)
    emit({
      error: "raw error string",
      id: 2,
      jsonrpc: "2.0",
    });

    expect(onMessage).toHaveBeenCalledWith({
      error: {
        code: -32_600,
        message: "Protocol error: malformed response envelope",
      },
      id: 2,
      jsonrpc: "2.0",
    });
  });

  it("clears onMessage when terminated", () => {
    const { transport } = createFakeTransport();
    const bus = new MessageBus(transport, vi.fn());

    bus.terminate();

    expect(transport.onMessage).toBeNull();
  });
});

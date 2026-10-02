import type {
  JsonRpcFailResponse,
  JsonRpcOkResponse,
} from "@glyphide/rpc-protocol/types";
import { describe, expect, it, vi } from "vitest";
import { MessageBus } from "./message-bus.ts";
import { PromiseRegistry } from "./promise-registry.ts";
import {
  createDirectTransport,
  createWorkerTransport,
  type DirectTransportAdapter,
  type RpcTransport,
  toRpcTransport,
} from "./transport.ts";

describe("WorkerTransport", () => {
  it("forwards postMessage to the underlying worker", () => {
    const mockWorker = {
      onmessage: null as ((ev: MessageEvent) => void) | null,
      postMessage: vi.fn(),
      terminate: vi.fn(),
    } as unknown as Worker;

    const transport = createWorkerTransport(mockWorker);
    transport.postMessage({ hello: "world" });

    expect(mockWorker.postMessage).toHaveBeenCalledWith({ hello: "world" });
  });

  it("routes incoming worker message to onMessage handler", () => {
    let capturedOnMessage: ((ev: MessageEvent) => void) | null = null;
    const mockWorker = {
      set onmessage(handler: ((ev: MessageEvent) => void) | null) {
        capturedOnMessage = handler;
      },
      postMessage: vi.fn(),
      terminate: vi.fn(),
    } as unknown as Worker;

    const transport = createWorkerTransport(mockWorker);
    const onMessageHandler = vi.fn();
    transport.onMessage = onMessageHandler;

    (capturedOnMessage as ((ev: MessageEvent) => void) | null)?.({
      data: { result: "ok" },
    } as MessageEvent);

    expect(onMessageHandler).toHaveBeenCalledWith({ data: { result: "ok" } });
  });

  it("terminates worker and clears onMessage when terminate is called", () => {
    const mockWorker = {
      onmessage: null as ((ev: MessageEvent) => void) | null,
      postMessage: vi.fn(),
      terminate: vi.fn(),
    } as unknown as Worker;

    const transport = createWorkerTransport(mockWorker);
    transport.onMessage = vi.fn();
    transport.terminate();

    expect(mockWorker.terminate).toHaveBeenCalled();
    expect(transport.onMessage).toBeNull();
  });
});

describe("DirectTransport", () => {
  it("forwards postMessage to adapter.handleMessage", async () => {
    const adapter: DirectTransportAdapter = {
      handleMessage: vi.fn(),
      setup: vi.fn(),
    };

    const transport = createDirectTransport(adapter);
    transport.postMessage({ id: 1, jsonrpc: "2.0", method: "init" });
    await Promise.resolve();

    expect(adapter.handleMessage).toHaveBeenCalledWith({
      id: 1,
      jsonrpc: "2.0",
      method: "init",
    });
  });

  it("routes adapter responses to transport.onMessage", async () => {
    let capturedSendResponse!: (response: JsonRpcOkResponse) => void;
    const adapter: DirectTransportAdapter = {
      handleMessage: vi.fn(),
      setup(sendResponse) {
        capturedSendResponse = sendResponse;
      },
    };

    const transport = createDirectTransport(adapter);
    const onMessageHandler = vi.fn();
    transport.onMessage = onMessageHandler;

    capturedSendResponse({ id: 1, jsonrpc: "2.0", result: { ready: true } });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onMessageHandler).toHaveBeenCalledWith({
      data: { id: 1, jsonrpc: "2.0", result: { ready: true } },
    });
  });

  it("routes adapter notifications to transport.onMessage", async () => {
    let capturedOnNotification!: (method: string, params?: unknown) => void;
    const adapter: DirectTransportAdapter = {
      handleMessage: vi.fn(),
      setup(_sendResponse, onNotification) {
        capturedOnNotification = onNotification;
      },
    };

    const transport = createDirectTransport(adapter);
    const onMessageHandler = vi.fn();
    transport.onMessage = onMessageHandler;

    capturedOnNotification("engine.output", { data: "test", type: "log" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onMessageHandler).toHaveBeenCalledWith({
      data: {
        jsonrpc: "2.0",
        method: "engine.output",
        params: { data: "test", type: "log" },
      },
    });
  });

  it("routes adapter input requests to transport.onMessage", async () => {
    let capturedSendRequest!: (
      method: string,
      id: string | number,
      params?: unknown
    ) => void;
    const adapter: DirectTransportAdapter = {
      handleMessage: vi.fn(),
      setup(_sendResponse, _onNotification, sendRequest) {
        if (sendRequest) {
          capturedSendRequest = sendRequest;
        }
      },
    };

    const transport = createDirectTransport(adapter);
    const onMessageHandler = vi.fn();
    transport.onMessage = onMessageHandler;

    capturedSendRequest("engine.input_request", "req-1", { prompt: "Name:" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onMessageHandler).toHaveBeenCalledWith({
      data: {
        id: "req-1",
        jsonrpc: "2.0",
        method: "engine.input_request",
        params: { prompt: "Name:" },
      },
    });
  });

  it("invokes adapter dispose and clears onMessage on terminate", () => {
    const adapter: DirectTransportAdapter = {
      dispose: vi.fn(),
      handleMessage: vi.fn(),
      setup: vi.fn(),
    };

    const transport = createDirectTransport(adapter);
    transport.onMessage = vi.fn();
    transport.terminate();

    expect(adapter.dispose).toHaveBeenCalled();
    expect(transport.onMessage).toBeNull();
  });
});

describe("toRpcTransport", () => {
  it("returns transport as-is if already an RpcTransport", () => {
    const existingTransport: RpcTransport = {
      onMessage: null,
      postMessage: vi.fn(),
    };

    expect(toRpcTransport(existingTransport)).toBe(existingTransport);
  });

  it("wraps worker into WorkerTransport if Worker is provided", () => {
    const mockWorker = {
      onmessage: null,
      postMessage: vi.fn(),
      terminate: vi.fn(),
    } as unknown as Worker;

    const transport = toRpcTransport(mockWorker);
    expect(transport).toBeDefined();
    expect(typeof transport.postMessage).toBe("function");
    expect(transport.onMessage).toBeNull();
  });
});

describe("transport seam promise resolution", () => {
  it("rejects pending promises cleanly with a protocol error when malformed response envelope is received", async () => {
    let capturedSendResponse!: (
      response: JsonRpcOkResponse | JsonRpcFailResponse
    ) => void;
    const adapter: DirectTransportAdapter = {
      handleMessage: vi.fn(),
      setup(sendResponse) {
        capturedSendResponse = sendResponse;
      },
    };

    const registry = new PromiseRegistry();
    const transport = createDirectTransport(adapter);
    const bus = new MessageBus(transport, (message) => {
      if ("error" in message && message.error) {
        registry.reject(message.id, message.error);
      }
    });

    const [promise] = registry.register(1);

    // Send malformed response envelope through transport seam
    capturedSendResponse({
      error: { code: -32_600, message: "fail" },
      id: 1,
      jsonrpc: "2.0",
      result: { invalid: "dual payload" },
    } as unknown as JsonRpcOkResponse);

    await expect(promise).rejects.toEqual({
      code: -32_600,
      message: "Protocol error: malformed response envelope",
    });

    bus.terminate();
    transport.terminate();
  });
});

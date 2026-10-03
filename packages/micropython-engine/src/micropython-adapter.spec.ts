import { EngineMethod } from "@glyphide/rpc-protocol/constants";
import type { JsonRpcRequest } from "@glyphide/rpc-protocol/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MicropythonEngineAdapter } from "./micropython-adapter.ts";

describe("MicropythonEngineAdapter", () => {
  let adapter: MicropythonEngineAdapter;
  let sendResponse: ReturnType<typeof vi.fn>;
  let onNotification: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    adapter = new MicropythonEngineAdapter();
    sendResponse = vi.fn();
    onNotification = vi.fn();
    adapter.setup(sendResponse, onNotification);
  });

  it("should initialize successfully", async () => {
    const request: JsonRpcRequest = {
      id: 1,
      jsonrpc: "2.0",
      method: EngineMethod.Init,
      params: {},
    };

    adapter.handleMessage(request);

    // We expect the init process to complete eventually.
    // In a real test, we would await a promise that resolves when the response is sent.
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        result: expect.objectContaining({
          id: "micropython",
        }),
      })
    );
  });

  it("should handle reset successfully after init", async () => {
    const initRequest: JsonRpcRequest = {
      id: 1,
      jsonrpc: "2.0",
      method: EngineMethod.Init,
      params: {},
    };

    adapter.handleMessage(initRequest);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const resetRequest: JsonRpcRequest = {
      id: 2,
      jsonrpc: "2.0",
      method: EngineMethod.Reset,
    };

    adapter.handleMessage(resetRequest);
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(sendResponse).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 2,
        result: expect.objectContaining({
          reset: true,
        }),
      })
    );
  });

  it("should suppress responses when INIT is received as a notification", async () => {
    adapter.handleMessage({
      jsonrpc: "2.0",
      method: EngineMethod.Init,
    } as never);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(sendResponse).not.toHaveBeenCalled();
  });

  it("should suppress responses when RUN is received as a notification", async () => {
    adapter.handleMessage({
      jsonrpc: "2.0",
      method: EngineMethod.Run,
      params: { code: "print('hello')" },
    } as never);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(sendResponse).not.toHaveBeenCalled();
  });

  it("should suppress responses when RESET is received as a notification", async () => {
    adapter.handleMessage({
      jsonrpc: "2.0",
      method: EngineMethod.Reset,
    } as never);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(sendResponse).not.toHaveBeenCalled();
  });

  it("never emits a response envelope with an undefined identifier on valid request", async () => {
    adapter.handleMessage({
      id: 999,
      jsonrpc: "2.0",
      method: EngineMethod.Init,
      params: {},
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 999,
        jsonrpc: "2.0",
      })
    );
    const [[lastCall]] = sendResponse.mock.calls;
    expect(lastCall.id).toBe(999);
    expect(lastCall.id).not.toBeUndefined();
  });

  it("suppresses rapid stdout flood exceeding rate limit and flushes system warning", async () => {
    adapter.handleMessage({
      id: 1,
      jsonrpc: "2.0",
      method: EngineMethod.Init,
      params: { maxOutputRate: 1000 },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    adapter.handleMessage({
      id: 2,
      jsonrpc: "2.0",
      method: EngineMethod.Run,
      params: {
        code: `
for i in range(1500):
    print("flood", i)
`,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    const { calls } = onNotification.mock;
    const stdoutCalls = calls.filter(
      ([method, params]) =>
        method === EngineMethod.Output &&
        (params as { type: string }).type === "stdout"
    );
    const systemCalls = calls.filter(
      ([method, params]) =>
        method === EngineMethod.Output &&
        (params as { type: string }).type === "system"
    );

    expect(stdoutCalls.length).toBe(1000);
    expect(systemCalls.length).toBeGreaterThanOrEqual(1);
    expect((systemCalls[0][1] as { data: string }).data).toContain(
      "messages omitted"
    );
  });

  it("executes python code containing comments and functions cleanly", async () => {
    adapter.handleMessage({
      id: 10,
      jsonrpc: "2.0",
      method: EngineMethod.Init,
      params: {},
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    adapter.handleMessage({
      id: 11,
      jsonrpc: "2.0",
      method: EngineMethod.Run,
      params: {
        code: `# Comment here
print("Hello", "MicroPython", 42)
def greet(name="world"):
    return "Hello, " + name
print(greet())
`,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 11,
        result: { executed: true, value: "undefined" },
      })
    );
  });
});

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
      jsonrpc: "2.0",
      id: 1,
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
});

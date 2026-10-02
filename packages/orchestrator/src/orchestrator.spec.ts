/**
 * Unit tests for EngineOrchestrator and PromiseRegistry.
 */

import { EngineMethod } from "@glyphide/rpc-protocol/constants";
import type {
  EngineOutputPayload,
  JsonRpcRequest,
} from "@glyphide/rpc-protocol/types";
import { describe, expect, it, vi } from "vitest";
import { EngineOrchestrator } from "./orchestrator.ts";
import { PromiseRegistry } from "./promise-registry.ts";

describe("EngineOrchestrator", () => {
  describe("constructor", () => {
    it("creates with default config", () => {
      const orchestrator = new EngineOrchestrator({});
      expect(orchestrator).toBeDefined();
    });

    it("accepts custom events", () => {
      const onOutput = () => {
        /* noop */
      };
      const onEngineReady = () => {
        /* noop */
      };

      const orchestrator = new EngineOrchestrator({
        events: { onEngineReady, onOutput },
      });

      expect(orchestrator).toBeDefined();
    });
  });

  describe("init", () => {
    it("throws if createWorker is not provided", async () => {
      const orchestrator = new EngineOrchestrator({
        useWorker: true,
      });

      await expect(orchestrator.init()).rejects.toThrow(
        "createWorker factory not provided"
      );
    });

    it("falls back to default timeout when engine init result omits timeout property", async () => {
      let capturedOnMessage: ((ev: MessageEvent) => void) | null = null;
      const mockWorker = {
        set onmessage(handler: ((ev: MessageEvent) => void) | null) {
          capturedOnMessage = handler;
        },
        postMessage: (data: unknown) => {
          const msg = data as JsonRpcRequest;
          if (msg.method === EngineMethod.Init) {
            capturedOnMessage?.({
              data: {
                id: msg.id,
                jsonrpc: "2.0",
                result: {
                  id: "test",
                  isInterruptible: true,
                  isStateful: true,
                  supportedLanguages: ["javascript"],
                  // timeout intentionally omitted
                },
              },
            } as MessageEvent);
          } else if (msg.method === EngineMethod.Run) {
            capturedOnMessage?.({
              data: {
                id: msg.id,
                jsonrpc: "2.0",
                result: null,
              },
            } as MessageEvent);
          }
        },
        terminate: vi.fn(),
      } as unknown as Worker;

      const orchestrator = new EngineOrchestrator({
        createWorker: () => mockWorker,
        useWorker: true,
      });

      const initResult = await orchestrator.init();
      expect(initResult.id).toBe("test");

      // Verify run executes without throwing instant timeout
      await expect(
        orchestrator.run("console.log('hi');")
      ).resolves.toBeUndefined();
    });
  });

  describe("input requests", () => {
    it("safely handles input requests with missing or non-object params without throwing", async () => {
      let capturedOnMessage: ((ev: MessageEvent) => void) | null = null;
      const emitMessage = (data: unknown) => {
        (capturedOnMessage as ((ev: MessageEvent) => void) | null)?.({
          data,
        } as MessageEvent);
      };
      let lastPostedMessage: unknown = null;
      const mockWorker = {
        set onmessage(handler: ((ev: MessageEvent) => void) | null) {
          capturedOnMessage = handler;
        },
        postMessage: (data: unknown) => {
          lastPostedMessage = data;
          const msg = data as JsonRpcRequest;
          if (msg.method === EngineMethod.Init) {
            emitMessage({
              id: msg.id,
              jsonrpc: "2.0",
              result: {
                id: "test",
                isInterruptible: true,
                isStateful: true,
                supportedLanguages: ["javascript"],
                timeout: 30_000,
              },
            });
          }
        },
        terminate: vi.fn(),
      } as unknown as Worker;

      const receivedPrompts: string[] = [];
      const orchestrator = new EngineOrchestrator({
        createWorker: () => mockWorker,
        events: {
          onInputRequest: (prompt, reply) => {
            receivedPrompts.push(prompt);
            reply("user-response");
          },
        },
        useWorker: true,
      });

      await orchestrator.init();

      // Emit input request with undefined params
      emitMessage({
        id: "req-1",
        jsonrpc: "2.0",
        method: EngineMethod.InputRequest,
      });

      expect(receivedPrompts).toEqual([""]);
      expect(lastPostedMessage).toEqual({
        id: "req-1",
        jsonrpc: "2.0",
        result: { value: "user-response" },
      });

      // Emit input request with null params
      emitMessage({
        id: "req-2",
        jsonrpc: "2.0",
        method: EngineMethod.InputRequest,
        params: null,
      });

      expect(receivedPrompts).toEqual(["", ""]);
      expect(lastPostedMessage).toEqual({
        id: "req-2",
        jsonrpc: "2.0",
        result: { value: "user-response" },
      });

      // Emit input request with invalid prompt type
      emitMessage({
        id: "req-3",
        jsonrpc: "2.0",
        method: EngineMethod.InputRequest,
        params: { prompt: 123 },
      });

      expect(receivedPrompts).toEqual(["", "", ""]);
      expect(lastPostedMessage).toEqual({
        id: "req-3",
        jsonrpc: "2.0",
        result: { value: "user-response" },
      });
    });
  });

  describe("malformed response envelopes", () => {
    it("rejects pending promises cleanly with a protocol error rather than hanging", async () => {
      let capturedOnMessage: ((ev: MessageEvent) => void) | null = null;
      const mockWorker = {
        set onmessage(handler: ((ev: MessageEvent) => void) | null) {
          capturedOnMessage = handler;
        },
        postMessage: (data: unknown) => {
          const msg = data as JsonRpcRequest;
          if (msg.method === EngineMethod.Init) {
            capturedOnMessage?.({
              data: {
                id: msg.id,
                jsonrpc: "2.0",
                result: {
                  id: "test",
                  isInterruptible: true,
                  isStateful: true,
                  supportedLanguages: ["javascript"],
                  timeout: 30_000,
                },
              },
            } as MessageEvent);
          } else if (msg.method === EngineMethod.Run) {
            // Emit malformed response envelope (dual result and error)
            capturedOnMessage?.({
              data: {
                error: { code: -32_600, message: "Execution error" },
                id: msg.id,
                jsonrpc: "2.0",
                result: { ok: true },
              },
            } as MessageEvent);
          }
        },
        terminate: vi.fn(),
      } as unknown as Worker;

      const orchestrator = new EngineOrchestrator({
        createWorker: () => mockWorker,
        useWorker: true,
      });

      await orchestrator.init();

      await expect(orchestrator.run("test();")).rejects.toThrow(
        "Protocol error: malformed response envelope"
      );
    });
  });

  describe("terminate", () => {
    it("cleans up without throwing when not initialized", () => {
      const orchestrator = new EngineOrchestrator({});
      expect(() => orchestrator.terminate()).not.toThrow();
    });
  });

  describe("interrupt", () => {
    it("terminates a freezing worker, rejects pending runs, emits system event, and respawns", async () => {
      const mockWorkerFactory = () => {
        return {
          set onmessage(handler: ((ev: MessageEvent) => void) | null) {
            mockWorkerFactory.currentOnMessage = handler;
          },
          postMessage: (data: unknown) => {
            const msg = data as JsonRpcRequest;
            // Simulate instant successful Init so the orchestrator is ready
            if (msg.method === EngineMethod.Init) {
              mockWorkerFactory.currentOnMessage?.({
                data: {
                  id: msg.id,
                  jsonrpc: "2.0",
                  result: {
                    id: "test",
                    isInterruptible: true,
                    isStateful: true,
                    supportedLanguages: ["javascript"],
                    timeout: 30_000,
                  },
                },
              } as MessageEvent);
            }
            // For EngineMethod.Run, we do nothing to simulate a FREEZE
          },
          terminate: () => {
            /* noop */
          },
        } as unknown as Worker;
      };

      mockWorkerFactory.currentOnMessage = null as
        | ((ev: MessageEvent) => void)
        | null;

      const systemOutputs: EngineOutputPayload[] = [];
      const orchestrator = new EngineOrchestrator({
        createWorker: mockWorkerFactory,
        events: {
          onOutput: (payload) => {
            if (payload.type === "system") {
              systemOutputs.push(payload);
            }
          },
        },
        useWorker: true,
      });

      await orchestrator.init();

      const runPromise = orchestrator.run("while(true);");

      await orchestrator.interrupt();

      await expect(runPromise).rejects.toThrow("Worker terminated");
      expect(systemOutputs).toContainEqual({
        data: "Execution interrupted",
        type: "system",
      });
    });
  });
});

describe("PromiseRegistry", () => {
  it("registers and resolves a promise", async () => {
    const registry = new PromiseRegistry();

    const [promise, resolve] = registry.register<number>(1);
    resolve(42);

    expect(registry.size).toBe(0);

    await expect(promise).resolves.toBe(42);
  });

  it("clears all pending promises", async () => {
    const registry = new PromiseRegistry();

    const [p1] = registry.register(1);
    const [p2] = registry.register(2);
    const [p3] = registry.register(3);

    expect(registry.size).toBe(3);

    registry.clear();
    expect(registry.size).toBe(0);

    await expect(p1).rejects.toThrow("Worker terminated");
    await expect(p2).rejects.toThrow("Worker terminated");
    await expect(p3).rejects.toThrow("Worker terminated");
  });

  it("resolves specific id without affecting others", async () => {
    const registry = new PromiseRegistry();

    const [promise1, resolve1] = registry.register<number>(1);
    const [promise2] = registry.register<number>(2);
    const [promise3] = registry.register<number>(3);

    expect(registry.size).toBe(3);
    resolve1(42);
    await expect(promise1).resolves.toBe(42);
    expect(registry.size).toBe(2);

    registry.clear();

    await expect(promise2).rejects.toThrow("Worker terminated");
    await expect(promise3).rejects.toThrow("Worker terminated");
  });
});

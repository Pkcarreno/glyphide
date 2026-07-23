/**
 * Unit tests for EngineOrchestrator and PromiseRegistry.
 */

import { EngineMethod } from "@glyphide/rpc-protocol/constants";
import type {
  EngineOutputPayload,
  JsonRpcRequest,
} from "@glyphide/rpc-protocol/types";
import { describe, expect, it } from "vitest";
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

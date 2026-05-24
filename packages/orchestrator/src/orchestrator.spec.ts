/**
 * Unit tests for EngineOrchestrator and PromiseRegistry.
 */

import { EngineMethod } from "@glyphide/rpc-protocol/constants";
import { describe, expect, it, vi } from "vitest";
import { EngineOrchestrator } from "./orchestrator";
import { PromiseRegistry } from "./promise-registry";

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
      const onInit = () => {
        /* noop */
      };

      const orchestrator = new EngineOrchestrator({
        events: { onOutput, onInit },
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
      let terminateCalledCount = 0;
      let workersCreated = 0;

      const mockWorkerFactory = () => {
        workersCreated++;
        return {
          terminate: () => {
            terminateCalledCount++;
          },
          postMessage: (data: any) => {
            // Simulate instant successful Init so the orchestrator is ready
            if (data.method === EngineMethod.Init) {
              setTimeout(() => {
                mockWorkerFactory.currentOnMessage?.({
                  data: {
                    jsonrpc: "2.0",
                    id: data.id,
                    result: { timeout: 30_000 },
                  },
                });
              }, 10);
            }
            // For EngineMethod.Run, we do nothing to simulate a FREEZE
          },
          set onmessage(handler: any) {
            mockWorkerFactory.currentOnMessage = handler;
          },
        } as unknown as Worker;
      };

      mockWorkerFactory.currentOnMessage = null as any;

      const onOutput = vi.fn();

      const orchestrator = new EngineOrchestrator({
        createWorker: mockWorkerFactory,
        useWorker: true,
        events: { onOutput },
      });

      // 1. Initialize
      await orchestrator.init({ testParam: true });
      expect(workersCreated).toBe(1);

      // 2. Start a run (it will freeze)
      let runError: Error | undefined;
      const runPromise = orchestrator.run("while(true) {}").catch((e) => {
        runError = e;
      });

      // 3. Interrupt it
      await orchestrator.interrupt();
      await runPromise;

      // 4. Assertions
      expect(terminateCalledCount).toBe(1);

      // The worker should be respawned
      expect(workersCreated).toBe(2);

      // The run promise should have been rejected with Execution failed: Worker terminated
      expect(runError).toBeDefined();
      expect(runError?.message).toBe("Execution failed: Worker terminated");

      // We should have received the synthetic "Execution interrupted" notification
      expect(onOutput).toHaveBeenCalledWith({
        type: "system",
        data: "Execution interrupted",
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

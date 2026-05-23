/**
 * Integration tests: Orchestrator + Mock Engine
 *
 * Validates the full RPC cycle between orchestrator and engine using real Web Workers
 * intercepted by Vite/Vitest.
 */

import { EngineOrchestrator } from "@glyphide/orchestrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createMockConfig,
  createMockWorker,
} from "./setup/mock-worker-factory";

describe("Orchestrator + Mock Engine Integration", () => {
  let orchestrator: EngineOrchestrator;

  beforeEach(() => {
    orchestrator = new EngineOrchestrator({
      createWorker: createMockWorker,
    });
  });

  afterEach(() => {
    orchestrator?.terminate();
  });

  describe("init", () => {
    it("returns default capabilities from mock engine", async () => {
      const config = await orchestrator.init();

      expect(config).toHaveProperty("timeout", 30_000);
      expect(config).toHaveProperty("stateful", true);
      expect(config).toHaveProperty("interruptible", true);
      expect((config as any).outputTypes).toContain("print");
    });

    it("accepts and applies configuration overrides via init parameters", async () => {
      const customConfig = createMockConfig({
        capabilities: {
          stateful: false,
          interruptible: false,
          outputTypes: ["log"],
        },
      });

      const config = (await orchestrator.init(customConfig)) as any;

      expect(config.stateful).toBe(false);
      expect(config.interruptible).toBe(false);
      expect(config.outputTypes).toEqual(["log"]);
    });

    it("throws if createWorker is not provided", async () => {
      const brokenOrchestrator = new EngineOrchestrator({});

      await expect(brokenOrchestrator.init()).rejects.toThrow(
        "createWorker factory not provided"
      );
    });
  });

  describe("run", () => {
    it("executes code and resolves successfully", async () => {
      await orchestrator.init();
      await expect(
        orchestrator.run("console.log('hello')")
      ).resolves.not.toThrow();
    });

    it("throws if execution fails inside the engine", async () => {
      const mockConfig = createMockConfig({
        runError: "Simulated Syntax Error",
      });
      await orchestrator.init(mockConfig);

      await expect(orchestrator.run("bad code")).rejects.toThrow(
        "Execution failed: Simulated Syntax Error"
      );
    });
  });

  describe("notifications", () => {
    it("emits print output from running code", async () => {
      const outputs: Array<{ content: string; type: string }> = [];

      orchestrator = new EngineOrchestrator({
        createWorker: createMockWorker,
        events: {
          onOutput: (payload) =>
            outputs.push({
              content: String(payload.data ?? ""),
              type: payload.type,
            }),
        },
      });

      await orchestrator.init();
      await orchestrator.run("expected output string");

      expect(outputs).toContainEqual({
        content: "expected output string",
        type: "print",
      });
    });
  });

  describe("interrupt", () => {
    it("stops running execution and triggers log notification", async () => {
      const outputs: Array<{ content: string; type: string }> = [];

      orchestrator = new EngineOrchestrator({
        createWorker: createMockWorker,
        events: {
          onOutput: (payload) =>
            outputs.push({
              content: String(payload.data ?? ""),
              type: payload.type,
            }),
        },
      });

      // Use a long delay to ensure it stays "running" while we interrupt
      await orchestrator.init(createMockConfig({ runDelay: 300 }));

      const runPromise = orchestrator.run("while(true){}");

      // Wait briefly, then interrupt
      await new Promise((resolve) => setTimeout(resolve, 50));
      await orchestrator.interrupt();

      // The run promise should still resolve (graceful stop)
      await runPromise;

      expect(outputs).toContainEqual({
        content: "Execution interrupted",
        type: "log",
      });
    });
  });

  describe("terminate", () => {
    it("kills worker immediately without throwing", async () => {
      await orchestrator.init();

      expect(() => orchestrator.terminate()).not.toThrow();

      // Second terminate should be a safe no-op
      expect(() => orchestrator.terminate()).not.toThrow();
    });

    it("rejects pending runs when forcefully terminated", async () => {
      await orchestrator.init(createMockConfig({ runDelay: 500 }));

      const runPromise = orchestrator.run("test");

      // Terminate immediately while running
      orchestrator.terminate();

      // The PromiseRegistry inside orchestrator clears and rejects all pending
      await expect(runPromise).rejects.toThrow();
    });
  });

  describe("timeout", () => {
    it("rejects execution if engine exceeds timeout", async () => {
      // Override timeout capability to 100ms via any casting
      const mockConfig = createMockConfig({
        runDelay: 300,
        capabilities: {
          timeout: 50,
          stateful: true,
          interruptible: true,
          outputTypes: ["print"],
        } as any,
      });

      await orchestrator.init(mockConfig);

      await expect(orchestrator.run("infinite loop")).rejects.toThrow(
        "Request timeout"
      );
    });
  });
});

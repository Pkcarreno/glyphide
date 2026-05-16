import { EngineOrchestrator } from "@glyphide/orchestrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createQuickJSWorker } from "./setup/quickjs-worker-factory";

describe("Orchestrator + QuickJS Engine Integration", () => {
  let orchestrator: EngineOrchestrator;

  beforeEach(() => {
    orchestrator = new EngineOrchestrator({
      createWorker: createQuickJSWorker,
    });
  });

  afterEach(() => {
    orchestrator?.terminate();
  });

  describe("init", () => {
    it("returns capabilities from QuickJS engine", async () => {
      const config = await orchestrator.init();

      expect(config).toHaveProperty("timeout", 30_000);
      expect(config).toHaveProperty("stateful", true);
      expect(config).toHaveProperty("interruptible", true);
      expect((config as any).outputTypes).toContain("print");
    });
  });

  describe("run", () => {
    it("executes code and resolves successfully", async () => {
      await orchestrator.init();
      await expect(orchestrator.run("1 + 1")).resolves.not.toThrow();
    });

    it("throws if execution fails inside the engine (SyntaxError)", async () => {
      await orchestrator.init();
      await expect(orchestrator.run("bad code {")).rejects.toThrow(
        "SyntaxError"
      );
    });
  });

  describe("notifications", () => {
    it("emits log output from running code", async () => {
      const outputs: Array<{ content: string; type: string }> = [];

      orchestrator = new EngineOrchestrator({
        createWorker: createQuickJSWorker,
        events: {
          onOutput: (content, type) => outputs.push({ content, type }),
        },
      });

      await orchestrator.init();
      await orchestrator.run("console.log('hello from quickjs')");

      expect(outputs).toContainEqual({
        content: "hello from quickjs",
        type: "log",
      });
    });
  });

  describe("interrupt", () => {
    it("stops execution and triggers log notification", async () => {
      const outputs: Array<{ content: string; type: string }> = [];

      orchestrator = new EngineOrchestrator({
        createWorker: createQuickJSWorker,
        events: {
          onOutput: (content, type) => outputs.push({ content, type }),
        },
      });

      await orchestrator.init();

      // Start execution that will take some time
      const runPromise = orchestrator.run(`
        let i = 0;
        while(i < 10000000) { i++; }
      `);

      // Send interrupt
      await orchestrator.interrupt();

      try {
        await runPromise;
      } catch (_e) {
        // May throw interrupted error
      }

      // Wait briefly for notification
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(
        outputs.some(
          (o) => o.type === "log" && o.content === "Execution interrupted"
        )
      ).toBe(true);
    });
  });

  describe("terminate", () => {
    it("kills worker immediately without throwing", async () => {
      await orchestrator.init();
      expect(() => orchestrator.terminate()).not.toThrow();
      expect(() => orchestrator.terminate()).not.toThrow();
    });

    it("rejects pending runs when forcefully terminated", async () => {
      await orchestrator.init();
      // Wait, standard mode doesn't await JS promises, so it will finish immediately.
      // But we can terminate right after calling run.
      const runPromise = orchestrator.run(`
        let i = 0;
        while(i < 10000000) { i++; }
      `);
      orchestrator.terminate();

      await expect(runPromise).rejects.toThrow();
    });
  });
});

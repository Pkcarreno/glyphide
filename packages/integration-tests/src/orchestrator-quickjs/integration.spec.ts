import { EngineOrchestrator } from "@glyphide/orchestrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createQuickJSWorker } from "./setup/quickjs-worker-factory.ts";

describe("Orchestrator + QuickJS Engine Integration", () => {
  let orchestrator: EngineOrchestrator;

  beforeEach(() => {
    orchestrator = new EngineOrchestrator({
      createWorker: createQuickJSWorker,
    });
  });

  afterEach(() => {
    orchestrator.terminate();
  });

  describe("init", () => {
    it("returns capabilities from QuickJS engine", async () => {
      const config = await orchestrator.init();

      expect(config).toHaveProperty("timeout", 30_000);
      expect(config).toHaveProperty("isStateful", true);
      expect(config).toHaveProperty("isInterruptible", true);
      expect(config.outputTypes).toContain("log");
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

    it("terminates execution if it times out (infinite loop)", async () => {
      // QuickJS uses an internal interrupt handler, so it doesn't block the main thread
      // like Micropython does. It will gracefully throw an 'interrupted' error from within WASM.
      await orchestrator.init({ timeout: 100 });
      const runPromise = orchestrator.run("while(true) {}");

      await expect(runPromise).rejects.toThrow("interrupted");

      // Orchestrator remains fully usable without needing a hard restart
      await expect(orchestrator.run("1 + 1")).resolves.toBeUndefined();
    });
  });

  describe("notifications", () => {
    it("emits log output with structured tokens", async () => {
      const outputs: Array<{ data: unknown; type: string }> = [];

      orchestrator = new EngineOrchestrator({
        createWorker: createQuickJSWorker,
        events: {
          onOutput: (payload) =>
            outputs.push({
              data: payload.data,
              type: payload.type,
            }),
        },
      });

      await orchestrator.init();
      await orchestrator.run("console.log('hello from quickjs')");

      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe("log");
      expect(outputs[0].data).toEqual([
        { type: "string", value: "hello from quickjs" },
      ]);
    });
  });

  describe("interrupt", () => {
    it("stops execution and triggers log notification", async () => {
      const outputs: Array<{ content: string; type: string }> = [];

      orchestrator = new EngineOrchestrator({
        createWorker: createQuickJSWorker,
        events: {
          onOutput: (payload) =>
            outputs.push({
              content: String(payload.data ?? ""),
              type: payload.type,
            }),
        },
      });

      await orchestrator.init();

      // Start execution that will take some time
      let runError: Error | undefined;
      const runPromise = orchestrator
        .run(`
        let i = 0;
        while(true) { i++; }
      `)
        .catch((e) => {
          runError = e;
        });

      // Send interrupt
      await orchestrator.interrupt();

      await runPromise;
      expect(runError).toBeDefined();
      expect(runError?.message).toBe("Execution failed: Worker terminated");

      // Wait briefly for notification
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(
        outputs.some(
          (o) => o.type === "system" && o.content === "Execution interrupted"
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

  describe("reset", () => {
    it("clears context state but retains runtime stability, properly reloading console", async () => {
      const outputs: Array<{ content: string; type: string }> = [];

      orchestrator = new EngineOrchestrator({
        createWorker: createQuickJSWorker,
        events: {
          onOutput: (payload) =>
            outputs.push({
              content: JSON.stringify(payload.data),
              type: payload.type,
            }),
        },
      });

      await orchestrator.init();

      // Mutate global state
      await orchestrator.run("globalThis.X = 42;");

      // Reset engine
      await orchestrator.reset();

      // Ensure global state was cleared
      await orchestrator.run("console.log(typeof globalThis.X);");

      // We expect 1 log containing 'undefined'
      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe("log");
      // ConsoleToken output format
      expect(outputs[0].content).toEqual(
        JSON.stringify([{ type: "string", value: "undefined" }])
      );
    });
  });
});

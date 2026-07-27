import { EngineOrchestrator } from "@glyphide/orchestrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMicropythonWorker } from "./setup/micropython-worker-factory.ts";

describe("Orchestrator + Micropython Engine Integration", () => {
  let orchestrator: EngineOrchestrator;

  beforeEach(() => {
    orchestrator = new EngineOrchestrator({
      createWorker: createMicropythonWorker,
    });
  });

  afterEach(() => {
    orchestrator.terminate();
  });

  describe("init", () => {
    it("returns capabilities from Micropython engine", async () => {
      // Vitest timeout might need to be longer for Micropython load
      const config = await orchestrator.init();

      expect(config).toHaveProperty("timeout", 30_000);
      expect(config).toHaveProperty("id", "micropython");
      expect(config).toHaveProperty("isStateful", true);
    });
  });

  describe("run", () => {
    it("executes standard python code successfully", async () => {
      await orchestrator.init();
      await expect(orchestrator.run("1 + 1")).resolves.toBeUndefined();
    });

    it("throws if execution fails inside the engine (SyntaxError)", async () => {
      await orchestrator.init();
      await expect(orchestrator.run("bad code {")).rejects.toThrow(
        "SyntaxError"
      );
    });
  });

  describe("notifications", () => {
    it("emits stdout output correctly", async () => {
      const outputs: Array<{ data: unknown; type: string }> = [];

      orchestrator = new EngineOrchestrator({
        createWorker: createMicropythonWorker,
        events: {
          onOutput: (payload) =>
            outputs.push({
              data: payload.data,
              type: payload.type,
            }),
        },
      });

      await orchestrator.init();
      await orchestrator.run("print('hello from micropython')");

      // Micropython stdout adds a newline generally via print
      expect(outputs.length).toBeGreaterThan(0);
      expect(outputs[0].type).toBe("stdout");
      expect(
        (outputs[0].data as string).includes("hello from micropython")
      ).toBe(true);
    });
  });

  describe("reset", () => {
    it("resets execution context and allows code execution afterwards", async () => {
      await orchestrator.init();
      await expect(orchestrator.run("x = 42")).resolves.toBeUndefined();
      await expect(orchestrator.reset()).resolves.toBeUndefined();
      await expect(orchestrator.run("y = 100")).resolves.toBeUndefined();
    });
  });
});

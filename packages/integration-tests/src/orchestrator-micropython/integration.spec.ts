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

    it("throws if execution fails with runtime error (ZeroDivisionError)", async () => {
      await orchestrator.init();
      await expect(orchestrator.run("1 / 0")).rejects.toThrow(
        "ZeroDivisionError"
      );
    });

    it("throws if execution raises an uncaught exception (ValueError)", async () => {
      await orchestrator.init();
      await expect(
        orchestrator.run("raise ValueError('invalid parameter value')")
      ).rejects.toThrow("ValueError: invalid parameter value");
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

    it("emits stderr output correctly", async () => {
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
      await orchestrator.run(
        "import sys; sys.stderr.write('error in stream\\n')"
      );

      expect(outputs.length).toBeGreaterThan(0);
      expect(outputs[0].type).toBe("stderr");
      expect((outputs[0].data as string).includes("error in stream")).toBe(
        true
      );
    });

    it("handles interleaved standard output and error cycles across execution steps", async () => {
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
      await orchestrator.run("print('cycle 1: stdout')");
      await orchestrator.run(
        "import sys; sys.stderr.write('cycle 2: stderr\\n')"
      );
      await orchestrator.run("print('cycle 3: done')");

      const types = outputs.map((o) => o.type);
      expect(types).toContain("stdout");
      expect(types).toContain("stderr");
      expect(
        outputs.some(
          (o) =>
            typeof o.data === "string" && o.data.includes("cycle 1: stdout")
        )
      ).toBe(true);
      expect(
        outputs.some(
          (o) =>
            typeof o.data === "string" && o.data.includes("cycle 2: stderr")
        )
      ).toBe(true);
      expect(
        outputs.some(
          (o) => typeof o.data === "string" && o.data.includes("cycle 3: done")
        )
      ).toBe(true);
    });

    it("preserves state between sequential standard I/O cycles", async () => {
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
      await orchestrator.run("acc = [1, 2, 3]");
      await orchestrator.run("acc.append(4); print(acc)");

      expect(
        outputs.some(
          (o) => typeof o.data === "string" && o.data.includes("[1, 2, 3, 4]")
        )
      ).toBe(true);
    });
  });

  describe("timeout", () => {
    it("rejects execution if code execution exceeds timeout limit", async () => {
      const shortTimeoutOrchestrator = new EngineOrchestrator({
        createWorker: createMicropythonWorker,
      });

      await shortTimeoutOrchestrator.init({ timeout: 50 });

      await expect(
        shortTimeoutOrchestrator.run("import time; time.sleep(0.3)")
      ).rejects.toThrow("Request timeout");

      shortTimeoutOrchestrator.terminate();
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

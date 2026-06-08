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
} from "./setup/mock-worker-factory.ts";

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
      expect(config).toHaveProperty("isStateful", true);
      expect(config).toHaveProperty("isInterruptible", true);
      expect((config as any).outputTypes).toContain("print");
    });

    it("accepts and applies configuration overrides via init parameters", async () => {
      const customConfig = createMockConfig({
        capabilities: {
          isStateful: false,
          isInterruptible: false,
          supportedLanguages: ["plaintext"],
          outputTypes: ["log"],
        },
      });

      const config = (await orchestrator.init(customConfig)) as any;

      expect(config.isStateful).toBe(false);
      expect(config.isInterruptible).toBe(false);
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

      let runError: Error | undefined;
      const runPromise = orchestrator.run("while(true){}").catch((e) => {
        runError = e;
      });

      // Wait briefly, then interrupt
      await new Promise((resolve) => setTimeout(resolve, 50));
      await orchestrator.interrupt();

      // The run promise should reject because of forced termination
      await runPromise;
      expect(runError).toBeDefined();
      expect(runError?.message).toBe("Execution failed: Worker terminated");

      expect(outputs).toContainEqual({
        content: "Execution interrupted",
        type: "system",
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

  describe("input request", () => {
    it("engine emits input request and orchestrator forwards to handler", async () => {
      const outputs: Array<{ content: string; type: string }> = [];
      let capturedPrompt: string | undefined;

      orchestrator = new EngineOrchestrator({
        createWorker: createMockWorker,
        events: {
          onOutput: (payload) =>
            outputs.push({
              content: String(payload.data ?? ""),
              type: payload.type,
            }),
          onInputRequest: (prompt, reply) => {
            capturedPrompt = prompt;
            setTimeout(() => reply("Alice"), 10);
          },
        },
      });

      const mockConfig = createMockConfig({
        inputPrompts: ["Name: "],
      });

      await orchestrator.init(mockConfig);
      await orchestrator.run("hello code");

      expect(capturedPrompt).toBe("Name: ");
      expect(outputs).toContainEqual({
        content: "hello code",
        type: "print",
      });
      expect(outputs).toContainEqual({
        content: "Alice",
        type: "print",
      });
    });

    it("multiple sequential input requests are handled in order", async () => {
      const outputs: Array<{ content: string; type: string }> = [];
      const prompts: string[] = [];

      orchestrator = new EngineOrchestrator({
        createWorker: createMockWorker,
        events: {
          onOutput: (payload) =>
            outputs.push({
              content: String(payload.data ?? ""),
              type: payload.type,
            }),
          onInputRequest: (prompt, reply) => {
            prompts.push(prompt);
            setTimeout(() => {
              if (prompt === "First: ") {
                reply("A");
              } else if (prompt === "Second: ") {
                reply("B");
              } else {
                reply("?");
              }
            }, 10);
          },
        },
      });

      const mockConfig = createMockConfig({
        inputPrompts: ["First: ", "Second: "],
      });

      await orchestrator.init(mockConfig);
      await orchestrator.run("done");

      expect(prompts).toEqual(["First: ", "Second: "]);
      expect(outputs).toContainEqual({
        content: "A, B",
        type: "print",
      });
    });

    it("input request without handler auto-replies with empty string", async () => {
      const outputs: Array<{ content: string; type: string }> = [];

      // NO onInputRequest handler registered
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

      const mockConfig = createMockConfig({
        inputPrompts: ["Name: "],
      });

      await orchestrator.init(mockConfig);
      // Execution shouldn't block
      await orchestrator.run("code");

      expect(outputs).toContainEqual({
        content: "code",
        type: "print",
      });
      // Should have output the auto-reply "" (empty string)
      expect(outputs).toContainEqual({
        content: "",
        type: "print",
      });
    });
  });

  describe("timeout", () => {
    it("rejects execution if engine exceeds timeout", async () => {
      // Override timeout capability to 100ms via any casting
      const mockConfig = createMockConfig({
        runDelay: 300,
        capabilities: {
          timeout: 50,
          isStateful: true,
          isInterruptible: true,
          supportedLanguages: ["plaintext"],
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

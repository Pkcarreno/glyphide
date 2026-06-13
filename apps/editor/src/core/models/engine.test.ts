import { EngineMethod } from "@glyphide/rpc-protocol/constants";
import { beforeEach, describe, expect, it } from "vitest";
import type { createEngineRegistry } from "../engine/registry.ts";
import type { PersistencePort } from "../ports/persistence.ts";
import type { UrlStatePort } from "../ports/url-state.ts";
import { createBufferModel } from "./buffer.ts";
import { createEngineModel } from "./engine.ts";
import { createOutputModel } from "./output.ts";
import { createSettingsModel } from "./settings.ts";

function createMockPersistence(): PersistencePort {
  const data = new Map();
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, val) => data.set(key, val),
    remove: (key) => data.delete(key),
  };
}

function createMockUrlState(): UrlStatePort {
  const data = new Map();
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, val) => {
      data.set(key, val);
    },
    remove: (key) => {
      data.delete(key);
    },
  };
}

function createTestRegistry(): ReturnType<typeof createEngineRegistry> {
  return {
    engines: [],
    getDefinition: (id) => {
      if (id !== "quickjs" && id !== "mock" && id !== "micropython") {
        throw new Error(`Unknown engine: "${id}"`);
      }
      return {
        id,
        label: "Test Engine",
        supportedLanguages: ["javascript", "typescript"],
        defaultInitParams: { timeout: 30_000 },
        paramDescriptors: [],
      } as unknown as ReturnType<
        ReturnType<typeof createEngineRegistry>["getDefinition"]
      >;
    },
    loadFactory: async () => () => {
      const worker = {
        onmessage: null as ((msg: unknown) => void) | null,
        postMessage(msg: Record<string, unknown>) {
          setTimeout(() => {
            const onMessage = worker.onmessage;
            if (!onMessage) {
              return;
            }

            if (msg.method === EngineMethod.Init) {
              onMessage({
                data: {
                  jsonrpc: "2.0",
                  id: msg.id,
                  result: {
                    id: "test",
                    timeout: 30_000,
                    supportedLanguages: ["javascript"],
                    isStateful: true,
                    isInterruptible: true,
                  },
                },
              });
            } else if (msg.method === EngineMethod.Run) {
              const params = msg.params as Record<string, unknown>;
              onMessage({
                data: {
                  jsonrpc: "2.0",
                  method: EngineMethod.Output,
                  params: { type: "print", data: params?.code },
                },
              });
              onMessage({
                data: {
                  jsonrpc: "2.0",
                  id: msg.id,
                  result: { executed: true },
                },
              });
            } else if (
              msg.method === EngineMethod.Interrupt ||
              msg.method === EngineMethod.Reset
            ) {
              onMessage({
                data: {
                  jsonrpc: "2.0",
                  id: msg.id,
                  result: { reset: true, interrupted: true },
                },
              });
            }
          }, 10);
        },
        terminate() {
          /* mock */
        },
      };
      return worker as unknown as Worker;
    },
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("EngineModel (Integration)", () => {
  let buffer: ReturnType<typeof createBufferModel>;
  let output: ReturnType<typeof createOutputModel>;
  let settings: ReturnType<typeof createSettingsModel>;
  let registry: ReturnType<typeof createEngineRegistry>;
  let urlState: ReturnType<typeof createMockUrlState>;

  beforeEach(() => {
    urlState = createMockUrlState();
    buffer = createBufferModel(urlState);
    output = createOutputModel();
    settings = createSettingsModel(createMockPersistence());
    registry = createTestRegistry();
    settings.updateSettings({ isClearOnRunEnabled: false });
  });

  it("initializes in idle state", () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    expect(model.engineStatus()).toBe("idle");
    expect(model.activeEngineId()).toBe("quickjs");
    expect(model.activeLanguage()).toBe("javascript");
  });

  it("selectEngineEntry eagerly initializes the engine", async () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    const p = model.selectEngineEntry({
      engineId: "mock",
      language: "typescript",
      label: "",
    });
    expect(model.engineStatus()).toBe("initializing");
    await p;
    expect(model.engineStatus()).toBe("ready");
    expect(model.activeCapabilities()?.id).toBe("test");
  });

  it("executes code using mock engine and captures output", async () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    await model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });
    buffer.setContent("test code");

    await model.executeCode();
    await sleep(50);

    expect(model.engineStatus()).toBe("ready");
    const entries = output.entries();
    expect(
      entries.some((e) => e.type === "print" && e.data === "test code")
    ).toBe(true);
  });

  it("interrupts running execution", async () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    await model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });

    buffer.setContent("test");
    const execPromise = model.executeCode();
    await model.interruptExecution();
    await execPromise;
    expect(model.engineStatus()).toBe("ready");
  });

  it("parses engine and language from urlState if available", () => {
    urlState.set("engine", "mock:typescript");
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    expect(model.activeEngineId()).toBe("mock");
    expect(model.activeLanguage()).toBe("typescript");
  });

  it("falls back to quickjs if urlState contains an unknown engine", () => {
    urlState.set("engine", "unknown-engine:python");
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    expect(model.activeEngineId()).toBe("quickjs");
    expect(model.activeLanguage()).toBe("javascript");
  });

  it("enters error state if initialization fails", async () => {
    const brokenRegistry = {
      ...registry,
      loadFactory: () => Promise.reject(new Error("Factory failed")),
    };
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry: brokenRegistry,
      urlState,
    });
    await model.selectEngineEntry({
      engineId: "mock",
      language: "plaintext",
      label: "",
    });
    expect(model.engineStatus()).toBe("error");
    const entries = output.entries();
    expect(entries.at(-1)?.data).toContain("Factory failed");
  });

  it("clears output on run if setting is enabled", async () => {
    settings.updateSettings({ isClearOnRunEnabled: true });
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    await model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });

    output.appendEntry("system", "old logs");
    expect(output.entries().length).toBeGreaterThan(0);

    buffer.setContent("test");
    await model.executeCode();

    // Output should only contain the run logs, old logs are cleared
    expect(output.entries().some((e) => e.data === "old logs")).toBe(false);
  });

  it("updates isDirty state only if modified while running", async () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });

    await model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });

    expect(model.isDirty()).toBe(false);

    // Buffer update should NOT set isDirty to true if not running
    model.onBufferUpdated("new code");
    expect(model.isDirty()).toBe(false);

    // Start execution but don't wait for it to finish yet
    buffer.setContent("new code");
    const execPromise = model.executeCode();

    // Wait until the engine actually enters the running state
    while (model.engineStatus() !== "running") {
      await sleep(2);
    }

    // Modifying the buffer now should mark it as dirty
    model.onBufferUpdated("modified while running");
    expect(model.isDirty()).toBe(true);

    // Wait for execution to finish
    await execPromise;
    await sleep(20);

    // isDirty should reset to false once execution completes
    expect(model.isDirty()).toBe(false);
  });

  it("clears output when switching to a different engine", async () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    await model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });

    // Manually add an output entry simulating prior engine output
    output.appendEntry("log", "previous engine log");
    expect(output.entries().length).toBeGreaterThan(0);

    // Switch to a different engine
    await model.selectEngineEntry({
      engineId: "quickjs",
      language: "javascript",
      label: "",
    });

    // Output must be cleared before the new engine initializes
    // The "Initializing engine…" system entry comes after the clear
    expect(output.entries().some((e) => e.data === "previous engine log")).toBe(
      false
    );
  });

  it("does not clear output when re-selecting the same engine and language", async () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    await model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });

    output.appendEntry("log", "important log");
    expect(output.entries().some((e) => e.data === "important log")).toBe(true);

    // Re-select the same engine and language
    await model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });

    // Entry should still be present (same-entry path does not clear)
    expect(output.entries().some((e) => e.data === "important log")).toBe(true);
  });

  it("clears output on engine switch regardless of isClearOnRunEnabled", async () => {
    // isClearOnRunEnabled is false (set in beforeEach)
    expect(settings.settings.isClearOnRunEnabled).toBe(false);

    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    await model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });

    output.appendEntry("log", "pre-switch log");

    await model.selectEngineEntry({
      engineId: "micropython",
      language: "python",
      label: "",
    });

    expect(output.entries().some((e) => e.data === "pre-switch log")).toBe(
      false
    );
  });
});

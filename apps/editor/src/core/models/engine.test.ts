import { EngineMethod } from "@glyphide/rpc-protocol/constants";
import { waitFor } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

function createMockUrlState(): UrlStatePort & {
  setCalls: Array<{ key: string; value: string }>;
  removeCalls: string[];
} {
  const data = new Map();
  const setCalls: Array<{ key: string; value: string }> = [];
  const removeCalls: string[] = [];
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, val) => {
      data.set(key, val);
      setCalls.push({ key, value: val });
    },
    remove: (key) => {
      data.delete(key);
      removeCalls.push(key);
    },
    setCalls,
    removeCalls,
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
  const freshUrlState = () => {
    const state = createMockUrlState();
    return state;
  };

  beforeEach(() => {
    urlState = freshUrlState();
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

  it("selectEngineEntry is selection-only; initializeSelectedEngine transitions to ready", async () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    model.selectEngineEntry({
      engineId: "mock",
      language: "typescript",
      label: "",
    });
    // Selection updates signals but does NOT spawn a worker — status stays idle
    expect(model.activeEngineId()).toBe("mock");
    expect(model.activeLanguage()).toBe("typescript");
    expect(model.engineStatus()).toBe("idle");

    // initializeSelectedEngine spawns the worker
    const p = model.initializeSelectedEngine();
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
    model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });
    await model.initializeSelectedEngine();
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
    model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });
    await model.initializeSelectedEngine();

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
    model.selectEngineEntry({
      engineId: "mock",
      language: "plaintext",
      label: "",
    });
    await model.initializeSelectedEngine();
    expect(model.engineStatus()).toBe("error");
    // OutputModel batches entries via requestAnimationFrame; wait for the
    // error message to flush before asserting on it.
    await waitFor(() => {
      const entries = output.entries();
      expect(entries.at(-1)?.data).toContain("Factory failed");
    });
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
    model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });
    await model.initializeSelectedEngine();

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

    model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });
    await model.initializeSelectedEngine();

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
    model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });
    await model.initializeSelectedEngine();

    // Manually add an output entry simulating prior engine output
    output.appendEntry("log", "previous engine log");
    expect(output.entries().length).toBeGreaterThan(0);

    // Switch to a different engine
    model.selectEngineEntry({
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
    model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });
    await model.initializeSelectedEngine();

    output.appendEntry("log", "important log");
    // OutputModel batches entries via requestAnimationFrame; wait for the
    // append to flush before asserting.
    await waitFor(() => {
      expect(output.entries().some((e) => e.data === "important log")).toBe(
        true
      );
    });

    // Re-select the same engine and language
    model.selectEngineEntry({
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
    model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });
    await model.initializeSelectedEngine();

    output.appendEntry("log", "pre-switch log");

    model.selectEngineEntry({
      engineId: "micropython",
      language: "python",
      label: "",
    });

    expect(output.entries().some((e) => e.data === "pre-switch log")).toBe(
      false
    );
  });
});

describe("EngineModel URL conditional persistence (REQ-ENG-001..007)", () => {
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

  // REQ-ENG-002: clearing the buffer removes the engine from the URL
  it("onBufferUpdated('') removes engine from URL", () => {
    urlState.set("engine", "mock:javascript");
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    expect(urlState.get("engine")).toBe("mock:javascript");

    model.onBufferUpdated("");

    expect(urlState.get("engine")).toBeNull();
    expect(urlState.removeCalls).toContain("engine");
  });

  // REQ-ENG-002 triangulation: clearing when no engine in URL is a no-op
  it("onBufferUpdated('') with no engine in URL leaves URL unchanged", () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    expect(urlState.get("engine")).toBeNull();

    model.onBufferUpdated("");

    // No engine in URL before, no engine in URL after — observable: no change
    expect(urlState.get("engine")).toBeNull();
  });

  // REQ-ENG-001 happy path: empty buffer + no engine in URL → user types code → engine written
  it("onBufferUpdated('code') with no engine in URL writes the active engine", () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    expect(urlState.get("engine")).toBeNull();

    model.onBufferUpdated("code");

    // The default engine "quickjs" is multi-language, so URL gets "quickjs:javascript"
    expect(urlState.get("engine")).toBe("quickjs:javascript");
  });

  // REQ-ENG-001 no-op: URL has engine with current value → user types code → no set call
  it("onBufferUpdated('code') with matching engine in URL is a no-op (no set call)", () => {
    urlState.set("engine", "quickjs:javascript");
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    urlState.setCalls.length = 0;

    model.onBufferUpdated("code");

    // No-op: tracker already matches active engine, URL must not be re-touched
    expect(urlState.setCalls.find((c) => c.key === "engine")).toBeUndefined();
    expect(urlState.get("engine")).toBe("quickjs:javascript");
  });

  // REQ-ENG-003 scenario 1: selectEngineEntry with code present writes engine
  it("selectEngineEntry with non-empty buffer writes engine to URL", () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    buffer.setContent("hello world");

    model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });

    // Buffer is non-empty, so engine should be persisted
    expect(urlState.get("engine")).toBe("mock:javascript");
  });

  // REQ-ENG-003 scenario 2: selectEngineEntry with empty buffer skips URL write
  it("selectEngineEntry with empty buffer skips URL write but updates internal state", () => {
    urlState.set("engine", "quickjs:javascript");
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    // Tracker is "quickjs" (from URL), active is "quickjs", buffer is empty.
    const setCallsBefore = urlState.setCalls.length;
    const removeCallsBefore = urlState.removeCalls.length;

    model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });

    // Internal state should reflect the new engine
    expect(model.activeEngineId()).toBe("mock");
    expect(model.activeLanguage()).toBe("javascript");

    // URL must not be touched (no set, no remove) by selectEngineEntry
    const newSetCalls = urlState.setCalls.slice(setCallsBefore);
    const newRemoveCalls = urlState.removeCalls.slice(removeCallsBefore);
    expect(newSetCalls.find((c) => c.key === "engine")).toBeUndefined();
    expect(newRemoveCalls).not.toContain("engine");

    // URL still has the old engine from initial state
    expect(urlState.get("engine")).toBe("quickjs:javascript");
  });

  // REQ-ENG-003 + REQ-ENG-002: after empty-buffer selection, typing code
  // re-seeds the URL with the new engine
  it("after empty-buffer engine switch, typing code writes the new engine to URL", () => {
    urlState.set("engine", "quickjs:javascript");
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });
    expect(urlState.get("engine")).toBe("quickjs:javascript"); // unchanged (empty buffer)

    buffer.setContent("hello");
    model.onBufferUpdated("hello");

    expect(urlState.get("engine")).toBe("mock:javascript");
  });

  // REQ-ENG-007: file load with code should result in engine in URL.
  // Tested at the engine-model level: selectEngineEntry with non-empty buffer
  // writes engine; the second call with same engine is a no-op.
  it("selectEngineEntry with non-empty buffer seeds engine URL once, not on re-select", () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    buffer.setContent("print('hi')");

    // First call: writes engine
    model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });
    expect(urlState.get("engine")).toBe("mock:javascript");

    // Second call with same engine + same content: tracker matches, no URL write
    urlState.setCalls.length = 0;
    model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });
    expect(urlState.setCalls.find((c) => c.key === "engine")).toBeUndefined();
  });
});

describe("EngineModel select/init split contract", () => {
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

  it("selectEngineEntry is synchronous (void return type) and does NOT spawn worker", () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    const factorySpy = vi.spyOn(registry, "loadFactory");

    // The method must be callable WITHOUT await and return undefined
    const result = model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });
    expect(result).toBeUndefined();

    // Signals updated, but no worker spawned
    expect(model.activeEngineId()).toBe("mock");
    expect(model.activeLanguage()).toBe("javascript");
    expect(model.engineStatus()).toBe("idle");
    expect(factorySpy).not.toHaveBeenCalled();
  });

  it("initializeSelectedEngine on idle transitions to ready and populates capabilities", async () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });

    const p = model.initializeSelectedEngine();
    expect(model.engineStatus()).toBe("initializing");
    await p;
    expect(model.engineStatus()).toBe("ready");
    expect(model.activeCapabilities()?.id).toBe("test");
  });

  it("initializeSelectedEngine is idempotent on ready (no worker restart)", async () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });
    await model.initializeSelectedEngine();
    expect(model.engineStatus()).toBe("ready");

    // Second call: must NOT spawn a new worker
    const factorySpy = vi.spyOn(registry, "loadFactory");
    await model.initializeSelectedEngine();
    expect(factorySpy).not.toHaveBeenCalled();
    expect(model.engineStatus()).toBe("ready");
  });

  it("initializeSelectedEngine retries on error: terminate first, then init", async () => {
    // Mutable registry: starts failing, then recovers
    let shouldFail = true;
    const mutableRegistry = {
      ...registry,
      loadFactory: () =>
        shouldFail
          ? Promise.reject(new Error("Factory failed"))
          : registry.loadFactory("mock"),
    };
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry: mutableRegistry,
      urlState,
    });
    model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });

    // First init: fails → error state
    await model.initializeSelectedEngine();
    expect(model.engineStatus()).toBe("error");

    // Recover the underlying cause
    shouldFail = false;

    // Second init: must terminate the failed worker and retry
    await model.initializeSelectedEngine();
    expect(model.engineStatus()).toBe("ready");
  });

  it("initializeSelectedEngine is no-op on blocked (no worker spawn)", async () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    model.selectEngineEntry({
      engineId: "mock",
      language: "javascript",
      label: "",
    });
    model.setBlocked(true);
    expect(model.engineStatus()).toBe("blocked");

    const factorySpy = vi.spyOn(registry, "loadFactory");
    await model.initializeSelectedEngine();

    expect(factorySpy).not.toHaveBeenCalled();
    expect(model.engineStatus()).toBe("blocked");
  });

  it("same-entry selectEngineEntry is a no-op when idle (no terminate, no init)", () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    // Initial entry is quickjs:javascript
    const factorySpy = vi.spyOn(registry, "loadFactory");

    model.selectEngineEntry({
      engineId: "quickjs",
      language: "javascript",
      label: "",
    });

    expect(factorySpy).not.toHaveBeenCalled();
    expect(model.engineStatus()).toBe("idle");
    expect(model.activeEngineId()).toBe("quickjs");
    expect(model.activeLanguage()).toBe("javascript");
  });

  it("same-entry selectEngineEntry is a no-op when ready (no worker restart)", async () => {
    const model = createEngineModel({
      buffer,
      output,
      settings,
      registry,
      urlState,
    });
    model.selectEngineEntry({
      engineId: "quickjs",
      language: "javascript",
      label: "",
    });
    await model.initializeSelectedEngine();
    expect(model.engineStatus()).toBe("ready");

    const factorySpy = vi.spyOn(registry, "loadFactory");
    // Same entry: must NOT re-terminate and re-init
    model.selectEngineEntry({
      engineId: "quickjs",
      language: "javascript",
      label: "",
    });
    expect(factorySpy).not.toHaveBeenCalled();
    expect(model.engineStatus()).toBe("ready");
  });

  it("same-entry selectEngineEntry in error state does NOT internally retry", async () => {
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
    model.selectEngineEntry({
      engineId: "quickjs",
      language: "javascript",
      label: "",
    });
    await model.initializeSelectedEngine();
    expect(model.engineStatus()).toBe("error");

    // Spy on the broken registry — it would be called again if select auto-retried
    const factorySpy = vi.spyOn(brokenRegistry, "loadFactory");
    model.selectEngineEntry({
      engineId: "quickjs",
      language: "javascript",
      label: "",
    });
    expect(factorySpy).not.toHaveBeenCalled();
    // Status remains "error" — caller is responsible for retry via initializeSelectedEngine
    expect(model.engineStatus()).toBe("error");
  });
});

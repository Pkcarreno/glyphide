import { describe, expect, it, vi, beforeEach } from "vitest";
import { createEngineModel } from "./engine";
import { createBufferModel } from "./buffer";
import { createOutputModel } from "./output";
import { createSettingsModel } from "./settings";
import { createEngineRegistry } from "../engine/registry";
import type { PersistencePort } from "../ports/persistence";
import type { UrlStatePort } from "../ports/url-state";
import { EngineMethod } from "@glyphide/rpc-protocol/constants";

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
    set: (key, val) => { data.set(key, val); },
    remove: (key) => { data.delete(key); },
  };
}

function createTestRegistry(): ReturnType<typeof createEngineRegistry> {
  return {
    engines: [],
    getDefinition: (id) => {
      if (id !== "quickjs" && id !== "mock") throw new Error(`Unknown engine: "${id}"`);
      return {
        id,
        label: "Test Engine",
        supportedLanguages: ["javascript", "typescript"],
        defaultInitParams: { timeout: 30000 },
        paramDescriptors: []
      } as any;
    },
    loadFactory: async () => {
      return () => {
        const worker: any = {
          onmessage: null,
          postMessage(msg: any) {
            setTimeout(() => {
              const onMessage = worker.onmessage;
              if (!onMessage) return;

              if (msg.method === EngineMethod.Init) {
                onMessage({ data: { jsonrpc: "2.0", id: msg.id, result: { id: "test", timeout: 30000, supportedLanguages: ["javascript"], isStateful: true, isInterruptible: true } } });
              } else if (msg.method === EngineMethod.Run) {
                onMessage({ data: { jsonrpc: "2.0", method: EngineMethod.Output, params: { type: "print", data: msg.params.code } } });
                onMessage({ data: { jsonrpc: "2.0", id: msg.id, result: { executed: true } } });
              } else if (msg.method === EngineMethod.Interrupt || msg.method === EngineMethod.Reset) {
                onMessage({ data: { jsonrpc: "2.0", id: msg.id, result: { reset: true, interrupted: true } } });
              }
            }, 10);
          },
          terminate() { },
        };
        return worker as unknown as Worker;
      };
    },
  };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    const model = createEngineModel({ buffer, output, settings, registry, urlState });
    expect(model.engineStatus()).toBe("idle");
    expect(model.activeEngineId()).toBe("quickjs");
    expect(model.activeLanguage()).toBe("javascript");
  });

  it("selectEngineEntry eagerly initializes the engine", async () => {
    const model = createEngineModel({ buffer, output, settings, registry, urlState });
    const p = model.selectEngineEntry({ engineId: "mock", language: "typescript", label: "" });
    expect(model.engineStatus()).toBe("initializing");
    await p;
    expect(model.engineStatus()).toBe("ready");
    expect(model.activeCapabilities()?.id).toBe("test");
  });

  it("executes code using mock engine and captures output", async () => {
    const model = createEngineModel({ buffer, output, settings, registry, urlState });
    await model.selectEngineEntry({ engineId: "mock", language: "javascript", label: "" });
    buffer.setContent("test code");

    await model.executeCode();
    await sleep(50);

    expect(model.engineStatus()).toBe("ready");
    const entries = output.entries();
    expect(entries.some(e => e.type === "print" && e.data === "test code")).toBe(true);
  });

  it("interrupts running execution", async () => {
    const model = createEngineModel({ buffer, output, settings, registry, urlState });
    await model.selectEngineEntry({ engineId: "mock", language: "javascript", label: "" });

    buffer.setContent("test");
    const execPromise = model.executeCode();
    await model.interruptExecution();
    await execPromise;
    expect(model.engineStatus()).toBe("ready");
  });

  it("parses engine and language from urlState if available", () => {
    urlState.set("engine", "mock:typescript");
    const model = createEngineModel({ buffer, output, settings, registry, urlState });
    expect(model.activeEngineId()).toBe("mock");
    expect(model.activeLanguage()).toBe("typescript");
  });

  it("falls back to quickjs if urlState contains an unknown engine", () => {
    urlState.set("engine", "unknown-engine:python");
    const model = createEngineModel({ buffer, output, settings, registry, urlState });
    expect(model.activeEngineId()).toBe("quickjs");
    expect(model.activeLanguage()).toBe("javascript");
  });

  it("enters error state if initialization fails", async () => {
    const brokenRegistry = {
      ...registry,
      loadFactory: async () => {
        throw new Error("Factory failed");
      }
    };
    const model = createEngineModel({ buffer, output, settings, registry: brokenRegistry, urlState });
    await model.selectEngineEntry({ engineId: "mock", language: "plaintext", label: "" });
    expect(model.engineStatus()).toBe("error");
    const entries = output.entries();
    expect(entries[entries.length - 1].data).toContain("Factory failed");
  });

  it("clears output on run if setting is enabled", async () => {
    settings.updateSettings({ isClearOnRunEnabled: true });
    const model = createEngineModel({ buffer, output, settings, registry, urlState });
    await model.selectEngineEntry({ engineId: "mock", language: "javascript", label: "" });
    
    output.appendEntry("system", "old logs");
    expect(output.entries().length).toBeGreaterThan(0);
    
    buffer.setContent("test");
    await model.executeCode();
    
    // Output should only contain the run logs, old logs are cleared
    expect(output.entries().some(e => e.data === "old logs")).toBe(false);
  });
});

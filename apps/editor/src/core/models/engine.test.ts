import { describe, expect, it, vi, beforeEach } from "vitest";
import { createEngineModel } from "./engine";
import { createBufferModel } from "./buffer";
import { createOutputModel } from "./output";
import { createSettingsModel } from "./settings";
import { createEngineRegistry } from "../engine/registry";
import type { PersistencePort } from "../ports/persistence";
import type { UrlStatePort } from "../ports/url-state";

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

import { EngineMethod } from "@glyphide/rpc-protocol/constants";

function createTestRegistry(): ReturnType<typeof createEngineRegistry> {
  return {
    engines: [],
    getDefinition: () => ({} as any),
    loadFactory: async () => {
      return () => {
        const worker: any = {
          onmessage: null,
          postMessage(msg: any) {
            setTimeout(() => {
              const onMessage = worker.onmessage;
              if (!onMessage) return;

              if (msg.method === EngineMethod.Init) {
                onMessage({ data: { jsonrpc: "2.0", id: msg.id, result: { timeout: 30000 } } });
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
    expect(model.status()).toBe("idle");
    expect(model.activeEngineId()).toBe("quickjs");
  });

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  it("executes code using mock engine and captures output", async () => {
    const model = createEngineModel({ buffer, output, settings, registry, urlState });
    model.selectEngine("mock");
    buffer.setContent("test code");

    await model.executeCode();

    await sleep(50);

    expect(model.status()).toBe("idle");
    const entries = output.entries();
    console.log("TEST 1 entries:", entries);

    expect(entries.some(e => e.type === "system" && e.data === "Engine ready.")).toBe(true);
    expect(entries.some(e => e.type === "print" && e.data === "test code")).toBe(true);
  });

  it("clears output on run if setting is enabled", async () => {
    const model = createEngineModel({ buffer, output, settings, registry, urlState });
    model.selectEngine("mock");
    buffer.setContent("code1");
    settings.updateSettings({ isClearOnRunEnabled: true });

    await model.executeCode();
    await sleep(50);
    const lengthAfterFirst = output.entries().length;
    expect(lengthAfterFirst).toBeGreaterThan(0);

    buffer.setContent("code2");
    await model.executeCode();
    await sleep(50);

    console.log("TEST 2 entries:", output.entries());
    expect(output.entries().length).toBe(1);
    expect(output.entries().find(e => e.type === "print")?.data).toBe("code2");
  });

  it("interrupts running execution", async () => {
    const model = createEngineModel({ buffer, output, settings, registry, urlState });
    model.selectEngine("mock");

    buffer.setContent("test");
    const execPromise = model.executeCode();
    await model.interruptExecution();
    await execPromise;
    expect(model.status()).toBe("idle");
  });

  describe("onBufferUpdated", () => {
    it("sets the active engine in the URL if code is not empty and no engine exists in URL", () => {
      const model = createEngineModel({ buffer, output, settings, registry, urlState });
      
      expect(urlState.get("engine")).toBeNull();
      
      model.onBufferUpdated("const a = 1;");
      
      expect(urlState.get("engine")).toBe("quickjs");
    });

    it("does not override the engine in the URL if it is already set", () => {
      const model = createEngineModel({ buffer, output, settings, registry, urlState });
      
      urlState.set("engine", "mock-engine");
      
      model.onBufferUpdated("const a = 1;");
      
      expect(urlState.get("engine")).toBe("mock-engine");
    });

    it("does not set the engine in the URL if code is empty", () => {
      const model = createEngineModel({ buffer, output, settings, registry, urlState });
      
      expect(urlState.get("engine")).toBeNull();
      
      model.onBufferUpdated("   ");
      
      expect(urlState.get("engine")).toBeNull();
    });
  });
});

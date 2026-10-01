import { EngineMethod } from "@glyphide/rpc-protocol/constants";
import type { CanonicalState } from "@glyphide/url-migration/types";
import { waitFor } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { createEngineRegistry } from "../engine/registry.ts";
import type { PersistencePort } from "../ports/persistence.ts";
import type { UrlPersistencePort } from "../ports/url-persistence.ts";
import { createEngineModel } from "./engine.ts";
import { createOutputModel } from "./output.ts";
import { createWorkspaceSession, type WorkspaceSession } from "./session.ts";
import { createSettingsModel } from "./settings.ts";

function createMockPersistence(): PersistencePort {
  const data = new Map();
  return {
    get: (key) => data.get(key) ?? null,
    remove: (key) => data.delete(key),
    set: (key, val) => data.set(key, val),
  };
}

function createMockUrlPersistence(
  state: CanonicalState | null = null
): UrlPersistencePort & {
  clearCalls: number;
  saveCalls: CanonicalState[];
} {
  let current: CanonicalState | null = state;
  const saveCalls: CanonicalState[] = [];
  let clearCalls = 0;
  return {
    clear: vi.fn(() => {
      clearCalls += 1;
      current = null;
    }),
    clearCalls,
    load: vi.fn(() => current),
    save: vi.fn((next: CanonicalState) => {
      current = next;
      saveCalls.push(next);
      return { isShareable: true };
    }),
    saveCalls,
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
        defaultInitParams: { timeout: 30_000 },
        fileExtensions: [".js"],
        id,
        label: "Test Engine",
        paramDescriptors: [],
        supportedLanguages: ["javascript", "typescript"],
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
                  id: msg.id,
                  jsonrpc: "2.0",
                  result: {
                    id: "test",
                    isInterruptible: true,
                    isStateful: true,
                    supportedLanguages: ["javascript"],
                    timeout: 30_000,
                  },
                },
              });
            } else if (msg.method === EngineMethod.Run) {
              const params = msg.params as Record<string, unknown>;
              onMessage({
                data: {
                  jsonrpc: "2.0",
                  method: EngineMethod.Output,
                  params: { data: params.code, type: "print" },
                },
              });
              onMessage({
                data: {
                  id: msg.id,
                  jsonrpc: "2.0",
                  result: { executed: true },
                },
              });
            } else if (
              msg.method === EngineMethod.Interrupt ||
              msg.method === EngineMethod.Reset
            ) {
              onMessage({
                data: {
                  id: msg.id,
                  jsonrpc: "2.0",
                  result: { interrupted: true, reset: true },
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
    resolveByExtension: () => null,
    supportedExtensions: [".js"],
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("EngineModel (Integration)", () => {
  let session: WorkspaceSession;
  let output: ReturnType<typeof createOutputModel>;
  let settings: ReturnType<typeof createSettingsModel>;
  let registry: ReturnType<typeof createEngineRegistry>;
  let urlPersistence: ReturnType<typeof createMockUrlPersistence>;

  beforeEach(() => {
    urlPersistence = createMockUrlPersistence();
    registry = createTestRegistry();
    session = createWorkspaceSession({
      engineRegistry: registry,
      isDefaultCodeEnabled: () => false,
      urlPersistence,
    });
    output = createOutputModel();
    settings = createSettingsModel(createMockPersistence());
    settings.updateSettings({ isClearOnRunEnabled: false });
  });

  it("initializes in idle state", () => {
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });
    expect(model.engineStatus()).toBe("idle");
    expect(model.activeEngineId()).toBe("quickjs");
    expect(model.activeLanguage()).toBe("javascript");
  });

  it("selectEngineEntry is selection-only; initializeSelectedEngine transitions to ready", async () => {
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });
    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "typescript",
    });
    expect(model.activeEngineId()).toBe("mock");
    expect(model.activeLanguage()).toBe("typescript");
    expect(model.engineStatus()).toBe("idle");

    const p = model.initializeSelectedEngine();
    expect(model.engineStatus()).toBe("initializing");
    await p;
    expect(model.engineStatus()).toBe("ready");
    expect(model.activeCapabilities()?.id).toBe("test");
  });

  it("executes code using mock engine and captures output", async () => {
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });
    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "javascript",
    });
    await model.initializeSelectedEngine();
    session.setCode("test code");

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
      output,
      registry,
      session,
      settings,
    });
    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "javascript",
    });
    await model.initializeSelectedEngine();

    session.setCode("test");
    const execPromise = model.executeCode();
    await model.interruptExecution();
    await execPromise;
    expect(model.engineStatus()).toBe("ready");
  });

  it("reads engine and language from session initialized from urlState", () => {
    urlPersistence.save({
      code: "",
      engine: "mock",
      language: "typescript",
      name: "",
    });
    const urlSession = createWorkspaceSession({
      engineRegistry: registry,
      isDefaultCodeEnabled: () => false,
      urlPersistence,
    });
    const model = createEngineModel({
      output,
      registry,
      session: urlSession,
      settings,
    });
    expect(model.activeEngineId()).toBe("mock");
    expect(model.activeLanguage()).toBe("typescript");
  });

  it("falls back to quickjs if urlState contains an unknown engine", () => {
    urlPersistence.save({
      code: "",
      engine: "unknown-engine",
      language: "python",
      name: "",
    });
    const fallbackSession = createWorkspaceSession({
      engineRegistry: registry,
      isDefaultCodeEnabled: () => false,
      urlPersistence,
    });
    const model = createEngineModel({
      output,
      registry,
      session: fallbackSession,
      settings,
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
      output,
      registry: brokenRegistry,
      session,
      settings,
    });
    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "plaintext",
    });
    await model.initializeSelectedEngine();
    expect(model.engineStatus()).toBe("error");

    await waitFor(() => {
      const entries = output.entries();
      expect(entries.at(-1)?.data).toContain("Factory failed");
    });
  });

  it("clears output on run if setting is enabled", async () => {
    settings.updateSettings({ isClearOnRunEnabled: true });
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });
    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "javascript",
    });
    await model.initializeSelectedEngine();

    output.appendEntry("system", "old logs");
    expect(output.entries().length).toBeGreaterThan(0);

    session.setCode("test");
    await model.executeCode();

    expect(output.entries().some((e) => e.data === "old logs")).toBe(false);
  });

  it("updates isDirty state only if modified while running", async () => {
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });

    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "javascript",
    });
    await model.initializeSelectedEngine();

    expect(model.isDirty()).toBe(false);

    session.setCode("new code");
    expect(model.isDirty()).toBe(false);

    const execPromise = model.executeCode();

    const waitForRunning = async (): Promise<void> => {
      if (model.engineStatus() === "running") {
        return;
      }
      await sleep(2);
      await waitForRunning();
    };
    await waitForRunning();

    session.setCode("modified while running");
    expect(model.isDirty()).toBe(true);

    await execPromise;
    await sleep(20);

    expect(model.isDirty()).toBe(false);
  });

  it("clears output when switching to a different engine", async () => {
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });
    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "javascript",
    });
    await model.initializeSelectedEngine();

    output.appendEntry("log", "previous engine log");
    expect(output.entries().length).toBeGreaterThan(0);

    model.selectEngineEntry({
      engineId: "quickjs",
      label: "",
      language: "javascript",
    });

    expect(output.entries().some((e) => e.data === "previous engine log")).toBe(
      false
    );
  });

  it("does not clear output when re-selecting the same engine and language", async () => {
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });
    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "javascript",
    });
    await model.initializeSelectedEngine();

    output.appendEntry("log", "important log");
    await waitFor(() => {
      expect(output.entries().some((e) => e.data === "important log")).toBe(
        true
      );
    });

    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "javascript",
    });

    expect(output.entries().some((e) => e.data === "important log")).toBe(true);
  });

  it("clears output on engine switch regardless of isClearOnRunEnabled", async () => {
    expect(settings.settings.isClearOnRunEnabled).toBe(false);

    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });
    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "javascript",
    });
    await model.initializeSelectedEngine();

    output.appendEntry("log", "pre-switch log");

    model.selectEngineEntry({
      engineId: "micropython",
      label: "",
      language: "python",
    });

    expect(output.entries().some((e) => e.data === "pre-switch log")).toBe(
      false
    );
  });
});

describe("EngineModel URL conditional persistence (delegated to WorkspaceSession)", () => {
  let session: WorkspaceSession;
  let output: ReturnType<typeof createOutputModel>;
  let settings: ReturnType<typeof createSettingsModel>;
  let registry: ReturnType<typeof createEngineRegistry>;
  let urlPersistence: ReturnType<typeof createMockUrlPersistence>;

  beforeEach(() => {
    urlPersistence = createMockUrlPersistence();
    registry = createTestRegistry();
    session = createWorkspaceSession({
      engineRegistry: registry,
      isDefaultCodeEnabled: () => false,
      urlPersistence,
    });
    output = createOutputModel();
    settings = createSettingsModel(createMockPersistence());
    settings.updateSettings({ isClearOnRunEnabled: false });
  });

  it("clearing code removes engine from URL", () => {
    session.setCode("hello");
    expect(urlPersistence.load()?.engine).toBe("quickjs");

    session.setCode("");
    expect(urlPersistence.load()).toBeNull();
    expect(urlPersistence.clear).toHaveBeenCalled();
  });

  it("clearing code with no engine in URL leaves URL without engine", () => {
    expect(urlPersistence.load()).toBeNull();
    session.setCode("");
    expect(urlPersistence.load()).toBeNull();
  });

  it("typing code with no engine in URL writes the active engine", () => {
    expect(urlPersistence.load()).toBeNull();
    session.setCode("code");
    expect(urlPersistence.load()?.engine).toBe("quickjs");
  });

  it("selectEngineEntry with non-empty code writes engine to URL", () => {
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });
    session.setCode("hello world");

    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "javascript",
    });

    expect(urlPersistence.load()?.engine).toBe("mock");
  });

  it("selectEngineEntry with empty code skips URL write", () => {
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });
    const saveCallsBefore = urlPersistence.saveCalls.length;

    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "javascript",
    });

    expect(model.activeEngineId()).toBe("mock");
    expect(urlPersistence.saveCalls.length).toBe(saveCallsBefore);
  });
});

describe("EngineModel select/init split contract", () => {
  let session: WorkspaceSession;
  let output: ReturnType<typeof createOutputModel>;
  let settings: ReturnType<typeof createSettingsModel>;
  let registry: ReturnType<typeof createEngineRegistry>;
  let urlPersistence: ReturnType<typeof createMockUrlPersistence>;

  beforeEach(() => {
    urlPersistence = createMockUrlPersistence();
    registry = createTestRegistry();
    session = createWorkspaceSession({
      engineRegistry: registry,
      isDefaultCodeEnabled: () => false,
      urlPersistence,
    });
    output = createOutputModel();
    settings = createSettingsModel(createMockPersistence());
    settings.updateSettings({ isClearOnRunEnabled: false });
  });

  it("selectEngineEntry is synchronous (void return type) and does NOT spawn worker", () => {
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });
    const factorySpy = vi.spyOn(registry, "loadFactory");

    const result = model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "javascript",
    });
    expect(result).toBeUndefined();

    expect(model.activeEngineId()).toBe("mock");
    expect(model.activeLanguage()).toBe("javascript");
    expect(model.engineStatus()).toBe("idle");
    expect(factorySpy).not.toHaveBeenCalled();
  });

  it("initializeSelectedEngine on idle transitions to ready and populates capabilities", async () => {
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });
    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "javascript",
    });

    const p = model.initializeSelectedEngine();
    expect(model.engineStatus()).toBe("initializing");
    await p;
    expect(model.engineStatus()).toBe("ready");
    expect(model.activeCapabilities()?.id).toBe("test");
  });

  it("initializeSelectedEngine is idempotent on ready (no worker restart)", async () => {
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });
    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "javascript",
    });
    await model.initializeSelectedEngine();
    expect(model.engineStatus()).toBe("ready");

    const factorySpy = vi.spyOn(registry, "loadFactory");
    await model.initializeSelectedEngine();
    expect(factorySpy).not.toHaveBeenCalled();
    expect(model.engineStatus()).toBe("ready");
  });

  it("initializeSelectedEngine retries on error: terminate first, then init", async () => {
    let shouldFail: boolean;
    shouldFail = true;
    const mutableRegistry = {
      ...registry,
      loadFactory: () =>
        shouldFail
          ? Promise.reject(new Error("Factory failed"))
          : registry.loadFactory("mock"),
    };
    const model = createEngineModel({
      output,
      registry: mutableRegistry,
      session,
      settings,
    });
    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "javascript",
    });

    await model.initializeSelectedEngine();
    expect(model.engineStatus()).toBe("error");

    shouldFail = false;

    await model.initializeSelectedEngine();
    expect(model.engineStatus()).toBe("ready");
  });

  it("initializeSelectedEngine is no-op on blocked (no worker spawn)", async () => {
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });
    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "javascript",
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
      output,
      registry,
      session,
      settings,
    });
    const factorySpy = vi.spyOn(registry, "loadFactory");

    model.selectEngineEntry({
      engineId: "quickjs",
      label: "",
      language: "javascript",
    });

    expect(factorySpy).not.toHaveBeenCalled();
    expect(model.engineStatus()).toBe("idle");
    expect(model.activeEngineId()).toBe("quickjs");
    expect(model.activeLanguage()).toBe("javascript");
  });

  it("same-entry selectEngineEntry is a no-op when ready (no worker restart)", async () => {
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });
    model.selectEngineEntry({
      engineId: "quickjs",
      label: "",
      language: "javascript",
    });
    await model.initializeSelectedEngine();
    expect(model.engineStatus()).toBe("ready");

    const factorySpy = vi.spyOn(registry, "loadFactory");
    model.selectEngineEntry({
      engineId: "quickjs",
      label: "",
      language: "javascript",
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
      output,
      registry: brokenRegistry,
      session,
      settings,
    });
    model.selectEngineEntry({
      engineId: "quickjs",
      label: "",
      language: "javascript",
    });
    await model.initializeSelectedEngine();
    expect(model.engineStatus()).toBe("error");

    const factorySpy = vi.spyOn(brokenRegistry, "loadFactory");
    model.selectEngineEntry({
      engineId: "quickjs",
      label: "",
      language: "javascript",
    });
    expect(factorySpy).not.toHaveBeenCalled();
    expect(model.engineStatus()).toBe("error");
  });
});

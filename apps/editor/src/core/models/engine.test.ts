import { EngineMethod } from "@glyphide/rpc-protocol/constants";
import type { CanonicalState } from "@glyphide/url-migration/types";
import { waitFor } from "@solidjs/testing-library";
import { createEffect, createRoot, flush, isPending, resolve } from "solid-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { createEngineRegistry } from "../engine/registry.ts";
import type { PersistencePort } from "../ports/persistence.ts";
import type { UrlPersistencePort } from "../ports/url-persistence.ts";
import { createEngineModel as baseCreateEngineModel } from "./engine.ts";
import { createOutputModel } from "./output.ts";
import {
  createWorkspaceSession as baseCreateWorkspaceSession,
  type WorkspaceSession,
} from "./session.ts";
import { createSettingsModel } from "./settings.ts";

function withFlush<T extends object>(target: T): T {
  return new Proxy(target, {
    get(t, prop, receiver) {
      const val = Reflect.get(t, prop, receiver);
      if (typeof val === "function") {
        return (...args: unknown[]) => {
          const res = val.apply(t, args);
          flush();
          return res;
        };
      }
      return val;
    },
  });
}

function createEngineModel(deps: Parameters<typeof baseCreateEngineModel>[0]) {
  return withFlush(baseCreateEngineModel(deps));
}

function createWorkspaceSession(
  deps: Parameters<typeof baseCreateWorkspaceSession>[0]
) {
  return withFlush(baseCreateWorkspaceSession(deps));
}

function createDeferred<T>() {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolvePromise = res;
    rejectPromise = rej;
  });
  return { promise, reject: rejectPromise, resolve: resolvePromise };
}

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

function createMockWorker(onTerminate?: () => void): Worker {
  const worker = {
    onmessage: null as ((msg: unknown) => void) | null,
    postMessage(msg: Record<string, unknown>) {
      setTimeout(() => {
        const onMessage = worker.onmessage;
        if (!onMessage) {
          return;
        }

        if (msg.method === EngineMethod.Init) {
          const params = (msg.params ?? {}) as Record<string, unknown>;
          onMessage({
            data: {
              id: msg.id,
              jsonrpc: "2.0",
              result: {
                id: "test",
                isInterruptible: true,
                isStateful: true,
                supportedLanguages: ["javascript"],
                timeout:
                  typeof params.timeout === "number" ? params.timeout : 30_000,
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
      onTerminate?.();
    },
  };
  return worker as unknown as Worker;
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
        supportedLanguages: ["javascript", "typescript", "python"],
      } as unknown as ReturnType<
        ReturnType<typeof createEngineRegistry>["getDefinition"]
      >;
    },
    loadFactory: async () => () => createMockWorker(),
    resolveByExtension: () => null,
    supportedExtensions: [".js"],
  };
}

const sleep = (ms: number) =>
  new Promise((resolveFn) => setTimeout(resolveFn, ms));

describe("EngineModel (Declarative Async Lifecycle)", () => {
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

  it("initializes workers and populates capabilities as an async computation", async () => {
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });

    expect(model.activeEngineId()).toBe("quickjs");
    expect(model.activeLanguage()).toBe("javascript");

    const activeEngine = await resolve(() => model.engine());
    expect(activeEngine).not.toBeNull();
    expect(activeEngine?.engineId).toBe("quickjs");
    expect(activeEngine?.language).toBe("javascript");
    expect(model.activeCapabilities()?.id).toBe("test");
    expect(model.activeInitParams()?.timeout).toBe(30_000);

    model.dispose();
  });

  it("holds the current engine state during switches until the target worker confirms readiness", async () => {
    const micropythonDeferred = createDeferred<() => Worker>();
    const terminatedEngines: string[] = [];

    const stagedRegistry: ReturnType<typeof createEngineRegistry> = {
      ...registry,
      loadFactory: (id) => {
        if (id === "micropython") {
          return micropythonDeferred.promise;
        }
        return Promise.resolve(() =>
          createMockWorker(() => terminatedEngines.push(id))
        );
      },
    };

    const model = createEngineModel({
      output,
      registry: stagedRegistry,
      session,
      settings,
    });

    const initialEngine = await resolve(() => model.engine());
    expect(initialEngine?.engineId).toBe("quickjs");

    let observedPending = false;
    let heldEngineId: string | undefined;
    const stopObserve = createRoot((dispose) => {
      createEffect(
        () => ({
          engine: model.engine(),
          pending: isPending(() => model.engine()),
        }),
        ({ engine, pending }) => {
          observedPending = pending;
          heldEngineId = engine?.engineId;
        }
      );
      return dispose;
    });
    flush();

    expect(observedPending).toBe(false);
    expect(heldEngineId).toBe("quickjs");

    // Switch to MicroPython while factory loading is still pending
    model.selectEngineEntry({
      engineId: "micropython",
      label: "",
      language: "python",
    });

    // Previous QuickJS engine remains committed and NOT terminated while MicroPython loads
    expect(observedPending).toBe(true);
    expect(heldEngineId).toBe("quickjs");
    expect(terminatedEngines).toEqual([]);

    // Resolve MicroPython worker factory
    micropythonDeferred.resolve(() =>
      createMockWorker(() => terminatedEngines.push("micropython"))
    );

    const switchedEngine = await resolve(() => model.engine());
    flush();

    expect(switchedEngine?.engineId).toBe("micropython");
    expect(switchedEngine?.language).toBe("python");
    expect(observedPending).toBe(false);
    expect(heldEngineId).toBe("micropython");
    expect(terminatedEngines).toEqual(["quickjs"]);

    stopObserve();
    model.dispose();
    expect(terminatedEngines).toEqual(["quickjs", "micropython"]);
  });

  it("cancels and cleans up an in-flight worker when superseded before readiness", async () => {
    const slowMicropython = createDeferred<() => Worker>();
    const terminatedEngines: string[] = [];

    const stagedRegistry: ReturnType<typeof createEngineRegistry> = {
      ...registry,
      loadFactory: (id) => {
        if (id === "micropython") {
          return slowMicropython.promise;
        }
        return Promise.resolve(() =>
          createMockWorker(() => terminatedEngines.push(id))
        );
      },
    };

    const model = createEngineModel({
      output,
      registry: stagedRegistry,
      session,
      settings,
    });

    await resolve(() => model.engine());

    model.selectEngineEntry({
      engineId: "micropython",
      label: "",
      language: "python",
    });
    model.selectEngineEntry({
      engineId: "mock",
      label: "",
      language: "plaintext",
    });

    const mockEngine = await resolve(() => model.engine());
    expect(mockEngine?.engineId).toBe("mock");

    // Even if slow MicroPython resolves later, it must clean up and never take over
    slowMicropython.resolve(() =>
      createMockWorker(() => terminatedEngines.push("micropython-late"))
    );
    await sleep(30);

    expect(model.engine()?.engineId).toBe("mock");
    expect(terminatedEngines).toContain("quickjs");

    model.dispose();
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
    await resolve(() => model.engine());
    session.setCode("test code");

    await model.executeCode();
    await sleep(50);

    expect(model.isRunning()).toBe(false);
    const entries = output.entries();
    expect(
      entries.some((e) => e.type === "print" && e.data === "test code")
    ).toBe(true);

    model.dispose();
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
    await resolve(() => model.engine());

    session.setCode("test");
    const execPromise = model.executeCode();
    await model.interruptExecution();
    await execPromise;
    expect(model.isRunning()).toBe(false);

    model.dispose();
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

    model.dispose();
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

    model.dispose();
  });

  it("surfaces initialization failure and recovers via refresh in retryInit", async () => {
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

    await expect(resolve(() => model.engine())).rejects.toThrow(
      "Factory failed"
    );

    await waitFor(() => {
      const entries = output.entries();
      expect(entries.at(-1)?.data).toContain("Factory failed");
    });

    shouldFail = false;
    await model.retryInit();

    const recovered = await resolve(() => model.engine());
    expect(recovered?.engineId).toBe("quickjs");
    expect(model.activeCapabilities()?.id).toBe("test");

    model.dispose();
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
    await resolve(() => model.engine());

    output.appendEntry("system", "old logs");
    expect(output.entries().length).toBeGreaterThan(0);

    session.setCode("test");
    await model.executeCode();

    expect(output.entries().some((e) => e.data === "old logs")).toBe(false);

    model.dispose();
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
    await resolve(() => model.engine());

    expect(model.isDirty()).toBe(false);

    session.setCode("new code");
    expect(model.isDirty()).toBe(false);

    const execPromise = model.executeCode();

    const waitForRunning = async (): Promise<void> => {
      if (model.isRunning()) {
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

    model.dispose();
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
    await resolve(() => model.engine());

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

    model.dispose();
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
    await resolve(() => model.engine());

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

    model.dispose();
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
    await resolve(() => model.engine());

    output.appendEntry("log", "pre-switch log");

    model.selectEngineEntry({
      engineId: "micropython",
      label: "",
      language: "python",
    });

    expect(output.entries().some((e) => e.data === "pre-switch log")).toBe(
      false
    );

    model.dispose();
  });

  it("updates engine config declaratively and re-initializes with patched params", async () => {
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });

    const initial = await resolve(() => model.engine());
    expect(initial?.initParams.timeout).toBe(30_000);

    await model.updateEngineConfig({ timeout: 5000 });
    const updated = await resolve(() => model.engine());
    expect(updated?.initParams.timeout).toBe(5000);
    expect(updated?.orchestrator).not.toBe(initial?.orchestrator);

    model.dispose();
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
    model.dispose();
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
    model.dispose();
  });
});

describe("EngineModel trust gate contract", () => {
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

  it("does not spawn a worker when trust is required at startup", async () => {
    const urlSession = createWorkspaceSession({
      engineRegistry: registry,
      isDefaultCodeEnabled: () => false,
      urlPersistence: createMockUrlPersistence({
        code: "console.log(1)",
        engine: "mock",
        language: "javascript",
        name: "",
      }),
    });
    const factorySpy = vi.spyOn(registry, "loadFactory");

    const model = createEngineModel({
      output,
      registry,
      session: urlSession,
      settings,
    });

    expect(model.isBlocked()).toBe(true);
    expect(await resolve(() => model.engine())).toBeNull();
    expect(factorySpy).not.toHaveBeenCalled();

    model.dispose();
  });

  it("resolves to null on setBlocked(true) and initializes when unblocked", async () => {
    const factorySpy = vi.spyOn(registry, "loadFactory");
    session.markTrustRequired();
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });

    expect(model.isBlocked()).toBe(true);
    expect(await resolve(() => model.engine())).toBeNull();
    expect(factorySpy).not.toHaveBeenCalled();

    model.setBlocked(false);
    expect(model.isBlocked()).toBe(false);

    const initialized = await resolve(() => model.engine());
    expect(initialized?.engineId).toBe("quickjs");
    expect(factorySpy).toHaveBeenCalledWith("quickjs");

    model.dispose();
  });

  it("same-entry selectEngineEntry is a no-op when ready (no worker restart)", async () => {
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });
    const initial = await resolve(() => model.engine());
    expect(initial?.engineId).toBe("quickjs");

    const factorySpy = vi.spyOn(registry, "loadFactory");
    model.selectEngineEntry({
      engineId: "quickjs",
      label: "",
      language: "javascript",
    });
    expect(factorySpy).not.toHaveBeenCalled();
    expect(await resolve(() => model.engine())).toBe(initial);

    model.dispose();
  });

  it("executeCode initializes selected engine after session engine changes", async () => {
    const factorySpy = vi.spyOn(registry, "loadFactory");
    const model = createEngineModel({
      output,
      registry,
      session,
      settings,
    });

    await resolve(() => model.engine());
    expect(factorySpy).toHaveBeenCalledWith("quickjs");

    session.selectEngine("mock", "javascript");
    session.setCode("print('switched')");
    await model.executeCode();

    expect(factorySpy).toHaveBeenCalledWith("mock");
    expect(model.engine()?.engineId).toBe("mock");

    model.dispose();
  });
});

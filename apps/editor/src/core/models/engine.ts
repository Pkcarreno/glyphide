import { EngineOrchestrator } from "@glyphide/orchestrator";
import type {
  EngineCapabilities,
  EngineInitParams,
  EngineOutputPayload,
} from "@glyphide/rpc-protocol/types";
import type { Accessor } from "solid-js";
import { createSignal } from "solid-js";
import type {
  EngineEntry,
  EngineId,
  EngineRegistry,
} from "../engine/registry.ts";
import type { UrlStatePort } from "../ports/url-state.ts";
import type { BufferModel } from "./buffer.ts";
import type { OutputModel } from "./output.ts";
import type { SettingsModel } from "./settings.ts";

/**
 * Execution lifecycle states for the active engine.
 *
 * @public
 */
export type EngineStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "running"
  | "error"
  | "blocked";

/** Dependencies injected into the engine model. */
export interface EngineModelDeps {
  buffer: BufferModel;
  output: OutputModel;
  registry: EngineRegistry;
  settings: SettingsModel;
  urlState: UrlStatePort;
}

/**
 * Central engine orchestration model.
 */
export interface EngineModel {
  /** Reactive accessor for the engine capabilities. */
  activeCapabilities: Accessor<EngineCapabilities | null>;
  /** Reactive accessor for the currently selected engine ID. */
  activeEngineId: Accessor<EngineId>;
  /** Reactive accessor for the confirmed init params. */
  activeInitParams: Accessor<EngineInitParams | null>;
  /** Reactive accessor for the active language. */
  activeLanguage: Accessor<string>;
  /** Reactive accessor for the current execution status. */
  engineStatus: Accessor<EngineStatus>;

  /** Executes the current buffer content in the active engine. */
  executeCode(): Promise<void>;
  /**
   * Initializes the currently selected engine. Spawns a worker for the
   * active engine/language pair. Idempotent: no-op when the engine is
   * already ready, initializing, running, or blocked. Retries on error
   * (terminates the failed worker first).
   */
  initializeSelectedEngine(): Promise<void>;
  /** Forcefully interrupts the running execution. */
  interruptExecution(): Promise<void>;
  /** Indicates if the buffer was modified while an execution is in progress. */
  isDirty: Accessor<boolean>;
  /** Syncs engine state based on buffer updates. */
  onBufferUpdated(newCode: string): void;
  /** Retries initialization for the current entry. */
  retryInit(): Promise<void>;
  /**
   * Selects an engine entry — updates `activeEngineId` and `activeLanguage`
   * signals and persists the engine to the URL — but does NOT spawn or
   * initialize any engine worker. Use `initializeSelectedEngine` to spawn.
   */
  selectEngineEntry(entry: EngineEntry): void;
  /** Sets the engine status to blocked (used when trust is required). */
  setBlocked(isBlocked: boolean): void;
  /** Tears down the orchestrator and releases resources. */
  terminate(): void;
  /** Updates the engine config and triggers a re-INIT. */
  updateEngineConfig(patch: Record<string, unknown>): Promise<void>;
}

/** Creates an `EngineModel` wired to the given dependencies. */
export function createEngineModel(deps: EngineModelDeps): EngineModel {
  const [engineStatus, setEngineStatus] = createSignal<EngineStatus>("idle");
  const [isDirty, setIsDirty] = createSignal<boolean>(false);
  const [isBlocked, setIsBlocked] = createSignal<boolean>(false);

  const initialEngineState = deps.urlState.get("engine") as string | null;

  let resolvedEngineId: EngineId = "quickjs";
  let resolvedLanguage: string | undefined;

  if (initialEngineState) {
    const parts = initialEngineState.split(":");
    resolvedEngineId = parts[0];
    if (parts.length > 1) {
      resolvedLanguage = parts[1];
    }
  }

  let def: ReturnType<EngineRegistry["getDefinition"]>;
  try {
    def = deps.registry.getDefinition(resolvedEngineId);
    if (
      resolvedLanguage &&
      !def.supportedLanguages.includes(resolvedLanguage)
    ) {
      resolvedLanguage = undefined;
    }
  } catch {
    resolvedEngineId = "quickjs";
    def = deps.registry.getDefinition(resolvedEngineId);
    resolvedLanguage = undefined;
  }

  const [activeEngineId, setActiveEngineId] =
    createSignal<EngineId>(resolvedEngineId);
  const [activeLanguage, setActiveLanguage] = createSignal<string>(
    resolvedLanguage ?? def.supportedLanguages[0]
  );

  // Tracks the engine ID we have most recently written to the URL.
  // - Initialized from URL when URL had an engine (no redundant write on first
  //   buffer update per REQ-ENG-005).
  // - Initialized to null when URL had no engine, so the first buffer update
  //   with code writes the active engine (REQ-ENG-001 scenario 1).
  // - Reset to null whenever the URL's engine is removed (empty buffer) or
  //   when selectEngineEntry runs against an empty buffer (URL stays stale
  //   until the next buffer update re-seeds it).
  let lastWrittenEngineId: EngineId | null = initialEngineState
    ? resolvedEngineId
    : null;

  const [activeInitParams, setActiveInitParams] =
    createSignal<EngineInitParams | null>(null);
  const [activeCapabilities, setActiveCapabilities] =
    createSignal<EngineCapabilities | null>(null);

  let orchestrator: EngineOrchestrator | null = null;
  let isInitialized = false;
  let currentInitParams: EngineInitParams | null = null;

  function handleOutput(payload: EngineOutputPayload): void {
    deps.output.appendEntry(payload.type, payload.data);
  }

  /** Returns true when the buffer has non-whitespace content. */
  function shouldPersistEngine(): boolean {
    return deps.buffer.content().trim() !== "";
  }

  /**
   * Serializes the active engine ID for URL storage.
   * Multi-language engines include the language suffix; single-language
   * engines store only the ID.
   */
  function serializeEngineId(): string {
    const def = deps.registry.getDefinition(activeEngineId());
    return def.supportedLanguages.length > 1
      ? `${activeEngineId()}:${activeLanguage()}`
      : activeEngineId();
  }

  async function initializeEngine(
    params: EngineInitParams,
    message = "Initializing engine…"
  ): Promise<void> {
    setEngineStatus("initializing");
    deps.output.appendEntry("system", message);

    currentInitParams = params;

    try {
      const factory = await deps.registry.loadFactory(activeEngineId());
      orchestrator = new EngineOrchestrator({
        createWorker: factory,
        events: { onOutput: handleOutput },
      });

      const result = await orchestrator.init(params);

      isInitialized = true;
      setActiveCapabilities({
        id: result.id,
        supportedLanguages: result.supportedLanguages,
        isStateful: result.isStateful,
        isInterruptible: result.isInterruptible,
      });

      setActiveInitParams({ ...params, timeout: result.timeout });
      setEngineStatus("ready");
      deps.output.appendEntry("system", "Engine ready.");
    } catch (error) {
      isInitialized = false;
      setEngineStatus("error");
      const message = error instanceof Error ? error.message : String(error);
      deps.output.appendEntry(
        "error",
        `Engine initialization failed: ${message}`
      );
    }
  }

  function selectEngineEntry(entry: EngineEntry): void {
    if (
      entry.engineId === activeEngineId() &&
      entry.language === activeLanguage()
    ) {
      // Same entry: pure no-op. The caller is responsible for calling
      // `initializeSelectedEngine()` if a retry is needed (e.g., recovery
      // from an error state). Internal retry here would bypass the trust
      // gate on the `LOAD_FILE_FROM_DISK` same-engine edge case.
      return;
    }

    deps.output.clearEntries();
    terminate();
    setActiveEngineId(entry.engineId);
    setActiveLanguage(entry.language);

    // Only persist engine to URL if the buffer has code. The URL is a
    // reflection of state — `engine` is only meaningful when there is code
    // to execute. With an empty buffer, internal state is updated but the
    // URL is left untouched; the tracker is reset to null so the next
    // buffer update with code re-seeds the URL with the new engine.
    if (shouldPersistEngine()) {
      deps.urlState.set("engine", serializeEngineId());
      lastWrittenEngineId = entry.engineId;
    } else {
      lastWrittenEngineId = null;
    }
  }

  /**
   * Spawns (or respawns) a worker for the currently selected engine.
   * No-op when the engine is already healthy (ready/initializing/running)
   * or blocked (trust gate active). On error state, terminates the failed
   * worker before retrying.
   */
  async function initializeSelectedEngine(): Promise<void> {
    const status = engineStatusAccessor();
    if (
      status === "ready" ||
      status === "initializing" ||
      status === "running" ||
      status === "blocked"
    ) {
      return;
    }

    if (status === "error") {
      terminate();
    }

    const def = deps.registry.getDefinition(activeEngineId());
    const params: EngineInitParams = {
      language: activeLanguage(),
      ...def.defaultInitParams,
    };
    await initializeEngine(params);
  }

  async function updateEngineConfig(
    patch: Record<string, unknown>
  ): Promise<void> {
    if (!currentInitParams) {
      return;
    }
    terminate(); // Tear down to apply new config
    const newParams = { ...currentInitParams, ...patch };
    await initializeEngine(newParams, "Applying new configuration…");
  }

  async function retryInit(): Promise<void> {
    if (currentInitParams) {
      terminate();
      await initializeEngine(currentInitParams);
    }
  }

  async function executeCode(): Promise<void> {
    const code = deps.buffer.content();
    if (!code.trim()) {
      return;
    }

    if (deps.settings.settings.isClearOnRunEnabled) {
      deps.output.clearEntries();
    }

    if (engineStatus() !== "ready" && engineStatus() !== "idle") {
      if (engineStatus() === "error") {
        deps.output.appendEntry(
          "error",
          "Cannot run code: Engine initialization failed. Please retry."
        );
      }
      return;
    }

    try {
      setIsDirty(false);

      if (isInitialized && orchestrator) {
        await orchestrator.reset();
      } else {
        // Fallback: ensure the engine is initialized before running.
        await initializeSelectedEngine();
      }

      setEngineStatus("running");
      await orchestrator?.run(code);
      setEngineStatus("ready");
      setIsDirty(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.output.appendEntry("error", message);
      setEngineStatus("ready"); // Ready to try again
      setIsDirty(false);
    }
  }

  async function interruptExecution(): Promise<void> {
    if (engineStatus() !== "running" || !orchestrator) {
      return;
    }

    try {
      await orchestrator.interrupt();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.output.appendEntry("error", `Interrupt failed: ${message}`);
    }
    setEngineStatus("ready");
    setIsDirty(false);
  }

  function terminate(): void {
    orchestrator?.terminate();
    orchestrator = null;
    isInitialized = false;
    setEngineStatus("idle");
    setIsDirty(false);
    setActiveInitParams(null);
    setActiveCapabilities(null);
  }

  function onBufferUpdated(newCode: string): void {
    if (newCode.trim() === "") {
      deps.urlState.remove("engine");
      lastWrittenEngineId = null;
    } else if (activeEngineId() !== lastWrittenEngineId) {
      deps.urlState.set("engine", serializeEngineId());
      lastWrittenEngineId = activeEngineId();
    }
    if (engineStatus() === "running") {
      setIsDirty(true);
    }
  }

  function setBlocked(blocked: boolean): void {
    setIsBlocked(blocked);
    if (blocked) {
      setEngineStatus("blocked");
    } else if (engineStatus() === "blocked") {
      setEngineStatus("idle");
    }
  }

  function engineStatusAccessor(): EngineStatus {
    if (isBlocked()) {
      return "blocked";
    }
    return engineStatus();
  }

  return {
    engineStatus: engineStatusAccessor,
    activeEngineId,
    activeLanguage,
    activeInitParams,
    activeCapabilities,
    isDirty,
    executeCode,
    interruptExecution,
    initializeSelectedEngine,
    selectEngineEntry,
    updateEngineConfig,
    retryInit,
    setBlocked,
    terminate,
    onBufferUpdated,
  };
}

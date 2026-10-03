import { EngineOrchestrator } from "@glyphide/orchestrator";
import type {
  EngineCapabilities,
  EngineInitParams,
  EngineOutputPayload,
} from "@glyphide/rpc-protocol/types";
import type { Accessor } from "solid-js";
import { createEffect, createRoot, createSignal, on } from "solid-js";
import type {
  EngineEntry,
  EngineId,
  EngineRegistry,
} from "../engine/registry.ts";
import type { OutputModel } from "./output.ts";
import type { WorkspaceSession } from "./session.ts";
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
  output: OutputModel;
  registry: EngineRegistry;
  session: WorkspaceSession;
  settings: SettingsModel;
}

/**
 * Central engine orchestration model.
 * Focuses exclusively on worker lifecycle, execution execution,
 * cancellation, and stdout/stderr reporting.
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
  /** Disposes the engine reactive root and terminates running execution. */
  dispose: () => void;
  /** Reactive accessor for the current execution status. */
  engineStatus: Accessor<EngineStatus>;

  /** Executes the current buffer content in the active engine. */
  executeCode: () => Promise<void>;
  /**
   * Initializes the currently selected engine. Spawns a worker for the
   * active engine/language pair. Idempotent: no-op when the engine is
   * already ready, initializing, running, or blocked. Retries on error
   * (terminates the failed worker first).
   */
  initializeSelectedEngine: () => Promise<void>;
  /** Forcefully interrupts the running execution. */
  interruptExecution: () => Promise<void>;
  /** Indicates if the buffer was modified while an execution is in progress. */
  isDirty: Accessor<boolean>;
  /** Retries initialization for the current entry. */
  retryInit: () => Promise<void>;
  /**
   * Selects an engine entry in the workspace session and resets engine execution.
   */
  selectEngineEntry: (entry: EngineEntry) => void;
  /** Sets the engine status to blocked (used when trust is required). */
  setBlocked: (isBlocked: boolean) => void;
  /** Tears down the orchestrator and releases resources. */
  terminate: () => void;
  /** Updates the engine config and triggers a re-INIT. */
  updateEngineConfig: (patch: Record<string, unknown>) => Promise<void>;
}

/** Creates an `EngineModel` wired to the given dependencies. */
export function createEngineModel(deps: EngineModelDeps): EngineModel {
  const [engineStatus, setEngineStatus] = createSignal<EngineStatus>("idle");
  const [isDirty, setIsDirty] = createSignal<boolean>(false);
  const [isBlocked, setIsBlocked] = createSignal<boolean>(false);

  const [activeInitParams, setActiveInitParams] =
    createSignal<EngineInitParams | null>(null);
  const [activeCapabilities, setActiveCapabilities] =
    createSignal<EngineCapabilities | null>(null);

  let orchestrator: EngineOrchestrator | null = null;
  let isInitialized = false;
  let initializedEngineId: EngineId | null = null;
  let initializedLanguage: string | null = null;
  let currentInitParams: EngineInitParams | null = null;
  let disposeEffect: (() => void) | null = null;

  // Track code edits while execution is running to set isDirty automatically
  createRoot((disposeRoot) => {
    disposeEffect = disposeRoot;
    createEffect(
      on(
        deps.session.code,
        () => {
          if (engineStatus() === "running") {
            setIsDirty(true);
          }
        },
        { defer: true }
      )
    );
  });

  function handleOutput(payload: EngineOutputPayload): void {
    deps.output.appendEntry(payload.type, payload.data);
  }

  async function initializeEngine(
    params: EngineInitParams,
    message = "Initializing engine…"
  ): Promise<void> {
    setEngineStatus("initializing");
    deps.output.appendEntry("system", message);

    currentInitParams = params;

    try {
      const selectedEngineId = deps.session.activeEngineId();
      const factory = await deps.registry.loadFactory(selectedEngineId);
      orchestrator = new EngineOrchestrator({
        createWorker: factory,
        events: { onOutput: handleOutput },
      });

      const result = await orchestrator.init(params);

      isInitialized = true;
      initializedEngineId = selectedEngineId;
      initializedLanguage = params.language;
      setActiveCapabilities({
        id: result.id,
        isInterruptible: result.isInterruptible,
        isStateful: result.isStateful,
        supportedLanguages: result.supportedLanguages,
      });

      setActiveInitParams({ ...params, timeout: result.timeout });
      setEngineStatus("ready");
      deps.output.appendEntry("system", "Engine ready.");
    } catch (error) {
      isInitialized = false;
      initializedEngineId = null;
      initializedLanguage = null;
      setEngineStatus("error");
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      deps.output.appendEntry(
        "error",
        `Engine initialization failed: ${errorMessage}`
      );
    }
  }

  function selectEngineEntry(entry: EngineEntry): void {
    if (
      entry.engineId === deps.session.activeEngineId() &&
      entry.language === deps.session.activeLanguage()
    ) {
      return;
    }

    deps.output.clearEntries();
    terminate();
    deps.session.selectEngine(entry.engineId, entry.language);
  }

  /**
   * Spawns (or respawns) a worker for the currently selected engine.
   * No-op when the selected engine is already healthy (ready/initializing/running)
   * or blocked (trust gate active). On error state, or when the running worker
   * belongs to a different engine or language, terminates the previous worker first.
   */
  async function initializeSelectedEngine(): Promise<void> {
    const status = engineStatusAccessor();
    const currentEngineId = deps.session.activeEngineId();
    const currentLanguage = deps.session.activeLanguage();

    if (status === "blocked") {
      return;
    }

    const isMatchingEngine =
      isInitialized &&
      initializedEngineId === currentEngineId &&
      initializedLanguage === currentLanguage;

    if (
      isMatchingEngine &&
      (status === "ready" || status === "initializing" || status === "running")
    ) {
      return;
    }

    if (status === "error" || !isMatchingEngine) {
      terminate();
    }

    const engineDef = deps.registry.getDefinition(currentEngineId);
    const params: EngineInitParams = {
      language: currentLanguage,
      ...engineDef.defaultInitParams,
    };
    await initializeEngine(params);
  }

  async function updateEngineConfig(
    patch: Record<string, unknown>
  ): Promise<void> {
    if (!currentInitParams) {
      return;
    }
    terminate();
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
    const code = deps.session.code();
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

      const isMatchingEngine =
        isInitialized &&
        orchestrator !== null &&
        initializedEngineId === deps.session.activeEngineId() &&
        initializedLanguage === deps.session.activeLanguage();

      if (isMatchingEngine && orchestrator) {
        await orchestrator.reset();
      } else {
        await initializeSelectedEngine();
      }

      setEngineStatus("running");
      await orchestrator?.run(code);
      setEngineStatus("ready");
      setIsDirty(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.output.appendEntry("error", message);
      setEngineStatus("ready");
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
    initializedEngineId = null;
    initializedLanguage = null;
    setEngineStatus("idle");
    setIsDirty(false);
    setActiveInitParams(null);
    setActiveCapabilities(null);
  }

  function dispose(): void {
    terminate();
    disposeEffect?.();
    disposeEffect = null;
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
    activeCapabilities,
    activeEngineId: deps.session.activeEngineId,
    activeInitParams,
    activeLanguage: deps.session.activeLanguage,
    dispose,
    engineStatus: engineStatusAccessor,
    executeCode,
    initializeSelectedEngine,
    interruptExecution,
    isDirty,
    retryInit,
    selectEngineEntry,
    setBlocked,
    terminate,
    updateEngineConfig,
  };
}

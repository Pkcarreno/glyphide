import { EngineOrchestrator } from "@glyphide/orchestrator";
import type {
  EngineCapabilities,
  EngineInitParams,
  EngineOutputPayload,
} from "@glyphide/rpc-protocol/types";
import type { Accessor, SourceAccessor } from "solid-js";
import {
  action,
  affects,
  createEffect,
  createMemo,
  createOptimistic,
  createRoot,
  createSignal,
  onCleanup,
  onFlush,
  refresh,
  resolve,
} from "solid-js";
import type {
  EngineEntry,
  EngineId,
  EngineRegistry,
} from "../engine/registry.ts";
import type { OutputModel } from "./output.ts";
import type { WorkspaceSession } from "./session.ts";
import type { SettingsModel } from "./settings.ts";

/**
 * Resolved execution engine instance with its active worker orchestrator,
 * capabilities, and confirmed initialization parameters.
 *
 * @public
 */
export interface InitializedEngine {
  capabilities: EngineCapabilities;
  engineId: EngineId;
  initParams: EngineInitParams;
  language: string;
  orchestrator: EngineOrchestrator;
}

interface EngineConfigOverride {
  engineId: EngineId;
  language: string;
  patch: Record<string, unknown>;
}

/** Dependencies injected into the engine model. */
export interface EngineModelDeps {
  output: OutputModel;
  registry: EngineRegistry;
  session: WorkspaceSession;
  settings: SettingsModel;
}

/**
 * Central engine orchestration model.
 * Manages declarative worker/WASM initialization, execution,
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
  /** Disposes the engine reactive root and terminates any active worker. */
  dispose: () => void;
  /**
   * Declarative async computation for the active initialized engine.
   * Resolves to `null` when initialization is blocked by the trust gate.
   */
  engine: SourceAccessor<InitializedEngine | null>;
  /** Executes the current buffer content in the active engine. */
  executeCode: () => Promise<void>;
  /**
   * Held transaction marker for code execution.
   * Probe with `isPending(() => model.executionState())` to track in-flight runs.
   */
  executionState: Accessor<number>;
  /** Forcefully interrupts the running execution. */
  interruptExecution: () => Promise<void>;
  /** Indicates whether engine initialization is blocked by the trust gate. */
  isBlocked: Accessor<boolean>;
  /** Indicates if the buffer was modified while an execution is in progress. */
  isDirty: Accessor<boolean>;
  /** Optimistic indicator of whether code execution is currently running. */
  isRunning: Accessor<boolean>;
  /** Retries initialization for the current entry via `refresh(engine)`. */
  retryInit: () => Promise<void>;
  /** Selects an engine entry in the workspace session. */
  selectEngineEntry: (entry: EngineEntry) => void;
  /** Updates the engine config and re-initializes declaratively. */
  updateEngineConfig: (patch: Record<string, unknown>) => Promise<void>;
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function raceWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(
      new DOMException("Execution interrupted", "AbortError")
    );
  }
  return new Promise<T>((resolvePromise, rejectPromise) => {
    const handleAbort = () => {
      rejectPromise(new DOMException("Execution interrupted", "AbortError"));
    };
    signal.addEventListener("abort", handleAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", handleAbort);
        resolvePromise(value);
      },
      (error) => {
        signal.removeEventListener("abort", handleAbort);
        rejectPromise(error);
      }
    );
  });
}

/** Creates an `EngineModel` wired to the given dependencies. */
export function createEngineModel(deps: EngineModelDeps): EngineModel {
  return createRoot((disposeRoot) => {
    const [executionState, setExecutionState] = createSignal<number>(0);
    const [isRunning, setIsRunning] = createOptimistic<boolean>(false);
    const [executedCode, setExecutedCode] = createOptimistic<string | null>(
      null
    );
    const isBlocked: Accessor<boolean> = deps.session.isTrustRequired;
    const isDirty = createMemo(
      () =>
        isRunning() &&
        executedCode() !== null &&
        deps.session.code() !== executedCode()
    );
    const [configOverrides, setConfigOverrides] =
      createSignal<EngineConfigOverride | null>(null);
    const [initAttempt, setInitAttempt] = createSignal<number>(0);
    let activeExecutionAbort: AbortController | null = null;

    function handleOutput(payload: EngineOutputPayload): void {
      deps.output.appendEntry(payload.type, payload.data);
    }

    async function initializeWorker(
      selectedEngineId: EngineId,
      selectedLanguage: string,
      params: EngineInitParams,
      isCancelled: () => boolean,
      registerOrchestrator: (orc: EngineOrchestrator | null) => void
    ): Promise<InitializedEngine | null> {
      let localOrchestrator: EngineOrchestrator | null = null;
      try {
        const factory = await deps.registry.loadFactory(selectedEngineId);
        if (isCancelled()) {
          return null;
        }

        localOrchestrator = new EngineOrchestrator({
          createWorker: factory,
          events: { onOutput: handleOutput },
        });
        registerOrchestrator(localOrchestrator);

        const result = await localOrchestrator.init(params);
        if (isCancelled()) {
          localOrchestrator.terminate();
          registerOrchestrator(null);
          return null;
        }

        return {
          capabilities: {
            id: result.id,
            isInterruptible: result.isInterruptible,
            isStateful: result.isStateful,
            supportedLanguages: result.supportedLanguages,
          },
          engineId: selectedEngineId,
          initParams: { ...params, timeout: result.timeout },
          language: selectedLanguage,
          orchestrator: localOrchestrator,
        };
      } catch (error) {
        localOrchestrator?.terminate();
        registerOrchestrator(null);
        if (isCancelled()) {
          return null;
        }
        throw error;
      }
    }

    const engineInitInput = createMemo(() => {
      if (isBlocked()) {
        return null;
      }

      const selectedEngineId = deps.session.activeEngineId();
      const selectedLanguage = deps.session.activeLanguage();
      const overrides = configOverrides();
      const hasMatchingOverrides =
        overrides !== null &&
        overrides.engineId === selectedEngineId &&
        overrides.language === selectedLanguage;

      return {
        hasMatchingOverrides,
        overridePatch: hasMatchingOverrides ? overrides.patch : undefined,
        selectedEngineId,
        selectedLanguage,
      };
    });

    const engine = createMemo<InitializedEngine | null>(
      (): InitializedEngine | null | Promise<InitializedEngine | null> => {
        const input = engineInitInput();
        if (!input) {
          return null;
        }

        let cancelled = false;
        let localOrchestrator: EngineOrchestrator | null = null;

        onCleanup(() => {
          cancelled = true;
          localOrchestrator?.terminate();
          localOrchestrator = null;
        });

        const engineDef = deps.registry.getDefinition(input.selectedEngineId);
        const params: EngineInitParams = {
          language: input.selectedLanguage,
          ...engineDef.defaultInitParams,
          ...input.overridePatch,
        };

        return initializeWorker(
          input.selectedEngineId,
          input.selectedLanguage,
          params,
          () => cancelled,
          (orc) => {
            localOrchestrator = orc;
          }
        );
      }
    );

    createEffect(
      () => {
        initAttempt();
        const input = engineInitInput();
        return input
          ? { hasMatchingOverrides: input.hasMatchingOverrides }
          : null;
      },
      (status) => {
        if (!status) {
          return;
        }
        deps.output.appendEntry(
          "system",
          status.hasMatchingOverrides
            ? "Applying new configuration…"
            : "Initializing engine…"
        );
      }
    );

    // Keep the async engine memo observed across its lifetime so workers stay alive
    // even when no UI subscriber is mounted, while reporting ready/failed status
    // after initialization start logs and letting <Errored> catch failures.
    createEffect(() => engine(), {
      effect: (resolvedEngine) => {
        if (resolvedEngine) {
          deps.output.appendEntry("system", "Engine ready.");
        }
      },
      error: (error) => {
        deps.output.appendEntry(
          "error",
          `Engine initialization failed: ${formatErrorMessage(error)}`
        );
      },
    });

    // Abort any active execution when the trust gate locks.
    createEffect(
      () => isBlocked(),
      (blocked) => {
        if (blocked) {
          activeExecutionAbort?.abort();
        }
      }
    );

    function selectEngineEntry(entry: EngineEntry): void {
      if (
        entry.engineId === deps.session.activeEngineId() &&
        entry.language === deps.session.activeLanguage()
      ) {
        return;
      }

      activeExecutionAbort?.abort();
      deps.output.clearEntries();
      deps.session.selectEngine(entry.engineId, entry.language);
    }

    function updateEngineConfig(patch: Record<string, unknown>): Promise<void> {
      const engineId = deps.session.activeEngineId();
      const language = deps.session.activeLanguage();
      setConfigOverrides((prev) => ({
        engineId,
        language,
        patch:
          prev && prev.engineId === engineId && prev.language === language
            ? { ...prev.patch, ...patch }
            : { ...patch },
      }));
      return Promise.resolve();
    }

    async function retryInit(): Promise<void> {
      if (isBlocked()) {
        return;
      }
      affects(engine);
      setInitAttempt((attempt) => attempt + 1);
      try {
        await refresh(engine);
      } catch {
        // Errors stay surfaced through the `engine` memo to <Errored> boundaries.
      }
    }

    async function resolveActiveEngine(
      reportFailure: boolean
    ): Promise<InitializedEngine | null> {
      try {
        return await resolve(() => engine());
      } catch {
        if (reportFailure) {
          deps.output.appendEntry(
            "error",
            "Cannot run code: Engine initialization failed. Please retry."
          );
        }
        return null;
      }
    }

    function* runInEngine(code: string, signal: AbortSignal) {
      const activeEngine = (yield raceWithAbort(
        resolveActiveEngine(true),
        signal
      )) as InitializedEngine | null;

      if (!activeEngine || signal.aborted) {
        return;
      }

      yield raceWithAbort(activeEngine.orchestrator.reset(), signal);
      if (signal.aborted) {
        return;
      }

      yield raceWithAbort(activeEngine.orchestrator.run(code), signal);
    }

    const executeCode = action(function* () {
      const code = deps.session.code();
      if (!code.trim() || isBlocked() || isRunning()) {
        return;
      }

      if (deps.settings.settings.isClearOnRunEnabled) {
        // Defer clear past the current flush so output stays live during execution.
        onFlush(() => deps.output.clearEntries());
      }

      const abortController = new AbortController();
      activeExecutionAbort = abortController;

      setExecutionState((state) => state + 1);
      setIsRunning(true);
      setExecutedCode(code);

      try {
        yield* runInEngine(code, abortController.signal);
      } catch (error) {
        if (!abortController.signal.aborted) {
          deps.output.appendEntry("error", formatErrorMessage(error));
        }
      } finally {
        if (activeExecutionAbort === abortController) {
          activeExecutionAbort = null;
        }
      }
    });

    async function interruptExecution(): Promise<void> {
      if (!isRunning()) {
        return;
      }

      activeExecutionAbort?.abort();

      const activeEngine = await resolveActiveEngine(false);
      if (!activeEngine) {
        return;
      }

      try {
        await activeEngine.orchestrator.interrupt();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        deps.output.appendEntry("error", `Interrupt failed: ${message}`);
      }
    }

    function dispose(): void {
      activeExecutionAbort?.abort();
      disposeRoot();
    }

    return {
      activeCapabilities: () => engine()?.capabilities ?? null,
      activeEngineId: deps.session.activeEngineId,
      activeInitParams: () => engine()?.initParams ?? null,
      activeLanguage: deps.session.activeLanguage,
      dispose,
      engine,
      executeCode,
      executionState,
      interruptExecution,
      isBlocked,
      isDirty,
      isRunning,
      retryInit,
      selectEngineEntry,
      updateEngineConfig,
    };
  });
}

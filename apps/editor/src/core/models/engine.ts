import { createSignal } from "solid-js";
import type { Accessor } from "solid-js";
import { EngineOrchestrator } from "@glyphide/orchestrator";
import type {
  EngineCapabilities,
  EngineInitParams,
  EngineOutputPayload,
} from "@glyphide/rpc-protocol/types";
import type { EngineEntry, EngineId, EngineRegistry } from "../engine/registry";
import type { BufferModel } from "./buffer";
import type { OutputModel } from "./output";
import type { SettingsModel } from "./settings";
import type { UrlStatePort } from "../ports/url-state";

/** Execution lifecycle states for the active engine. */
export type EngineStatus = "idle" | "initializing" | "ready" | "running" | "error";

/** Dependencies injected into the engine model. */
export interface EngineModelDeps {
  buffer: BufferModel;
  output: OutputModel;
  settings: SettingsModel;
  registry: EngineRegistry;
  urlState: UrlStatePort;
}

/**
 * Central engine orchestration model.
 */
export interface EngineModel {
  /** Reactive accessor for the current execution status. */
  engineStatus: Accessor<EngineStatus>;
  /** Reactive accessor for the currently selected engine ID. */
  activeEngineId: Accessor<EngineId>;
  /** Reactive accessor for the active language. */
  activeLanguage: Accessor<string>;
  /** Reactive accessor for the confirmed init params. */
  activeInitParams: Accessor<EngineInitParams | null>;
  /** Reactive accessor for the engine capabilities. */
  activeCapabilities: Accessor<EngineCapabilities | null>;

  /** Executes the current buffer content in the active engine. */
  executeCode(): Promise<void>;
  /** Forcefully interrupts the running execution. */
  interruptExecution(): Promise<void>;
  /** Selects an engine entry and triggers INIT immediately. */
  selectEngineEntry(entry: EngineEntry): Promise<void>;
  /** Updates the engine config and triggers a re-INIT. */
  updateEngineConfig(patch: Record<string, unknown>): Promise<void>;
  /** Retries initialization for the current entry. */
  retryInit(): Promise<void>;
  /** Tears down the orchestrator and releases resources. */
  terminate(): void;
  /** Syncs engine state based on buffer updates. */
  onBufferUpdated(newCode: string): void;
}

/** Creates an `EngineModel` wired to the given dependencies. */
export function createEngineModel(deps: EngineModelDeps): EngineModel {
  const [engineStatus, setEngineStatus] = createSignal<EngineStatus>("idle");
  
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

  let def;
  try {
    def = deps.registry.getDefinition(resolvedEngineId);
    if (resolvedLanguage && !def.supportedLanguages.includes(resolvedLanguage)) {
      resolvedLanguage = undefined;
    }
  } catch(e) {
    resolvedEngineId = "quickjs";
    def = deps.registry.getDefinition(resolvedEngineId);
    resolvedLanguage = undefined;
  }
  
  const [activeEngineId, setActiveEngineId] = createSignal<EngineId>(resolvedEngineId);
  const [activeLanguage, setActiveLanguage] = createSignal<string>(resolvedLanguage ?? def.supportedLanguages[0]);
  
  const [activeInitParams, setActiveInitParams] = createSignal<EngineInitParams | null>(null);
  const [activeCapabilities, setActiveCapabilities] = createSignal<EngineCapabilities | null>(null);

  let orchestrator: EngineOrchestrator | null = null;
  let isInitialized = false;
  let currentInitParams: EngineInitParams | null = null;

  function handleOutput(payload: EngineOutputPayload): void {
    deps.output.appendEntry(payload.type, payload.data);
  }

  async function initializeEngine(params: EngineInitParams): Promise<void> {
    setEngineStatus("initializing");
    deps.output.appendEntry("system", "Initializing engine…");
    
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
        isInterruptible: result.isInterruptible
      });
      
      setActiveInitParams({ ...params, timeout: result.timeout });
      setEngineStatus("ready");
      deps.output.appendEntry("system", "Engine ready.");
    } catch (error) {
      isInitialized = false;
      setEngineStatus("error");
      const message = error instanceof Error ? error.message : String(error);
      deps.output.appendEntry("error", `Engine initialization failed: ${message}`);
    }
  }

  async function selectEngineEntry(entry: EngineEntry): Promise<void> {
    if (entry.engineId === activeEngineId() && entry.language === activeLanguage()) {
      // Same entry, but if we are in error state, retry init
      if (engineStatus() === "error") {
        await retryInit();
      }
      return;
    }
    
    terminate();
    setActiveEngineId(entry.engineId);
    setActiveLanguage(entry.language);
    
    // Only persist to URL if the engine has multiple languages
    // For single-language engines, just save the engineId
    const def = deps.registry.getDefinition(entry.engineId);
    if (def.supportedLanguages.length > 1) {
      deps.urlState.set("engine", `${entry.engineId}:${entry.language}`);
    } else {
      deps.urlState.set("engine", entry.engineId);
    }

    const params: EngineInitParams = {
      language: entry.language,
      ...def.defaultInitParams
    };
    
    await initializeEngine(params);
  }

  async function updateEngineConfig(patch: Record<string, unknown>): Promise<void> {
    if (!currentInitParams) return;
    terminate(); // Tear down to apply new config
    const newParams = { ...currentInitParams, ...patch };
    await initializeEngine(newParams);
  }

  async function retryInit(): Promise<void> {
    if (currentInitParams) {
      terminate();
      await initializeEngine(currentInitParams);
    }
  }

  async function executeCode(): Promise<void> {
    const code = deps.buffer.content();
    if (!code.trim()) return;

    if (deps.settings.settings.isClearOnRunEnabled) {
      deps.output.clearEntries();
    }

    if (engineStatus() !== "ready" && engineStatus() !== "idle") {
        if(engineStatus() === "error") {
            deps.output.appendEntry("error", "Cannot run code: Engine initialization failed. Please retry.");
        }
        return;
    }

    try {
      if (isInitialized && orchestrator) {
        await orchestrator.reset();
      } else {
        // Fallback eager init just in case
        const def = deps.registry.getDefinition(activeEngineId());
        await initializeEngine({ language: activeLanguage(), ...def.defaultInitParams });
      }

      setEngineStatus("running");
      await orchestrator!.run(code);
      setEngineStatus("ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.output.appendEntry("error", message);
      setEngineStatus("ready"); // Ready to try again
    }
  }

  async function interruptExecution(): Promise<void> {
    if (engineStatus() !== "running" || !orchestrator) return;

    try {
      await orchestrator.interrupt();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.output.appendEntry("error", `Interrupt failed: ${message}`);
    }
    setEngineStatus("ready");
  }

  function terminate(): void {
    orchestrator?.terminate();
    orchestrator = null;
    isInitialized = false;
    setEngineStatus("idle");
    setActiveInitParams(null);
    setActiveCapabilities(null);
  }

  function onBufferUpdated(newCode: string): void {
    if (newCode.trim() !== "" && deps.urlState.get("engine") === null) {
      const def = deps.registry.getDefinition(activeEngineId());
      if (def.supportedLanguages.length > 1) {
        deps.urlState.set("engine", `${activeEngineId()}:${activeLanguage()}`);
      } else {
        deps.urlState.set("engine", activeEngineId());
      }
    }
  }

  return {
    engineStatus,
    activeEngineId,
    activeLanguage,
    activeInitParams,
    activeCapabilities,
    executeCode,
    interruptExecution,
    selectEngineEntry,
    updateEngineConfig,
    retryInit,
    terminate,
    onBufferUpdated,
  };
}

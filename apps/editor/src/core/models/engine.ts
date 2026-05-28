import { createSignal } from "solid-js";
import type { Accessor } from "solid-js";
import { EngineOrchestrator } from "@glyphide/orchestrator";
import type { EngineOutputPayload } from "@glyphide/rpc-protocol/types";
import type { EngineId, EngineRegistry } from "../engine/registry";
import type { BufferModel } from "./buffer";
import type { OutputModel } from "./output";
import type { SettingsModel } from "./settings";
import type { UrlStatePort } from "../ports/url-state";

/** Execution lifecycle states for the active engine. */
export type EngineStatus = "idle" | "initializing" | "running";

/** Dependencies injected into the engine model. */
export interface EngineModelDeps {
  buffer: BufferModel;
  output: OutputModel;
  settings: SettingsModel;
  registry: EngineRegistry;
  urlState: UrlStatePort;
}

/**
 * Central engine orchestration model (the Zed `Project` equivalent).
 * Owns the `EngineOrchestrator` lifecycle, manages engine selection,
 * and routes output to the `OutputModel`.
 *
 * Never touched directly by views — they dispatch actions instead.
 */
export interface EngineModel {
  /** Reactive accessor for the current execution status. */
  status: Accessor<EngineStatus>;
  /** Reactive accessor for the currently selected engine ID. */
  activeEngineId: Accessor<EngineId>;
  /** Executes the current buffer content in the active engine. */
  executeCode(): Promise<void>;
  /** Forcefully interrupts the running execution. */
  interruptExecution(): Promise<void>;
  /** Switches to a different engine, terminating the current one. */
  selectEngine(engineId: EngineId): void;
  /** Tears down the orchestrator and releases resources. */
  terminate(): void;
  /** Syncs engine state based on buffer updates. */
  onBufferUpdated(newCode: string): void;
}

/** Creates an `EngineModel` wired to the given dependencies. */
export function createEngineModel(deps: EngineModelDeps): EngineModel {
  const [status, setStatus] = createSignal<EngineStatus>("idle");
  
  const initialEngineId = deps.urlState.get("engine") as EngineId | null;
  const [activeEngineId, setActiveEngineId] =
    createSignal<EngineId>(initialEngineId ?? "quickjs");

  let orchestrator: EngineOrchestrator | null = null;
  let isInitialized = false;

  function handleOutput(payload: EngineOutputPayload): void {
    deps.output.appendEntry(
      payload.type,
      payload.data,
    );
  }

  async function ensureInitialized(): Promise<void> {
    if (isInitialized && orchestrator) {
      await orchestrator.reset();
      return;
    }

    setStatus("initializing");
    deps.output.appendEntry("system", "Initializing engine…");

    const factory = await deps.registry.loadFactory(activeEngineId());
    orchestrator = new EngineOrchestrator({
      createWorker: factory,
      events: { onOutput: handleOutput },
    });
    await orchestrator.init();
    isInitialized = true;

    deps.output.appendEntry("system", "Engine ready.");
  }

  async function executeCode(): Promise<void> {
    const code = deps.buffer.content();
    if (!code.trim()) return;

    if (deps.settings.settings.isClearOnRunEnabled) {
      deps.output.clearEntries();
    }

    try {
      await ensureInitialized();
      setStatus("running");
      await orchestrator!.run(code);
      setStatus("idle");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      deps.output.appendEntry("error", message);
      setStatus("idle");
    }
  }

  async function interruptExecution(): Promise<void> {
    if (status() !== "running" || !orchestrator) return;

    try {
      await orchestrator.interrupt();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      deps.output.appendEntry("error", `Interrupt failed: ${message}`);
    }
    setStatus("idle");
  }

  function selectEngine(engineId: EngineId): void {
    if (engineId === activeEngineId()) return;
    terminate();
    setActiveEngineId(engineId);
    deps.urlState.set("engine", engineId);
  }

  function terminate(): void {
    orchestrator?.terminate();
    orchestrator = null;
    isInitialized = false;
    setStatus("idle");
  }

  function onBufferUpdated(newCode: string): void {
    if (newCode.trim() !== "" && deps.urlState.get("engine") === null) {
      deps.urlState.set("engine", activeEngineId());
    }
  }

  return {
    status,
    activeEngineId,
    executeCode,
    interruptExecution,
    selectEngine,
    terminate,
    onBufferUpdated,
  };
}

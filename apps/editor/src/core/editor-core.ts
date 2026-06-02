import type { ActionDispatcher } from "./actions/dispatcher.ts";
import { createActionDispatcher } from "./actions/dispatcher.ts";
import type { EngineRegistry } from "./engine/registry.ts";
import { createEngineRegistry } from "./engine/registry.ts";
import type { BufferModel } from "./models/buffer.ts";
import { createBufferModel } from "./models/buffer.ts";
import type { EngineModel } from "./models/engine.ts";
import { createEngineModel } from "./models/engine.ts";
import type { OutputModel } from "./models/output.ts";
import { createOutputModel } from "./models/output.ts";
import type { OverlayModel } from "./models/overlay.ts";
import { createOverlayModel } from "./models/overlay.ts";
import type { ProjectModel } from "./models/project.ts";
import { createProjectModel } from "./models/project.ts";
import type { SettingsModel } from "./models/settings.ts";
import { createSettingsModel } from "./models/settings.ts";
import type { PersistencePort } from "./ports/persistence.ts";
import type { UrlStatePort } from "./ports/url-state.ts";
import type { ShortcutRegistry } from "./shortcuts/registry.ts";
import {
  createShortcutRegistry,
  defaultShortcutBindings,
} from "./shortcuts/registry.ts";

/** External dependencies required by the editor core. */
export interface EditorCoreDeps {
  persistence: PersistencePort;
  urlState: UrlStatePort;
}

/**
 * The root composition object for the editor business logic.
 * Exposes all models, the action dispatcher, and shortcut registry.
 * Views consume this via SolidJS Context.
 */
export interface EditorCore {
  buffer: BufferModel;
  dispatcher: ActionDispatcher;
  /** Tears down all resources (call on unmount). */
  dispose(): void;
  engine: EngineModel;
  engineRegistry: EngineRegistry;
  output: OutputModel;
  overlays: OverlayModel;
  project: ProjectModel;
  settings: SettingsModel;
  shortcuts: ShortcutRegistry;
}

/**
 * Factory that wires all models, registries, and the dispatcher.
 * This is the single composition root for the entire editor.
 */
export function createEditorCore(deps: EditorCoreDeps): EditorCore {
  const dispatcher = createActionDispatcher();
  const shortcuts = createShortcutRegistry(defaultShortcutBindings);
  const buffer = createBufferModel(deps.urlState);
  const settings = createSettingsModel(deps.persistence);
  const project = createProjectModel(deps.urlState);
  const output = createOutputModel();
  const overlays = createOverlayModel();
  const engineRegistry = createEngineRegistry();
  const engine = createEngineModel({
    buffer,
    output,
    settings,
    registry: engineRegistry,
    urlState: deps.urlState,
  });

  const unsubscribers: (() => void)[] = [];

  unsubscribers.push(
    dispatcher.on("RUN_CODE", () => {
      engine.executeCode();
    })
  );

  unsubscribers.push(
    dispatcher.on("INTERRUPT_EXECUTION", () => {
      engine.interruptExecution();
    })
  );

  unsubscribers.push(
    dispatcher.on("CLEAR_OUTPUT", () => {
      output.clearEntries();
    })
  );

  unsubscribers.push(
    dispatcher.on("SELECT_ENGINE_ENTRY", (action) => {
      engine.selectEngineEntry({
        engineId: action.engineId,
        language: action.language,
        label: "",
      });
    })
  );

  unsubscribers.push(
    dispatcher.on("UPDATE_ENGINE_CONFIG", (action) => {
      engine.updateEngineConfig(action.patch);
    })
  );

  unsubscribers.push(
    dispatcher.on("RETRY_ENGINE_INIT", () => {
      engine.retryInit();
    })
  );

  unsubscribers.push(
    dispatcher.on("UPDATE_BUFFER", (action) => {
      buffer.setContent(action.content);
      engine.onBufferUpdated(action.content);
    })
  );

  unsubscribers.push(
    dispatcher.on("RENAME_PROJECT", (action) => {
      project.setName(action.name);
    })
  );

  unsubscribers.push(
    dispatcher.on("OPEN_OVERLAY", (action) => {
      overlays.open(action.overlayId);
    })
  );

  unsubscribers.push(
    dispatcher.on("CLOSE_OVERLAY", (action) => {
      overlays.close(action.overlayId);
    })
  );

  unsubscribers.push(
    dispatcher.on("TOGGLE_OVERLAY", (action) => {
      overlays.toggle(action.overlayId);
    })
  );

  unsubscribers.push(
    dispatcher.on("CLOSE_ALL_OVERLAYS", () => {
      overlays.closeAll();
    })
  );

  function dispose(): void {
    engine.terminate();
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
  }

  const initialDef = engineRegistry.getDefinition(engine.activeEngineId());
  engine.selectEngineEntry({
    engineId: engine.activeEngineId(),
    language: engine.activeLanguage(),
    label: initialDef.label,
  });

  return {
    buffer,
    settings,
    project,
    output,
    engine,
    engineRegistry,
    overlays,
    dispatcher,
    shortcuts,
    dispose,
  };
}

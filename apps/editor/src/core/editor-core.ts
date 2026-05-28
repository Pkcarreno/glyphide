import type { PersistencePort } from "./ports/persistence";
import type { UrlStatePort } from "./ports/url-state";
import type { ActionDispatcher } from "./actions/dispatcher";
import { createActionDispatcher } from "./actions/dispatcher";
import type { ShortcutRegistry } from "./shortcuts/registry";
import {
  createShortcutRegistry,
  defaultShortcutBindings,
} from "./shortcuts/registry";
import type { BufferModel } from "./models/buffer";
import { createBufferModel } from "./models/buffer";
import type { SettingsModel } from "./models/settings";
import { createSettingsModel } from "./models/settings";
import type { ProjectModel } from "./models/project";
import { createProjectModel } from "./models/project";
import type { OutputModel } from "./models/output";
import { createOutputModel } from "./models/output";
import type { EngineModel } from "./models/engine";
import { createEngineModel } from "./models/engine";
import type { EngineRegistry } from "./engine/registry";
import { createEngineRegistry } from "./engine/registry";

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
  settings: SettingsModel;
  project: ProjectModel;
  output: OutputModel;
  engine: EngineModel;
  engineRegistry: EngineRegistry;
  dispatcher: ActionDispatcher;
  shortcuts: ShortcutRegistry;
  /** Tears down all resources (call on unmount). */
  dispose(): void;
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
    }),
  );

  unsubscribers.push(
    dispatcher.on("INTERRUPT_EXECUTION", () => {
      engine.interruptExecution();
    }),
  );

  unsubscribers.push(
    dispatcher.on("CLEAR_OUTPUT", () => {
      output.clearEntries();
    }),
  );

  unsubscribers.push(
    dispatcher.on("SELECT_ENGINE", (action) => {
      engine.selectEngine(action.engineId);
    }),
  );

  unsubscribers.push(
    dispatcher.on("UPDATE_BUFFER", (action) => {
      buffer.setContent(action.content);
      engine.onBufferUpdated(action.content);
    }),
  );

  function dispose(): void {
    engine.terminate();
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
  }

  return {
    buffer,
    settings,
    project,
    output,
    engine,
    engineRegistry,
    dispatcher,
    shortcuts,
    dispose,
  };
}

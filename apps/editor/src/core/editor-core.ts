import type { EditorCommands } from "./commands.ts";
import { createEditorCommands } from "./commands.ts";
import type { EngineRegistry } from "./engine/registry.ts";
import { createEngineRegistry } from "./engine/registry.ts";
import type { EngineModel } from "./models/engine.ts";
import { createEngineModel } from "./models/engine.ts";
import type { FileLoadModel } from "./models/file-load.ts";
import { createFileLoadModel } from "./models/file-load.ts";
import type { NotificationModel } from "./models/notifications.ts";
import { createNotificationModel } from "./models/notifications.ts";
import type { OutputModel } from "./models/output.ts";
import { createOutputModel } from "./models/output.ts";
import type { OverlayModel } from "./models/overlay.ts";
import { createOverlayModel } from "./models/overlay.ts";
import type { PwaModel } from "./models/pwa.ts";
import { createPwaModel } from "./models/pwa.ts";
import type { WorkspaceSession } from "./models/session.ts";
import { createWorkspaceSession } from "./models/session.ts";
import type { SettingsModel } from "./models/settings.ts";
import { createSettingsModel } from "./models/settings.ts";
import type { FileIoPort } from "./ports/file-io.ts";
import type { PersistencePort } from "./ports/persistence.ts";
import type { UrlStatePort } from "./ports/url-state.ts";
import type { ShortcutRegistry } from "./shortcuts/registry.ts";
import {
  createShortcutRegistry,
  defaultShortcutBindings,
} from "./shortcuts/registry.ts";

/** External dependencies required by the editor core. */
export interface EditorCoreDeps {
  fileIo: FileIoPort;
  persistence: PersistencePort;
  urlState: UrlStatePort;
}

/**
 * The root composition object for the editor business logic.
 * Exposes the consolidated workspace session, engine runner, overlays,
 * commands, and shortcut registry.
 * Views consume this via SolidJS Context.
 */
export interface EditorCore {
  commands: EditorCommands;
  /** Tears down all resources (call on unmount). */
  dispose: () => void;
  engine: EngineModel;
  engineRegistry: EngineRegistry;
  /** Local file IO port (read/write). */
  fileIo: FileIoPort;
  fileLoad: FileLoadModel;
  notifications: NotificationModel;
  output: OutputModel;
  overlays: OverlayModel;
  pwa: PwaModel;
  session: WorkspaceSession;
  settings: SettingsModel;
  shortcuts: ShortcutRegistry;
}

/**
 * Factory that wires all models, registries, and commands.
 * This is the single composition root for the entire editor.
 */
export function createEditorCore(deps: EditorCoreDeps): EditorCore {
  const shortcuts = createShortcutRegistry(defaultShortcutBindings);
  const engineRegistry = createEngineRegistry();
  const settings = createSettingsModel(deps.persistence);
  const session = createWorkspaceSession({
    engineRegistry,
    isDefaultCodeEnabled: () => settings.settings.isDefaultCodeEnabled,
    urlState: deps.urlState,
  });
  const output = createOutputModel();
  const overlays = createOverlayModel();
  const notifications = createNotificationModel();
  const pwa = createPwaModel();
  const fileLoad = createFileLoadModel();
  const engine = createEngineModel({
    output,
    registry: engineRegistry,
    session,
    settings,
  });

  const commands = createEditorCommands({
    engine,
    fileIo: deps.fileIo,
    notifications,
    output,
    overlays,
    session,
    settings,
  });

  function dispose(): void {
    commands.dispose();
    engine.terminate();
    notifications.dispose();
  }

  if (session.isTrustRequired()) {
    engine.setBlocked(true);
    overlays.open("trust-required");
  } else {
    engine.initializeSelectedEngine();
  }

  return {
    commands,
    dispose,
    engine,
    engineRegistry,
    fileIo: deps.fileIo,
    fileLoad,
    notifications,
    output,
    overlays,
    pwa,
    session,
    settings,
    shortcuts,
  };
}

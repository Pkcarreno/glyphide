import type { ActionDispatcher } from "./actions/dispatcher.ts";
import { createActionDispatcher } from "./actions/dispatcher.ts";
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
 * dispatcher, and shortcut registry.
 * Views consume this via SolidJS Context.
 */
export interface EditorCore {
  dispatcher: ActionDispatcher;
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

/** Maps an engine language to the file extension used for download. */
function languageToExtension(language: string): string {
  switch (language) {
    case "javascript":
    case "typescript":
      return ".js";
    case "python":
      return ".py";
    default:
      return ".txt";
  }
}

/**
 * Factory that wires all models, registries, and the dispatcher.
 * This is the single composition root for the entire editor.
 */
export function createEditorCore(deps: EditorCoreDeps): EditorCore {
  const dispatcher = createActionDispatcher();
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

  const unsubscribers: (() => void)[] = [];
  let autoRunTimer: ReturnType<typeof setTimeout> | undefined;

  unsubscribers.push(
    dispatcher.on("RUN_CODE", () => {
      if (session.isTrustRequired()) {
        overlays.open("trust-required");
        return;
      }
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
      if (session.isTrustRequired()) {
        overlays.open("trust-required");
        return;
      }
      if (autoRunTimer) {
        clearTimeout(autoRunTimer);
      }
      session.selectEngine(action.engineId, action.language);
      engine.initializeSelectedEngine();
    })
  );

  unsubscribers.push(
    dispatcher.on("UPDATE_ENGINE_CONFIG", (action) => {
      engine.updateEngineConfig(action.patch);
    })
  );

  unsubscribers.push(
    dispatcher.on("RETRY_ENGINE_INIT", () => {
      if (session.isTrustRequired()) {
        overlays.open("trust-required");
        return;
      }
      engine.retryInit();
    })
  );

  unsubscribers.push(
    dispatcher.on("UPDATE_BUFFER", (action) => {
      session.setCode(action.content, { source: "user" });

      if (autoRunTimer) {
        clearTimeout(autoRunTimer);
      }

      if (settings.settings.isAutoRunEnabled && !session.isTrustRequired()) {
        autoRunTimer = setTimeout(() => {
          const status = engine.engineStatus();
          if (
            settings.settings.isAutoRunEnabled &&
            (status === "ready" || status === "idle")
          ) {
            engine.executeCode().catch(() => undefined);
          }
        }, settings.settings.autoRunDelay);
      }
    })
  );

  unsubscribers.push(
    dispatcher.on("UPDATE_CURSOR_POSITION", (action) => {
      session.setCursorPosition(
        action.line,
        action.column,
        action.selectionLength,
        action.selectionLines
      );
    })
  );

  unsubscribers.push(
    dispatcher.on("RENAME_PROJECT", (action) => {
      session.setProjectName(action.name);
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

  unsubscribers.push(
    dispatcher.on("DISPATCH_NOTIFICATION", (action) => {
      notifications.dispatchNotification({
        action: action.action,
        description: action.description,
        title: action.title,
        type: action.notificationType,
      });
    })
  );

  unsubscribers.push(
    dispatcher.on("DISMISS_TOAST", (action) => {
      notifications.dismissToast(action.id);
    })
  );

  unsubscribers.push(
    dispatcher.on("PWA_UPDATE_AVAILABLE", () => {
      pwa.setUpdateAvailable(true);
    })
  );

  unsubscribers.push(
    dispatcher.on("PWA_OFFLINE_READY", () => {
      pwa.setOfflineReady(true);
    })
  );

  unsubscribers.push(
    dispatcher.on("GRANT_TRUST", () => {
      session.grantTrust();
      engine.setBlocked(false);
      overlays.close("trust-required");
    })
  );

  unsubscribers.push(
    dispatcher.on("RESET_PROJECT_STATE", () => {
      session.reset();
      output.clearEntries();
      overlays.close("trust-required");
      engine.setBlocked(false);
      engine.terminate();
      engine.initializeSelectedEngine();
    })
  );

  unsubscribers.push(
    dispatcher.on("LOAD_FILE_FROM_DISK", (action) => {
      session.loadFile({
        content: action.content,
        engineId: action.engineId,
        language: action.language,
        name: action.name,
      });
      engine.terminate();
      engine.setBlocked(true);
      overlays.open("trust-required");
    })
  );

  unsubscribers.push(
    dispatcher.on("DOWNLOAD_BUFFER_TO_FILE", () => {
      const content = session.code();
      const baseName = session.projectName();
      const extension = languageToExtension(session.activeLanguage());
      const filename = `${baseName}${extension}`;
      deps.fileIo.writeFile(filename, content).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        dispatcher.dispatch({
          description: message,
          notificationType: "error",
          title: "Download failed",
          type: "DISPATCH_NOTIFICATION",
        });
      });
    })
  );

  function dispose(): void {
    if (autoRunTimer) {
      clearTimeout(autoRunTimer);
    }
    engine.terminate();
    notifications.dispose();
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
  }

  if (session.isTrustRequired()) {
    engine.setBlocked(true);
    overlays.open("trust-required");
  } else {
    engine.initializeSelectedEngine();
  }

  return {
    dispatcher,
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

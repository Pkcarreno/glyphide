import { batch } from "solid-js";
import type { ActionDispatcher } from "./actions/dispatcher.ts";
import { createActionDispatcher } from "./actions/dispatcher.ts";
import type { EngineRegistry } from "./engine/registry.ts";
import { createEngineRegistry } from "./engine/registry.ts";
import type { BufferModel } from "./models/buffer.ts";
import { createBufferModel } from "./models/buffer.ts";
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
import type { ProjectModel } from "./models/project.ts";
import { createProjectModel } from "./models/project.ts";
import type { SettingsModel } from "./models/settings.ts";
import { createSettingsModel } from "./models/settings.ts";
import type { TrustModel } from "./models/trust.ts";
import { createTrustModel } from "./models/trust.ts";
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
  /** Local file IO port (read/write). */
  fileIo: FileIoPort;
  fileLoad: FileLoadModel;
  notifications: NotificationModel;
  output: OutputModel;
  overlays: OverlayModel;
  project: ProjectModel;
  settings: SettingsModel;
  shortcuts: ShortcutRegistry;
  trust: TrustModel;
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

/** Strips a known file extension from a filename. */
function stripExtension(filename: string): string {
  const knownExtensions = [".js", ".py", ".ts", ".jsx", ".tsx"];
  const lowerFilename = filename.toLowerCase();
  for (const ext of knownExtensions) {
    if (lowerFilename.endsWith(ext)) {
      return filename.slice(0, -ext.length);
    }
  }
  return filename;
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
  const notifications = createNotificationModel();
  const engineRegistry = createEngineRegistry();
  const trust = createTrustModel(deps.urlState);
  const fileLoad = createFileLoadModel();
  const engine = createEngineModel({
    buffer,
    output,
    settings,
    registry: engineRegistry,
    urlState: deps.urlState,
  });

  const unsubscribers: (() => void)[] = [];
  let autoRunTimer: ReturnType<typeof setTimeout> | undefined;

  unsubscribers.push(
    dispatcher.on("RUN_CODE", () => {
      if (trust.isTrustRequired()) {
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
      if (trust.isTrustRequired()) {
        overlays.open("trust-required");
        return;
      }
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
      if (trust.isTrustRequired()) {
        overlays.open("trust-required");
        return;
      }
      engine.retryInit();
    })
  );

  unsubscribers.push(
    dispatcher.on("UPDATE_BUFFER", (action) => {
      buffer.setContent(action.content);
      engine.onBufferUpdated(action.content);

      if (autoRunTimer) {
        clearTimeout(autoRunTimer);
      }

      if (settings.settings.isAutoRunEnabled && !trust.isTrustRequired()) {
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
      buffer.setCursorPosition(
        action.line,
        action.column,
        action.selectionLength,
        action.selectionLines
      );
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

  unsubscribers.push(
    dispatcher.on("DISPATCH_NOTIFICATION", (action) => {
      notifications.dispatchNotification({
        action: action.action,
        title: action.title,
        description: action.description,
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
    dispatcher.on("GRANT_TRUST", () => {
      trust.grantTrust();
      engine.setBlocked(false);
      overlays.close("trust-required");
      const def = engineRegistry.getDefinition(engine.activeEngineId());
      engine.selectEngineEntry({
        engineId: engine.activeEngineId(),
        language: engine.activeLanguage(),
        label: def.label,
      });
    })
  );

  unsubscribers.push(
    dispatcher.on("RESET_PROJECT_STATE", () => {
      // Batched so the UI does not flash an intermediate state
      // (empty buffer + lingering engine, etc.) during the reset.
      batch(() => {
        deps.urlState.remove("code");
        deps.urlState.remove("name");
        deps.urlState.remove("engine");
        buffer.setContent("");
        buffer.setCursorPosition(1, 1, 0, 0);
        output.clearEntries();
        trust.grantTrust();
        overlays.close("trust-required");
        engine.setBlocked(false);
        engine.terminate();
      });
      // Re-arm the default engine entry so the editor is runnable.
      // selectEngineEntry is a no-op if the entry is identical and the
      // engine is not in an error state — that's fine, the engine is now idle.
      const def = engineRegistry.getDefinition(engine.activeEngineId());
      engine.selectEngineEntry({
        engineId: engine.activeEngineId(),
        language: engine.activeLanguage(),
        label: def.label,
      });
    })
  );

  unsubscribers.push(
    dispatcher.on("LOAD_FILE_FROM_DISK", (action) => {
      buffer.setContent(action.content);
      project.setName(stripExtension(action.name));
      engine
        .selectEngineEntry({
          engineId: action.engineId,
          language: action.language,
          label: "",
        })
        .catch(() => undefined);
      // Re-arm the trust gate: file-loaded code must be acknowledged
      // exactly like URL-shared code. No bypass.
      trust.markTrustRequired();
      engine.setBlocked(true);
      overlays.open("trust-required");
    })
  );

  unsubscribers.push(
    dispatcher.on("DOWNLOAD_BUFFER_TO_FILE", () => {
      const content = buffer.content();
      const baseName = project.name();
      const extension = languageToExtension(engine.activeLanguage());
      const filename = `${baseName}${extension}`;
      deps.fileIo.writeFile(filename, content).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        dispatcher.dispatch({
          type: "DISPATCH_NOTIFICATION",
          notificationType: "error",
          title: "Download failed",
          description: message,
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

  if (trust.isTrustRequired()) {
    engine.setBlocked(true);
    overlays.open("trust-required");
  } else {
    const initialDef = engineRegistry.getDefinition(engine.activeEngineId());
    engine.selectEngineEntry({
      engineId: engine.activeEngineId(),
      language: engine.activeLanguage(),
      label: initialDef.label,
    });
  }

  return {
    buffer,
    settings,
    project,
    output,
    engine,
    engineRegistry,
    fileIo: deps.fileIo,
    fileLoad,
    notifications,
    overlays,
    dispatcher,
    shortcuts,
    trust,
    dispose,
  };
}

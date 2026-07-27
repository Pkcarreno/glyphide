import { batch } from "solid-js";
import type { ActionDispatcher } from "./actions/dispatcher.ts";
import { createActionDispatcher } from "./actions/dispatcher.ts";
import type { EngineId, EngineRegistry } from "./engine/registry.ts";
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
import type { PwaModel } from "./models/pwa.ts";
import { createPwaModel } from "./models/pwa.ts";
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
  dispose: () => void;
  engine: EngineModel;
  engineRegistry: EngineRegistry;
  /** Local file IO port (read/write). */
  fileIo: FileIoPort;
  fileLoad: FileLoadModel;
  notifications: NotificationModel;
  output: OutputModel;
  overlays: OverlayModel;
  project: ProjectModel;
  pwa: PwaModel;
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
 * Resolves the engine ID the editor should start with, given the URL state
 * and the registry. Returns the default `quickjs` when the URL is absent
 * or the engine is unknown.
 */
function resolveInitialEngineId(
  urlState: UrlStatePort,
  registry: EngineRegistry
): EngineId {
  const raw = urlState.get("engine");
  if (!raw) {
    return "quickjs";
  }
  const id = raw.split(":")[0] ?? "quickjs";
  try {
    registry.getDefinition(id);
    return id;
  } catch {
    return "quickjs";
  }
}

/**
 * Resolves the default snippet for the active engine. Engines without a
 * curated snippet (e.g., the dev-only mock engine) fall back to `""`.
 */
function resolveDefaultBufferCode(
  engineId: EngineId,
  registry: EngineRegistry
): string {
  try {
    return registry.getDefinition(engineId).defaultBufferCode ?? "";
  } catch {
    return "";
  }
}

/**
 * Factory that wires all models, registries, and the dispatcher.
 * This is the single composition root for the entire editor.
 */
export function createEditorCore(deps: EditorCoreDeps): EditorCore {
  const dispatcher = createActionDispatcher();
  const shortcuts = createShortcutRegistry(defaultShortcutBindings);
  // The registry is created before the buffer so the buffer can seed its
  // initial content from the active engine's `defaultBufferCode`.
  const engineRegistry = createEngineRegistry();
  // Settings must exist before the buffer so the buffer can read
  // `isDefaultCodeEnabled` for its initial content. createBufferModel uses
  // `initialContent` only when the URL has no `code` param, and the
  // initial value is set via createSignal (never via setContent), so the
  // URL stays clean on first paint.
  const settings = createSettingsModel(deps.persistence);
  const initialEngineId = resolveInitialEngineId(deps.urlState, engineRegistry);
  const initialContent = settings.settings.isDefaultCodeEnabled
    ? resolveDefaultBufferCode(initialEngineId, engineRegistry)
    : "";
  const buffer = createBufferModel(deps.urlState, initialContent, {
    source: "default",
  });
  const project = createProjectModel(deps.urlState);
  const output = createOutputModel();
  const overlays = createOverlayModel();
  const notifications = createNotificationModel();
  const pwa = createPwaModel();
  const trust = createTrustModel(deps.urlState);
  const fileLoad = createFileLoadModel();
  const engine = createEngineModel({
    buffer,
    output,
    registry: engineRegistry,
    settings,
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
      if (autoRunTimer) {
        clearTimeout(autoRunTimer);
      }
      // Pristine buffer rule: when the buffer is still showing the active
      // engine's default snippet (the user has not edited it), swapping
      // engines also swaps the buffer to the new engine's default and
      // keeps the pristine flag armed. User-edited buffers and URL-shared
      // code are NEVER replaced by an engine switch.
      if (buffer.isShowingDefaultCode()) {
        const newDefault = resolveDefaultBufferCode(
          action.engineId,
          engineRegistry
        );
        buffer.setContent(newDefault, { source: "default" });
      }
      engine.selectEngineEntry({
        engineId: action.engineId,
        label: "",
        language: action.language,
      });
      // Selection-only method; explicit init spawns the worker for the
      // newly selected entry.
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
      if (trust.isTrustRequired()) {
        overlays.open("trust-required");
        return;
      }
      engine.retryInit();
    })
  );

  unsubscribers.push(
    dispatcher.on("UPDATE_BUFFER", (action) => {
      // Source is "user" — any user input (typing, paste, programmatic
      // edit) disarms the pristine flag so the next engine switch will
      // NOT touch the buffer.
      buffer.setContent(action.content, { source: "user" });
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
      trust.grantTrust();
      engine.setBlocked(false);
      overlays.close("trust-required");
      // Engine initialization is deferred to RUN_CODE (lazy-init).
      // Granting trust only removes the security gate.
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
        // Reset re-inserts the active engine's curated default snippet
        // when the user has the feature enabled; otherwise it clears to
        // empty. Source is "default" so the pristine flag is re-armed —
        // the next engine switch can swap the buffer again.
        const resetContent = settings.settings.isDefaultCodeEnabled
          ? resolveDefaultBufferCode(engine.activeEngineId(), engineRegistry)
          : "";
        buffer.setContent(resetContent, { source: "default" });
        buffer.setCursorPosition(1, 1, 0, 0);
        output.clearEntries();
        trust.grantTrust();
        overlays.close("trust-required");
        engine.setBlocked(false);
        engine.terminate();
      });
      // Re-arm the default engine entry so the editor is runnable.
      // selectEngineEntry is a no-op if the entry is identical — that's
      // fine, the engine is now idle. Explicit initializeSelectedEngine()
      // transitions idle → ready without relying on the executeCode fallback.
      const def = engineRegistry.getDefinition(engine.activeEngineId());
      engine.selectEngineEntry({
        engineId: engine.activeEngineId(),
        label: def.label,
        language: engine.activeLanguage(),
      });
      engine.initializeSelectedEngine();
      // Reset the engine URL tracker. The batch above removed `engine` from
      // the URL, but the model's `lastWrittenEngineId` would otherwise stay
      // stale and silently swallow the next buffer update.
      engine.onBufferUpdated("");
    })
  );

  unsubscribers.push(
    dispatcher.on("LOAD_FILE_FROM_DISK", (action) => {
      // File-loaded content is untrusted and user-owned, so the pristine
      // flag must be disarmed (no source arg → defaults to "user").
      buffer.setContent(action.content);
      project.setName(stripExtension(action.name));
      // Selection only — file-loaded code is untrusted, so we MUST NOT
      // spawn an engine worker here. Engine initialization is deferred
      // to GRANT_TRUST.
      engine.selectEngineEntry({
        engineId: action.engineId,
        label: "",
        language: action.language,
      });
      // Defense-in-depth: selectEngineEntry may early-return when the
      // requested engine matches the current one. In that case, the URL is
      // not seeded by selectEngineEntry. Re-running the buffer reconciliation
      // ensures the engine is written to the URL when the file has code.
      engine.onBufferUpdated(action.content);
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

  if (trust.isTrustRequired()) {
    engine.setBlocked(true);
    overlays.open("trust-required");
    // Signals already seeded from URL in the engine constructor — do NOT
    // init here. Initialization is deferred to RUN_CODE (lazy-init).
  } else {
    const initialDef = engineRegistry.getDefinition(engine.activeEngineId());
    engine.selectEngineEntry({
      engineId: engine.activeEngineId(),
      label: initialDef.label,
      language: engine.activeLanguage(),
    });
    // Non-trust startup: explicit init spawns the worker for the
    // URL-seeded (or default) engine.
    engine.initializeSelectedEngine();
  }

  return {
    buffer,
    dispatcher,
    dispose,
    engine,
    engineRegistry,
    fileIo: deps.fileIo,
    fileLoad,
    notifications,
    output,
    overlays,
    project,
    pwa,
    settings,
    shortcuts,
    trust,
  };
}

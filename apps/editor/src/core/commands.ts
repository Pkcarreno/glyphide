import type { EngineId } from "./engine/registry.ts";
import type { EngineModel } from "./models/engine.ts";
import type { NotificationModel } from "./models/notifications.ts";
import type { OutputModel } from "./models/output.ts";
import type { OverlayModel } from "./models/overlay.ts";
import type { WorkspaceSession } from "./models/session.ts";
import type { SettingsModel } from "./models/settings.ts";
import type { FileIoPort } from "./ports/file-io.ts";

/** Dependencies required to construct editor commands. */
export interface EditorCommandsDeps {
  engine: EngineModel;
  fileIo: FileIoPort;
  notifications: NotificationModel;
  output: OutputModel;
  overlays: OverlayModel;
  session: WorkspaceSession;
  settings: SettingsModel;
}

/**
 * Payload for loading a file from disk.
 * @public
 */
export interface LoadFilePayload {
  content: string;
  engineId: EngineId;
  language: string;
  name: string;
}

/**
 * Orchestrating domain commands for the editor.
 * Encapsulates cross-model coordination and asynchronous side effects.
 */
export interface EditorCommands {
  /** Cleans up resources such as pending auto-run timers. */
  dispose: () => void;
  /** Saves the current buffer to a local file using the file IO adapter. */
  downloadBufferToFile: () => Promise<void>;
  /** Grants trust to the current session and unblocks execution. */
  grantTrust: () => void;
  /** Cancels any active code execution in the engine. */
  interruptExecution: () => void;
  /** Loads an external file into the session and requests user trust. */
  loadFile: (payload: LoadFilePayload) => void;
  /** Resets project session, output, and reinitializes the engine. */
  resetProjectState: () => void;
  /** Retries engine initialization, prompting for trust if required. */
  retryEngineInit: () => void;
  /** Executes the buffer code, prompting for trust if required. */
  runCode: () => Promise<void>;
  /** Switches the active engine and language, reinitializing the runner. */
  selectEngine: (engineId: EngineId, language: string) => void;
  /** Updates the buffer code and schedules debounced auto-run if enabled. */
  updateBuffer: (content: string) => void;
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

/** Creates the orchestrated editor commands. */
export function createEditorCommands(deps: EditorCommandsDeps): EditorCommands {
  let autoRunTimer: ReturnType<typeof setTimeout> | undefined;

  function clearAutoRunTimer(): void {
    if (autoRunTimer) {
      clearTimeout(autoRunTimer);
      autoRunTimer = undefined;
    }
  }

  async function runCode(): Promise<void> {
    if (deps.session.isTrustRequired()) {
      deps.overlays.open("trust-required");
      return;
    }
    await deps.engine.executeCode();
  }

  function interruptExecution(): void {
    deps.engine.interruptExecution();
  }

  function selectEngine(engineId: EngineId, language: string): void {
    if (deps.session.isTrustRequired()) {
      deps.overlays.open("trust-required");
      return;
    }
    clearAutoRunTimer();

    const isDifferent =
      engineId !== deps.session.activeEngineId() ||
      language !== deps.session.activeLanguage();

    if (isDifferent) {
      deps.output.clearEntries();
      deps.engine.terminate();
    }

    deps.session.selectEngine(engineId, language);
    deps.engine.initializeSelectedEngine();
  }

  function retryEngineInit(): void {
    if (deps.session.isTrustRequired()) {
      deps.overlays.open("trust-required");
      return;
    }
    deps.engine.retryInit();
  }

  function updateBuffer(content: string): void {
    deps.session.setCode(content, { source: "user" });

    clearAutoRunTimer();

    if (
      deps.settings.settings.isAutoRunEnabled &&
      !deps.session.isTrustRequired()
    ) {
      autoRunTimer = setTimeout(() => {
        const status = deps.engine.engineStatus();
        if (
          deps.settings.settings.isAutoRunEnabled &&
          (status === "ready" || status === "idle")
        ) {
          deps.engine.executeCode().catch(() => undefined);
        }
      }, deps.settings.settings.autoRunDelay);
    }
  }

  function grantTrust(): void {
    deps.session.grantTrust();
    deps.engine.setBlocked(false);
    deps.overlays.close("trust-required");
  }

  function resetProjectState(): void {
    deps.session.reset();
    deps.output.clearEntries();
    deps.overlays.close("trust-required");
    deps.engine.setBlocked(false);
    deps.engine.terminate();
    deps.engine.initializeSelectedEngine();
  }

  function loadFile(payload: LoadFilePayload): void {
    deps.session.loadFile({
      content: payload.content,
      engineId: payload.engineId,
      language: payload.language,
      name: payload.name,
    });
    deps.engine.terminate();
    deps.engine.setBlocked(true);
    deps.overlays.open("trust-required");
  }

  async function downloadBufferToFile(): Promise<void> {
    const content = deps.session.code();
    const baseName = deps.session.projectName();
    const extension = languageToExtension(deps.session.activeLanguage());
    const filename = `${baseName}${extension}`;

    try {
      await deps.fileIo.writeFile(filename, content);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      deps.notifications.dispatchNotification({
        description: message,
        title: "Download failed",
        type: "error",
      });
    }
  }

  function dispose(): void {
    clearAutoRunTimer();
  }

  return {
    dispose,
    downloadBufferToFile,
    grantTrust,
    interruptExecution,
    loadFile,
    resetProjectState,
    retryEngineInit,
    runCode,
    selectEngine,
    updateBuffer,
  };
}

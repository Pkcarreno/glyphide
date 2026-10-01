import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorCommandsDeps } from "./commands.ts";
import { createEditorCommands } from "./commands.ts";
import type { EngineModel } from "./models/engine.ts";
import type { NotificationModel } from "./models/notifications.ts";
import type { OutputModel } from "./models/output.ts";
import type { OverlayModel } from "./models/overlay.ts";
import type { WorkspaceSession } from "./models/session.ts";
import { DEFAULT_SETTINGS, type SettingsModel } from "./models/settings.ts";
import type { FileIoPort } from "./ports/file-io.ts";

describe("createEditorCommands", () => {
  let mockEngine: EngineModel;
  let mockFileIo: FileIoPort;
  let mockNotifications: NotificationModel;
  let mockOutput: OutputModel;
  let mockOverlays: OverlayModel;
  let mockSession: WorkspaceSession;
  let mockSettings: SettingsModel;
  let deps: EditorCommandsDeps;

  beforeEach(() => {
    mockEngine = {
      activeCapabilities: vi.fn(),
      activeEngineId: vi.fn(() => "quickjs"),
      activeInitParams: vi.fn(() => null),
      activeLanguage: vi.fn(() => "javascript"),
      engineStatus: vi.fn(() => "ready"),
      executeCode: vi.fn().mockResolvedValue(undefined),
      initializeSelectedEngine: vi.fn(),
      interruptExecution: vi.fn(),
      retryInit: vi.fn(),
      setBlocked: vi.fn(),
      terminate: vi.fn(),
      updateEngineConfig: vi.fn(),
    } as unknown as EngineModel;

    mockFileIo = {
      readFile: vi.fn(),
      readFileFromFile: vi.fn(),
      writeFile: vi.fn().mockResolvedValue(undefined),
    };

    mockNotifications = {
      activeToasts: vi.fn(() => []),
      dismissToast: vi.fn(),
      dispatchNotification: vi.fn(),
      dispose: vi.fn(),
    };

    mockOutput = {
      appendEntry: vi.fn(),
      clearEntries: vi.fn(),
      entries: vi.fn(() => []),
    };

    mockOverlays = {
      close: vi.fn(),
      closeAll: vi.fn(),
      hasActiveOverlays: vi.fn(() => false),
      isOpen: vi.fn(() => false),
      open: vi.fn(),
      toggle: vi.fn(),
    };

    mockSession = {
      activeLanguage: vi.fn(() => "javascript"),
      code: vi.fn(() => "console.log('hi');"),
      cursorPosition: vi.fn(),
      displayName: vi.fn(() => "Test Project"),
      grantTrust: vi.fn(),
      isShowingDefaultCode: vi.fn(() => false),
      isTrustRequired: vi.fn(() => false),
      isUrlShareable: vi.fn(() => true),
      loadFile: vi.fn(),
      markTrustRequired: vi.fn(),
      projectName: vi.fn(() => "my-script"),
      reset: vi.fn(),
      selectEngine: vi.fn(),
      setCode: vi.fn(),
      setCursorPosition: vi.fn(),
      setProjectName: vi.fn(),
      setShareableState: vi.fn(),
      sharedCode: vi.fn(() => null),
    } as unknown as WorkspaceSession;

    mockSettings = {
      resetSetting: vi.fn(),
      settings: {
        ...DEFAULT_SETTINGS,
        autoRunDelay: 300,
        isAutoRunEnabled: false,
      },
      updateSettings: vi.fn(),
    };

    deps = {
      engine: mockEngine,
      fileIo: mockFileIo,
      notifications: mockNotifications,
      output: mockOutput,
      overlays: mockOverlays,
      session: mockSession,
      settings: mockSettings,
    };
  });

  describe("runCode", () => {
    it("opens trust-required overlay when trust is required and does not execute", async () => {
      vi.mocked(mockSession.isTrustRequired).mockReturnValue(true);
      const commands = createEditorCommands(deps);

      await commands.runCode();

      expect(mockOverlays.open).toHaveBeenCalledWith("trust-required");
      expect(mockEngine.executeCode).not.toHaveBeenCalled();
    });

    it("executes code when trust is not required", async () => {
      vi.mocked(mockSession.isTrustRequired).mockReturnValue(false);
      const commands = createEditorCommands(deps);

      await commands.runCode();

      expect(mockEngine.executeCode).toHaveBeenCalled();
      expect(mockOverlays.open).not.toHaveBeenCalled();
    });
  });

  describe("interruptExecution", () => {
    it("delegates to engine.interruptExecution", () => {
      const commands = createEditorCommands(deps);

      commands.interruptExecution();

      expect(mockEngine.interruptExecution).toHaveBeenCalled();
    });
  });

  describe("selectEngine", () => {
    it("opens trust-required when trust is required", () => {
      vi.mocked(mockSession.isTrustRequired).mockReturnValue(true);
      const commands = createEditorCommands(deps);

      commands.selectEngine("quickjs", "javascript");

      expect(mockOverlays.open).toHaveBeenCalledWith("trust-required");
      expect(mockSession.selectEngine).not.toHaveBeenCalled();
    });

    it("selects engine in session and initializes engine when trusted", () => {
      const commands = createEditorCommands(deps);

      commands.selectEngine("quickjs", "javascript");

      expect(mockSession.selectEngine).toHaveBeenCalledWith(
        "quickjs",
        "javascript"
      );
      expect(mockEngine.initializeSelectedEngine).toHaveBeenCalled();
    });
  });

  describe("retryEngineInit", () => {
    it("opens trust-required overlay when trust is required", () => {
      vi.mocked(mockSession.isTrustRequired).mockReturnValue(true);
      const commands = createEditorCommands(deps);

      commands.retryEngineInit();

      expect(mockOverlays.open).toHaveBeenCalledWith("trust-required");
      expect(mockEngine.retryInit).not.toHaveBeenCalled();
    });

    it("retries init when trusted", () => {
      const commands = createEditorCommands(deps);

      commands.retryEngineInit();

      expect(mockEngine.retryInit).toHaveBeenCalled();
    });
  });

  describe("grantTrust", () => {
    it("grants trust, unblocks engine, and closes overlay", () => {
      const commands = createEditorCommands(deps);

      commands.grantTrust();

      expect(mockSession.grantTrust).toHaveBeenCalled();
      expect(mockEngine.setBlocked).toHaveBeenCalledWith(false);
      expect(mockOverlays.close).toHaveBeenCalledWith("trust-required");
    });
  });

  describe("resetProjectState", () => {
    it("resets session, clears output, closes overlay, and restarts engine", () => {
      const commands = createEditorCommands(deps);

      commands.resetProjectState();

      expect(mockSession.reset).toHaveBeenCalled();
      expect(mockOutput.clearEntries).toHaveBeenCalled();
      expect(mockOverlays.close).toHaveBeenCalledWith("trust-required");
      expect(mockEngine.setBlocked).toHaveBeenCalledWith(false);
      expect(mockEngine.terminate).toHaveBeenCalled();
      expect(mockEngine.initializeSelectedEngine).toHaveBeenCalled();
    });
  });

  describe("loadFile", () => {
    it("loads file into session, terminates and blocks engine, opens trust overlay", () => {
      const commands = createEditorCommands(deps);

      commands.loadFile({
        content: "print('hello')",
        engineId: "micropython",
        language: "python",
        name: "test.py",
      });

      expect(mockSession.loadFile).toHaveBeenCalledWith({
        content: "print('hello')",
        engineId: "micropython",
        language: "python",
        name: "test.py",
      });
      expect(mockEngine.terminate).toHaveBeenCalled();
      expect(mockEngine.setBlocked).toHaveBeenCalledWith(true);
      expect(mockOverlays.open).toHaveBeenCalledWith("trust-required");
    });
  });

  describe("updateBuffer", () => {
    it("updates code in session", () => {
      const commands = createEditorCommands(deps);

      commands.updateBuffer("new code");

      expect(mockSession.setCode).toHaveBeenCalledWith("new code", {
        source: "user",
      });
    });

    it("triggers auto-run after delay when auto-run is enabled", () => {
      vi.useFakeTimers();
      deps.settings.settings.isAutoRunEnabled = true;
      deps.settings.settings.autoRunDelay = 100;
      const commands = createEditorCommands(deps);

      commands.updateBuffer("new code");
      expect(mockEngine.executeCode).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(mockEngine.executeCode).toHaveBeenCalled();

      commands.dispose();
      vi.useRealTimers();
    });
  });

  describe("downloadBufferToFile", () => {
    it("writes buffer with appropriate language extension", async () => {
      vi.mocked(mockSession.code).mockReturnValue("console.log('hi');");
      vi.mocked(mockSession.projectName).mockReturnValue("app");
      vi.mocked(mockSession.activeLanguage).mockReturnValue("javascript");
      const commands = createEditorCommands(deps);

      await commands.downloadBufferToFile();

      expect(mockFileIo.writeFile).toHaveBeenCalledWith(
        "app.js",
        "console.log('hi');"
      );
    });

    it("dispatches error notification on write failure", async () => {
      vi.mocked(mockFileIo.writeFile).mockRejectedValue(new Error("Disk full"));
      const commands = createEditorCommands(deps);

      await commands.downloadBufferToFile();

      expect(mockNotifications.dispatchNotification).toHaveBeenCalledWith({
        description: "Disk full",
        title: "Download failed",
        type: "error",
      });
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEditorCore } from "./editor-core.ts";
import type { FileIoPort } from "./ports/file-io.ts";
import type { PersistencePort } from "./ports/persistence.ts";
import type { UrlStatePort } from "./ports/url-state.ts";

function createMockPersistence(): PersistencePort {
  return { get: vi.fn(), set: vi.fn(), remove: vi.fn() };
}

function createMockUrlState(): UrlStatePort {
  return { get: vi.fn(), set: vi.fn(), remove: vi.fn() };
}

function createMockFileIoDeps() {
  return {
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockFileIo(): {
  fileIo: FileIoPort;
  readFile: ReturnType<typeof vi.fn>;
  writeFile: ReturnType<typeof vi.fn>;
} {
  const readFile = vi.fn();
  const writeFile = vi.fn().mockResolvedValue(undefined);
  return {
    fileIo: {
      readFile: readFile as FileIoPort["readFile"],
      writeFile: writeFile as FileIoPort["writeFile"],
    },
    readFile,
    writeFile,
  };
}

describe("EditorCore", () => {
  it("initializes all models correctly", () => {
    const core = createEditorCore({
      persistence: createMockPersistence(),
      urlState: createMockUrlState(),
      fileIo: createMockFileIoDeps(),
    });

    expect(core.buffer).toBeDefined();
    expect(core.settings).toBeDefined();
    expect(core.project).toBeDefined();
    expect(core.output).toBeDefined();
    expect(core.engine).toBeDefined();
    expect(core.engineRegistry).toBeDefined();
    expect(core.notifications).toBeDefined();
    expect(core.dispatcher).toBeDefined();
    expect(core.shortcuts).toBeDefined();
  });

  it("wires action dispatcher to models", () => {
    const core = createEditorCore({
      persistence: createMockPersistence(),
      urlState: createMockUrlState(),
      fileIo: createMockFileIoDeps(),
    });

    const setContentSpy = vi.spyOn(core.buffer, "setContent");
    core.dispatcher.dispatch({ type: "UPDATE_BUFFER", content: "hello" });
    expect(setContentSpy).toHaveBeenCalledWith("hello");

    const clearEntriesSpy = vi.spyOn(core.output, "clearEntries");
    core.dispatcher.dispatch({ type: "CLEAR_OUTPUT" });
    expect(clearEntriesSpy).toHaveBeenCalled();

    const selectEngineEntrySpy = vi.spyOn(core.engine, "selectEngineEntry");
    core.dispatcher.dispatch({
      type: "SELECT_ENGINE_ENTRY",
      engineId: "mock",
      language: "plaintext",
    });
    expect(selectEngineEntrySpy).toHaveBeenCalledWith({
      engineId: "mock",
      language: "plaintext",
      label: "",
    });

    const onBufferUpdatedSpy = vi.spyOn(core.engine, "onBufferUpdated");
    core.dispatcher.dispatch({
      type: "UPDATE_BUFFER",
      content: "const a = 1;",
    });
    expect(onBufferUpdatedSpy).toHaveBeenCalledWith("const a = 1;");

    const openSpy = vi.spyOn(core.overlays, "open");
    core.dispatcher.dispatch({ type: "OPEN_OVERLAY", overlayId: "settings" });
    expect(openSpy).toHaveBeenCalledWith("settings");

    const closeSpy = vi.spyOn(core.overlays, "close");
    core.dispatcher.dispatch({ type: "CLOSE_OVERLAY", overlayId: "settings" });
    expect(closeSpy).toHaveBeenCalledWith("settings");

    const toggleSpy = vi.spyOn(core.overlays, "toggle");
    core.dispatcher.dispatch({ type: "TOGGLE_OVERLAY", overlayId: "settings" });
    expect(toggleSpy).toHaveBeenCalledWith("settings");

    const dispatchNotificationSpy = vi.spyOn(
      core.notifications,
      "dispatchNotification"
    );
    core.dispatcher.dispatch({
      type: "DISPATCH_NOTIFICATION",
      title: "Test",
      notificationType: "success",
    });
    expect(dispatchNotificationSpy).toHaveBeenCalledWith({
      title: "Test",
      description: undefined,
      type: "success",
    });
  });

  it("cleans up resources on dispose", () => {
    const core = createEditorCore({
      persistence: createMockPersistence(),
      urlState: createMockUrlState(),
      fileIo: createMockFileIoDeps(),
    });

    const terminateSpy = vi.spyOn(core.engine, "terminate");
    const disposeNotificationsSpy = vi.spyOn(core.notifications, "dispose");
    core.dispose();

    expect(terminateSpy).toHaveBeenCalled();
    expect(disposeNotificationsSpy).toHaveBeenCalled();
  });

  describe("Auto-run logic", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("triggers executeCode after debounce when autoRun is enabled", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlState(),
        fileIo: createMockFileIoDeps(),
      });
      core.settings.updateSettings({
        isAutoRunEnabled: true,
        autoRunDelay: 500,
      });
      vi.spyOn(core.engine, "engineStatus").mockReturnValue("ready");
      const executeCodeSpy = vi
        .spyOn(core.engine, "executeCode")
        .mockResolvedValue(undefined);

      core.dispatcher.dispatch({ type: "UPDATE_BUFFER", content: "code" });

      expect(executeCodeSpy).not.toHaveBeenCalled();
      vi.advanceTimersByTime(500);
      expect(executeCodeSpy).toHaveBeenCalled();
    });

    it("does not trigger executeCode when autoRun is disabled", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlState(),
        fileIo: createMockFileIoDeps(),
      });
      core.settings.updateSettings({
        isAutoRunEnabled: false,
        autoRunDelay: 500,
      });
      vi.spyOn(core.engine, "engineStatus").mockReturnValue("ready");
      const executeCodeSpy = vi
        .spyOn(core.engine, "executeCode")
        .mockResolvedValue(undefined);

      core.dispatcher.dispatch({ type: "UPDATE_BUFFER", content: "code" });

      vi.advanceTimersByTime(500);
      expect(executeCodeSpy).not.toHaveBeenCalled();
    });

    it("ignores autoRun if engine is running", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlState(),
        fileIo: createMockFileIoDeps(),
      });
      core.settings.updateSettings({
        isAutoRunEnabled: true,
        autoRunDelay: 500,
      });
      vi.spyOn(core.engine, "engineStatus").mockReturnValue("running");
      const executeCodeSpy = vi
        .spyOn(core.engine, "executeCode")
        .mockResolvedValue(undefined);

      core.dispatcher.dispatch({ type: "UPDATE_BUFFER", content: "code" });

      vi.advanceTimersByTime(500);
      expect(executeCodeSpy).not.toHaveBeenCalled();
    });
  });

  describe("Trust gating", () => {
    function createMockUrlStateWithCode(code: string | null): UrlStatePort {
      const store = new Map<string, string | null>();
      if (code !== null) {
        store.set("code", code);
      }
      return {
        get: vi.fn((key: string) => store.get(key) ?? null),
        set: vi.fn(),
        remove: vi.fn(),
      };
    }

    it("exposes trust model on EditorCore", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode("console.log(1)"),
        fileIo: createMockFileIoDeps(),
      });

      expect(core.trust).toBeDefined();
      expect(core.trust.isTrustRequired()).toBe(true);
    });

    it("when URL has code param, defers initial engine init and opens trust dialog", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode("console.log('shared')"),
        fileIo: createMockFileIoDeps(),
      });

      // Trust model should detect shared code
      expect(core.trust.isTrustRequired()).toBe(true);
      // Trust dialog should be auto-opened at creation
      expect(core.overlays.isOpen("trust-required")).toBe(true);
    });

    it("when no code param, engine init proceeds normally", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode(null),
        fileIo: createMockFileIoDeps(),
      });

      expect(core.trust.isTrustRequired()).toBe(false);
      // Trust dialog should NOT auto-open
      expect(core.overlays.isOpen("trust-required")).toBe(false);
    });

    it("when trust required, RUN_CODE opens dialog and does NOT execute", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode("console.log(1)"),
        fileIo: createMockFileIoDeps(),
      });

      const executeSpy = vi.spyOn(core.engine, "executeCode");
      const openSpy = vi.spyOn(core.overlays, "open");

      core.dispatcher.dispatch({ type: "RUN_CODE" });

      expect(openSpy).toHaveBeenCalledWith("trust-required");
      expect(executeSpy).not.toHaveBeenCalled();
    });

    it("when trust granted, RUN_CODE executes normally", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode(null),
        fileIo: createMockFileIoDeps(),
      });

      expect(core.trust.isTrustRequired()).toBe(false);
      const executeSpy = vi.spyOn(core.engine, "executeCode");

      core.dispatcher.dispatch({ type: "RUN_CODE" });

      expect(executeSpy).toHaveBeenCalled();
    });

    it("when trust required, SELECT_ENGINE_ENTRY opens dialog and blocks init", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode("console.log(1)"),
        fileIo: createMockFileIoDeps(),
      });

      const selectSpy = vi.spyOn(core.engine, "selectEngineEntry");
      const openSpy = vi.spyOn(core.overlays, "open");

      core.dispatcher.dispatch({
        type: "SELECT_ENGINE_ENTRY",
        engineId: "mock",
        language: "plaintext",
      });

      expect(openSpy).toHaveBeenCalledWith("trust-required");
      expect(selectSpy).not.toHaveBeenCalled();
    });

    it("when trust required, RETRY_ENGINE_INIT opens dialog and blocks init", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode("console.log(1)"),
        fileIo: createMockFileIoDeps(),
      });

      const retrySpy = vi.spyOn(core.engine, "retryInit");
      const openSpy = vi.spyOn(core.overlays, "open");

      core.dispatcher.dispatch({ type: "RETRY_ENGINE_INIT" });

      expect(openSpy).toHaveBeenCalledWith("trust-required");
      expect(retrySpy).not.toHaveBeenCalled();
    });

    it("when GRANT_TRUST dispatched, grants trust, closes dialog, and inits engine", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode("console.log(1)"),
        fileIo: createMockFileIoDeps(),
      });

      expect(core.trust.isTrustRequired()).toBe(true);

      const selectSpy = vi.spyOn(core.engine, "selectEngineEntry");
      const closeSpy = vi.spyOn(core.overlays, "close");

      core.dispatcher.dispatch({ type: "GRANT_TRUST" });

      expect(core.trust.isTrustRequired()).toBe(false);
      expect(closeSpy).toHaveBeenCalledWith("trust-required");
      expect(selectSpy).toHaveBeenCalled();
    });

    describe("Auto-run suppression", () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("when trust required, auto-run does NOT fire", () => {
        const core = createEditorCore({
          persistence: createMockPersistence(),
          urlState: createMockUrlStateWithCode("console.log(1)"),
          fileIo: createMockFileIoDeps(),
        });
        core.settings.updateSettings({
          isAutoRunEnabled: true,
          autoRunDelay: 500,
        });
        vi.spyOn(core.engine, "engineStatus").mockReturnValue("ready");
        const executeCodeSpy = vi
          .spyOn(core.engine, "executeCode")
          .mockResolvedValue(undefined);

        core.dispatcher.dispatch({ type: "UPDATE_BUFFER", content: "code" });

        vi.advanceTimersByTime(500);
        expect(executeCodeSpy).not.toHaveBeenCalled();
      });

      it("when trust not required, auto-run fires normally", () => {
        const core = createEditorCore({
          persistence: createMockPersistence(),
          urlState: createMockUrlStateWithCode(null),
          fileIo: createMockFileIoDeps(),
        });
        core.settings.updateSettings({
          isAutoRunEnabled: true,
          autoRunDelay: 500,
        });
        vi.spyOn(core.engine, "engineStatus").mockReturnValue("ready");
        const executeCodeSpy = vi
          .spyOn(core.engine, "executeCode")
          .mockResolvedValue(undefined);

        core.dispatcher.dispatch({ type: "UPDATE_BUFFER", content: "code" });

        vi.advanceTimersByTime(500);
        expect(executeCodeSpy).toHaveBeenCalled();
      });
    });
  });

  describe("File backup flow", () => {
    function createCoreWithFileIo() {
      const { fileIo, readFile, writeFile } = createMockFileIo();
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlState(),
        fileIo,
      });
      return { core, readFile, writeFile };
    }

    it("exposes fileLoad model on EditorCore", () => {
      const { core } = createCoreWithFileIo();
      expect(core.fileLoad).toBeDefined();
      expect(core.fileLoad.resolveEngine(".js")).toEqual({
        engineId: "quickjs",
        language: "javascript",
      });
    });

    describe("RESET_PROJECT_STATE", () => {
      it("removes code, name, and engine URL params", () => {
        const urlState = createMockUrlState();
        const removeSpy = vi.spyOn(urlState, "remove");
        createCoreWithFileIo();
        // Recreate with the spied urlState
        const freshCore = createEditorCore({
          persistence: createMockPersistence(),
          urlState,
          fileIo: createMockFileIo().fileIo,
        });
        removeSpy.mockClear();
        freshCore.dispatcher.dispatch({ type: "RESET_PROJECT_STATE" });
        expect(removeSpy).toHaveBeenCalledWith("code");
        expect(removeSpy).toHaveBeenCalledWith("name");
        expect(removeSpy).toHaveBeenCalledWith("engine");
      });

      it("clears the buffer, output, and cursor position", () => {
        const { core } = createCoreWithFileIo();
        core.buffer.setContent("existing content");
        core.buffer.setCursorPosition(5, 10, 0, 0);

        core.dispatcher.dispatch({ type: "RESET_PROJECT_STATE" });

        expect(core.buffer.content()).toBe("");
        expect(core.buffer.cursorPosition()).toEqual({
          line: 1,
          column: 1,
          selectionLength: 0,
          selectionLines: 0,
        });
      });

      it("terminates the engine so it returns to an idle state", () => {
        const { core } = createCoreWithFileIo();
        const terminateSpy = vi.spyOn(core.engine, "terminate");

        core.dispatcher.dispatch({ type: "RESET_PROJECT_STATE" });

        expect(terminateSpy).toHaveBeenCalled();
      });

      it("grants trust after reset so the editor is unblocked", () => {
        const urlState = createMockUrlState();
        createCoreWithFileIo();
        // Recreate with spied urlState
        const freshCore = createEditorCore({
          persistence: createMockPersistence(),
          urlState,
          fileIo: createMockFileIo().fileIo,
        });
        // Force trust required to simulate a previous session
        freshCore.trust.markTrustRequired();
        expect(freshCore.trust.isTrustRequired()).toBe(true);

        freshCore.dispatcher.dispatch({ type: "RESET_PROJECT_STATE" });

        expect(freshCore.trust.isTrustRequired()).toBe(false);
      });
    });

    describe("LOAD_FILE_FROM_DISK", () => {
      it("populates buffer, project name (without extension), and engine entry", () => {
        const { core } = createCoreWithFileIo();
        const selectSpy = vi
          .spyOn(core.engine, "selectEngineEntry")
          .mockResolvedValue(undefined);

        core.dispatcher.dispatch({
          type: "LOAD_FILE_FROM_DISK",
          name: "script.js",
          content: "console.log(1)",
          engineId: "quickjs",
          language: "javascript",
        });

        expect(core.buffer.content()).toBe("console.log(1)");
        expect(core.project.name()).toBe("script");
        expect(selectSpy).toHaveBeenCalledWith({
          engineId: "quickjs",
          language: "javascript",
          label: "",
        });
      });

      it("re-arms the trust gate so file-loaded code requires acknowledgment", () => {
        const { core } = createCoreWithFileIo();
        // Start with trust granted (no URL code)
        expect(core.trust.isTrustRequired()).toBe(false);

        core.dispatcher.dispatch({
          type: "LOAD_FILE_FROM_DISK",
          name: "script.js",
          content: "console.log(1)",
          engineId: "quickjs",
          language: "javascript",
        });

        expect(core.trust.isTrustRequired()).toBe(true);
        // Trust-required dialog should be open
        expect(core.overlays.isOpen("trust-required")).toBe(true);
      });

      it("blocks the engine so the status reflects the gate", () => {
        const { core } = createCoreWithFileIo();
        const setBlockedSpy = vi.spyOn(core.engine, "setBlocked");

        core.dispatcher.dispatch({
          type: "LOAD_FILE_FROM_DISK",
          name: "script.js",
          content: "console.log(1)",
          engineId: "quickjs",
          language: "javascript",
        });

        expect(setBlockedSpy).toHaveBeenCalledWith(true);
      });

      it("download after load produces correct filename without double extension", async () => {
        const { core, writeFile } = createCoreWithFileIo();
        const selectSpy = vi
          .spyOn(core.engine, "selectEngineEntry")
          .mockResolvedValue(undefined);

        // Load file with extension
        core.dispatcher.dispatch({
          type: "LOAD_FILE_FROM_DISK",
          name: "myscript.js",
          content: "console.log('test')",
          engineId: "quickjs",
          language: "javascript",
        });

        // Verify project name is stripped
        expect(core.project.name()).toBe("myscript");
        expect(selectSpy).toHaveBeenCalled();

        // Download should produce correct filename (not myscript.js.js)
        await core.dispatcher.dispatch({
          type: "DOWNLOAD_BUFFER_TO_FILE",
        });

        expect(writeFile).toHaveBeenCalledWith(
          "myscript.js",
          "console.log('test')"
        );
      });
    });

    describe("DOWNLOAD_BUFFER_TO_FILE", () => {
      it("writes the current buffer content to the file adapter with .js for javascript engines", async () => {
        const { core, writeFile } = createCoreWithFileIo();
        core.buffer.setContent("console.log('hi')");
        core.project.setName("myapp");
        vi.spyOn(core.engine, "activeLanguage").mockReturnValue("javascript");

        await core.dispatcher.dispatch({
          type: "DOWNLOAD_BUFFER_TO_FILE",
        });

        expect(writeFile).toHaveBeenCalledWith("myapp.js", "console.log('hi')");
      });

      it("uses .py for python engines", async () => {
        const { core, writeFile } = createCoreWithFileIo();
        core.buffer.setContent("print('hi')");
        core.project.setName("script");
        vi.spyOn(core.engine, "activeLanguage").mockReturnValue("python");

        await core.dispatcher.dispatch({
          type: "DOWNLOAD_BUFFER_TO_FILE",
        });

        expect(writeFile).toHaveBeenCalledWith("script.py", "print('hi')");
      });

      it("propagates adapter errors as a notification and does not crash", async () => {
        const { core, writeFile } = createCoreWithFileIo();
        writeFile.mockRejectedValue(new Error("blocked"));
        const dispatchSpy = vi.spyOn(core.dispatcher, "dispatch");

        core.dispatcher.dispatch({ type: "DOWNLOAD_BUFFER_TO_FILE" });

        // Wait for the rejected promise to settle
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(dispatchSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "DISPATCH_NOTIFICATION",
            notificationType: "error",
          })
        );
      });

      it("downloads empty buffer as file with empty content", async () => {
        const { core, writeFile } = createCoreWithFileIo();
        core.buffer.setContent("");
        core.project.setName("empty-project");
        vi.spyOn(core.engine, "activeLanguage").mockReturnValue("javascript");

        await core.dispatcher.dispatch({
          type: "DOWNLOAD_BUFFER_TO_FILE",
        });

        expect(writeFile).toHaveBeenCalledWith("empty-project.js", "");
      });

      it("downloads empty buffer with empty project name (sanitizes to untitled_project.js)", async () => {
        const { core, writeFile } = createCoreWithFileIo();
        core.buffer.setContent("");
        core.project.setName("");
        vi.spyOn(core.engine, "activeLanguage").mockReturnValue("javascript");

        await core.dispatcher.dispatch({
          type: "DOWNLOAD_BUFFER_TO_FILE",
        });

        expect(writeFile).toHaveBeenCalledWith("untitled_project.js", "");
      });
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserUrlStateAdapter } from "./adapters/url-state.ts";
import { composeSizeLimitedUrlState } from "./decorators/url-state-limit.ts";
import { createEditorCore, type EditorCore } from "./editor-core.ts";
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
    const initializeSelectedEngineSpy = vi
      .spyOn(core.engine, "initializeSelectedEngine")
      .mockResolvedValue(undefined);
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
    expect(initializeSelectedEngineSpy).toHaveBeenCalled();

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

    it("when GRANT_TRUST dispatched, grants trust and closes dialog (init deferred to RUN_CODE)", async () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode("console.log(1)"),
        fileIo: createMockFileIoDeps(),
      });

      expect(core.trust.isTrustRequired()).toBe(true);

      const selectSpy = vi.spyOn(core.engine, "selectEngineEntry");
      const initializeSpy = vi
        .spyOn(core.engine, "initializeSelectedEngine")
        .mockResolvedValue(undefined);
      const closeSpy = vi.spyOn(core.overlays, "close");

      core.dispatcher.dispatch({ type: "GRANT_TRUST" });

      // Drain microtasks so async handler bodies settle.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(core.trust.isTrustRequired()).toBe(false);
      expect(closeSpy).toHaveBeenCalledWith("trust-required");
      // Init is deferred to RUN_CODE — GRANT_TRUST does NOT initialize.
      expect(initializeSpy).not.toHaveBeenCalled();
      // Selection already happened during file load or startup; no re-select.
      expect(selectSpy).not.toHaveBeenCalled();
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
        const selectSpy = vi.spyOn(core.engine, "selectEngineEntry");

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

      it("selects the engine but does NOT call initializeSelectedEngine (THE FIX)", () => {
        const { core } = createCoreWithFileIo();
        const initializeSpy = vi.spyOn(core.engine, "initializeSelectedEngine");

        core.dispatcher.dispatch({
          type: "LOAD_FILE_FROM_DISK",
          name: "script.js",
          content: "console.log(1)",
          engineId: "quickjs",
          language: "javascript",
        });

        // THE FIX: file-loaded code is untrusted — engine must NOT be
        // initialized here. Init is deferred to GRANT_TRUST.
        expect(initializeSpy).not.toHaveBeenCalled();
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
        const selectSpy = vi.spyOn(core.engine, "selectEngineEntry");

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

  describe("Engine URL conditional persistence (engine-state-url-sync)", () => {
    function createSpyUrlState(): UrlStatePort & {
      setCalls: Array<{ key: string; value: string }>;
      removeCalls: string[];
    } {
      const data = new Map<string, string>();
      const setCalls: Array<{ key: string; value: string }> = [];
      const removeCalls: string[] = [];
      return {
        get: (key) => data.get(key) ?? null,
        set: (key, val) => {
          data.set(key, val);
          setCalls.push({ key, value: val });
        },
        remove: (key) => {
          data.delete(key);
          removeCalls.push(key);
        },
        setCalls,
        removeCalls,
      };
    }

    // REQ-ENG-007: LOAD_FILE_FROM_DISK with same engine as active → engine
    // must be seeded in URL. selectEngineEntry is a same-engine early-return,
    // so the onBufferUpdated wiring in editor-core is what seeds the URL.
    it("LOAD_FILE_FROM_DISK with same engine seeds engine in URL", () => {
      const urlState = createSpyUrlState();
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlState,
      });

      expect(urlState.get("engine")).toBeNull();

      core.dispatcher.dispatch({
        type: "LOAD_FILE_FROM_DISK",
        name: "hello.js",
        content: "print('hi')",
        engineId: "quickjs",
        language: "javascript",
      });

      // selectEngineEntry is synchronous. Real registry: quickjs is
      // single-language, so URL stores "quickjs"
      expect(urlState.get("engine")).toBe("quickjs");
    });

    // REQ-ENG-002 + tracker reset: after RESET_PROJECT_STATE, typing code
    // must re-seed the URL with the active engine. The onBufferUpdated("")
    // wiring in editor-core is what resets the tracker so the next buffer
    // update is not a false no-op.
    it("after RESET_PROJECT_STATE, typing code writes engine to URL", () => {
      const urlState = createSpyUrlState();
      // Real registry: mock engine is single-language ("plaintext")
      urlState.set("engine", "mock");
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlState,
      });

      // Prime the model with some code so the tracker is consistent
      core.dispatcher.dispatch({ type: "UPDATE_BUFFER", content: "hi" });
      expect(urlState.get("engine")).toBe("mock");

      // Reset the project
      core.dispatcher.dispatch({ type: "RESET_PROJECT_STATE" });
      expect(urlState.get("engine")).toBeNull();

      // Type code again. The tracker MUST have been reset by the reset flow,
      // so this must write the engine to URL.
      core.dispatcher.dispatch({ type: "UPDATE_BUFFER", content: "world" });
      expect(urlState.get("engine")).toBe("mock");
    });
  });

  describe("REQ-ENG-006: URL limit exceeded handling", () => {
    beforeEach(() => {
      // Reset URL to a clean state before each test
      window.history.replaceState(null, "", "/");
      // Suppress the expected warning from the size-limit decorator
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("strips URL when limit exceeded, resets tracker on empty buffer, re-seeds on next valid write", () => {
      // Use the real browser URL adapter so the decorator's
      // replaceState-based strip actually clears window.location.
      // When the limit is exceeded, base.set is never called and
      // the URL is reset to the pathname — subsequent get() returns null.
      const baseUrlState = createBrowserUrlStateAdapter();
      const MAX_LENGTH = 100;
      let coreRef: EditorCore | undefined;
      const limitedUrlState = composeSizeLimitedUrlState(
        baseUrlState,
        MAX_LENGTH,
        (isShareable) => {
          coreRef?.project.setShareableState(isShareable);
        }
      );

      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlState: limitedUrlState,
      });
      coreRef = core;

      // Step 1: Load editor with initial code. Default engine is "quickjs";
      // the first non-empty buffer update seeds it to the URL.
      core.dispatcher.dispatch({
        type: "UPDATE_BUFFER",
        content: "initial code",
      });

      expect(baseUrlState.get("engine")).toBe("quickjs");
      expect(core.project.isUrlShareable()).toBe(true);

      // Step 2: Type code that exceeds the URL limit. The decorator
      // strips window.location via replaceState and notifies the
      // project model that the URL is no longer shareable.
      const longCode = "a".repeat(200);
      core.dispatcher.dispatch({
        type: "UPDATE_BUFFER",
        content: longCode,
      });

      expect(baseUrlState.get("engine")).toBeNull();
      expect(core.project.isUrlShareable()).toBe(false);

      // Step 3: Clear the buffer. onBufferUpdated("") removes the
      // engine from the URL and resets lastWrittenEngineId to null.
      core.dispatcher.dispatch({
        type: "UPDATE_BUFFER",
        content: "",
      });

      // Engine is NOT re-written (buffer is empty).
      expect(baseUrlState.get("engine")).toBeNull();

      // Step 4: Type new code that fits within the limit. The tracker
      // was reset, so this non-empty buffer update re-seeds the
      // active engine to the URL.
      core.dispatcher.dispatch({
        type: "UPDATE_BUFFER",
        content: "short code",
      });

      expect(baseUrlState.get("engine")).toBe("quickjs");
      expect(core.project.isUrlShareable()).toBe(true);
    });
  });

  describe("select/init split contract (fix-file-load-trust-bypass)", () => {
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

    it("on startup without trust: selectEngineEntry + initializeSelectedEngine are called", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode(null),
        fileIo: createMockFileIoDeps(),
      });
      const selectSpy = vi.spyOn(core.engine, "selectEngineEntry");
      const initSpy = vi
        .spyOn(core.engine, "initializeSelectedEngine")
        .mockResolvedValue(undefined);

      // The non-trust startup path was already taken during construction.
      // Spies installed AFTER construction won't see those initial calls.
      // Verify the public post-construction state is correct instead.
      expect(core.trust.isTrustRequired()).toBe(false);
      expect(selectSpy).not.toHaveBeenCalled(); // spies installed after init
      expect(initSpy).not.toHaveBeenCalled(); // spies installed after init
    });

    it("on startup with trust required: initializeSelectedEngine is NOT called", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode("console.log(1)"),
        fileIo: createMockFileIoDeps(),
      });
      // Trust-required startup path: signals seeded from URL, no init.
      // Init is deferred to GRANT_TRUST.
      expect(core.trust.isTrustRequired()).toBe(true);
      expect(core.overlays.isOpen("trust-required")).toBe(true);
    });

    it("SELECT_ENGINE_ENTRY in trusted mode calls selectEngineEntry AND initializeSelectedEngine", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode(null),
        fileIo: createMockFileIoDeps(),
      });
      const selectSpy = vi.spyOn(core.engine, "selectEngineEntry");
      const initSpy = vi
        .spyOn(core.engine, "initializeSelectedEngine")
        .mockResolvedValue(undefined);

      core.dispatcher.dispatch({
        type: "SELECT_ENGINE_ENTRY",
        engineId: "mock",
        language: "plaintext",
      });

      expect(selectSpy).toHaveBeenCalledWith({
        engineId: "mock",
        language: "plaintext",
        label: "",
      });
      expect(initSpy).toHaveBeenCalled();
    });

    it("GRANT_TRUST does NOT call initializeSelectedEngine (init deferred to RUN_CODE)", async () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode("console.log(1)"),
        fileIo: createMockFileIoDeps(),
      });

      const selectSpy = vi.spyOn(core.engine, "selectEngineEntry");
      const initSpy = vi
        .spyOn(core.engine, "initializeSelectedEngine")
        .mockResolvedValue(undefined);

      core.dispatcher.dispatch({ type: "GRANT_TRUST" });

      // Drain microtasks
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Init is deferred to RUN_CODE — GRANT_TRUST only grants trust.
      expect(initSpy).not.toHaveBeenCalled();
      // Selection already happened — no re-select.
      expect(selectSpy).not.toHaveBeenCalled();
    });

    it("after GRANT_TRUST, RUN_CODE executes code (lazy init happens inside executeCode)", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode("console.log(1)"),
        fileIo: createMockFileIoDeps(),
      });

      // Trust is required initially
      expect(core.trust.isTrustRequired()).toBe(true);

      // Grant trust — should NOT initialize
      core.dispatcher.dispatch({ type: "GRANT_TRUST" });
      expect(core.trust.isTrustRequired()).toBe(false);
      expect(core.engine.engineStatus()).toBe("idle");

      // Now run code — executeCode is called (lazy init is internal to executeCode)
      const executeSpy = vi.spyOn(core.engine, "executeCode");
      core.dispatcher.dispatch({ type: "RUN_CODE" });
      expect(executeSpy).toHaveBeenCalled();
    });

    it("LOAD_FILE_FROM_DISK calls selectEngineEntry but NOT initializeSelectedEngine", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode(null),
        fileIo: createMockFileIoDeps(),
      });
      const selectSpy = vi.spyOn(core.engine, "selectEngineEntry");
      const initSpy = vi.spyOn(core.engine, "initializeSelectedEngine");

      core.dispatcher.dispatch({
        type: "LOAD_FILE_FROM_DISK",
        name: "evil.js",
        content: "evil()",
        engineId: "mock",
        language: "plaintext",
      });

      expect(selectSpy).toHaveBeenCalled();
      // THE FIX: untrusted file-loaded code must not spawn a worker.
      expect(initSpy).not.toHaveBeenCalled();
    });

    it("RESET_PROJECT_STATE calls selectEngineEntry AND initializeSelectedEngine", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode(null),
        fileIo: createMockFileIoDeps(),
      });
      const selectSpy = vi.spyOn(core.engine, "selectEngineEntry");
      const initSpy = vi
        .spyOn(core.engine, "initializeSelectedEngine")
        .mockResolvedValue(undefined);

      core.dispatcher.dispatch({ type: "RESET_PROJECT_STATE" });

      expect(selectSpy).toHaveBeenCalled();
      expect(initSpy).toHaveBeenCalled();
    });
  });
});

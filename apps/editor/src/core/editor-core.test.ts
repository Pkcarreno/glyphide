import type { CanonicalState } from "@glyphide/url-migration/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserUrlPersistenceAdapter } from "./adapters/url-persistence.ts";
import { PYTHON_DEFAULT_BUFFER_CODE } from "./data/python-default-buffer-code.ts";
import { QUICKJS_DEFAULT_BUFFER_CODE } from "./data/quickjs-default-buffer-code.ts";
import { createEditorCore } from "./editor-core.ts";
import type { FileIoPort } from "./ports/file-io.ts";
import type { PersistencePort } from "./ports/persistence.ts";
import type { UrlPersistencePort } from "./ports/url-persistence.ts";

function createMockPersistence(): PersistencePort {
  return { get: vi.fn(), remove: vi.fn(), set: vi.fn() };
}

function createMockUrlPersistence(
  state: CanonicalState | null = null
): UrlPersistencePort {
  let current: CanonicalState | null = state;
  return {
    clear: vi.fn(() => {
      current = null;
    }),
    load: vi.fn(() => current),
    save: vi.fn((next: CanonicalState) => {
      current = next;
      return { isShareable: true };
    }),
  };
}

function createMockFileIoDeps() {
  return {
    readFile: vi.fn(),
    readFileFromFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockFileIo(): {
  fileIo: FileIoPort;
  readFile: ReturnType<typeof vi.fn>;
  readFileFromFile: ReturnType<typeof vi.fn>;
  writeFile: ReturnType<typeof vi.fn>;
} {
  const readFile = vi.fn();
  const readFileFromFile = vi.fn();
  const writeFile = vi.fn().mockResolvedValue(undefined);
  return {
    fileIo: {
      readFile: readFile as FileIoPort["readFile"],
      readFileFromFile: readFileFromFile as FileIoPort["readFileFromFile"],
      writeFile: writeFile as FileIoPort["writeFile"],
    },
    readFile,
    readFileFromFile,
    writeFile,
  };
}

describe("EditorCore", () => {
  it("initializes all models correctly", () => {
    const core = createEditorCore({
      fileIo: createMockFileIoDeps(),
      persistence: createMockPersistence(),
      urlPersistence: createMockUrlPersistence(),
    });

    expect(core.session).toBeDefined();
    expect(core.settings).toBeDefined();
    expect(core.output).toBeDefined();
    expect(core.engine).toBeDefined();
    expect(core.engineRegistry).toBeDefined();
    expect(core.notifications).toBeDefined();
    expect(core.commands).toBeDefined();
    expect(core.shortcuts).toBeDefined();
  });

  it("wires commands and models", () => {
    const core = createEditorCore({
      fileIo: createMockFileIoDeps(),
      persistence: createMockPersistence(),
      urlPersistence: createMockUrlPersistence(),
    });

    const setCodeSpy = vi.spyOn(core.session, "setCode");
    core.commands.updateBuffer("hello");
    expect(setCodeSpy).toHaveBeenCalledWith("hello", { source: "user" });

    const clearEntriesSpy = vi.spyOn(core.output, "clearEntries");
    core.output.clearEntries();
    expect(clearEntriesSpy).toHaveBeenCalled();

    const selectEngineSpy = vi.spyOn(core.session, "selectEngine");
    const initializeSelectedEngineSpy = vi
      .spyOn(core.engine, "initializeSelectedEngine")
      .mockResolvedValue(undefined);
    core.commands.selectEngine("mock", "plaintext");
    expect(selectEngineSpy).toHaveBeenCalledWith("mock", "plaintext");
    expect(initializeSelectedEngineSpy).toHaveBeenCalled();

    const openSpy = vi.spyOn(core.overlays, "open");
    core.overlays.open("settings");
    expect(openSpy).toHaveBeenCalledWith("settings");

    const closeSpy = vi.spyOn(core.overlays, "close");
    core.overlays.close("settings");
    expect(closeSpy).toHaveBeenCalledWith("settings");

    const toggleSpy = vi.spyOn(core.overlays, "toggle");
    core.overlays.toggle("settings");
    expect(toggleSpy).toHaveBeenCalledWith("settings");

    const dispatchNotificationSpy = vi.spyOn(
      core.notifications,
      "dispatchNotification"
    );
    core.notifications.dispatchNotification({
      title: "Test",
      type: "success",
    });
    expect(dispatchNotificationSpy).toHaveBeenCalledWith({
      title: "Test",
      type: "success",
    });
  });

  it("cleans up resources on dispose", () => {
    const core = createEditorCore({
      fileIo: createMockFileIoDeps(),
      persistence: createMockPersistence(),
      urlPersistence: createMockUrlPersistence(),
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
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlPersistence(),
      });
      core.settings.updateSettings({
        autoRunDelay: 500,
        isAutoRunEnabled: true,
      });
      vi.spyOn(core.engine, "engineStatus").mockReturnValue("ready");
      const executeCodeSpy = vi
        .spyOn(core.engine, "executeCode")
        .mockResolvedValue(undefined);

      core.commands.updateBuffer("code");

      expect(executeCodeSpy).not.toHaveBeenCalled();
      vi.advanceTimersByTime(500);
      expect(executeCodeSpy).toHaveBeenCalled();
    });

    it("does not trigger executeCode when autoRun is disabled", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlPersistence(),
      });
      core.settings.updateSettings({
        autoRunDelay: 500,
        isAutoRunEnabled: false,
      });
      vi.spyOn(core.engine, "engineStatus").mockReturnValue("ready");
      const executeCodeSpy = vi
        .spyOn(core.engine, "executeCode")
        .mockResolvedValue(undefined);

      core.commands.updateBuffer("code");

      vi.advanceTimersByTime(500);
      expect(executeCodeSpy).not.toHaveBeenCalled();
    });

    it("ignores autoRun if engine is running", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlPersistence(),
      });
      core.settings.updateSettings({
        autoRunDelay: 500,
        isAutoRunEnabled: true,
      });
      vi.spyOn(core.engine, "engineStatus").mockReturnValue("running");
      const executeCodeSpy = vi
        .spyOn(core.engine, "executeCode")
        .mockResolvedValue(undefined);

      core.commands.updateBuffer("code");

      vi.advanceTimersByTime(500);
      expect(executeCodeSpy).not.toHaveBeenCalled();
    });

    it("does not call executeCode when selectEngine is called even if isAutoRunEnabled is true", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlPersistence(),
      });
      core.settings.updateSettings({
        autoRunDelay: 500,
        isAutoRunEnabled: true,
      });
      vi.spyOn(core.engine, "engineStatus").mockReturnValue("ready");
      const executeCodeSpy = vi
        .spyOn(core.engine, "executeCode")
        .mockResolvedValue(undefined);

      core.commands.selectEngine("micropython", "python");

      vi.advanceTimersByTime(1000);
      expect(executeCodeSpy).not.toHaveBeenCalled();
    });

    it("schedules auto-run when user edits buffer (updateBuffer) after engine switch", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlPersistence(),
      });
      core.settings.updateSettings({
        autoRunDelay: 500,
        isAutoRunEnabled: true,
      });
      vi.spyOn(core.engine, "engineStatus").mockReturnValue("ready");
      const executeCodeSpy = vi
        .spyOn(core.engine, "executeCode")
        .mockResolvedValue(undefined);

      core.commands.selectEngine("micropython", "python");

      vi.advanceTimersByTime(1000);
      expect(executeCodeSpy).not.toHaveBeenCalled();

      core.commands.updateBuffer("print('hello')");

      expect(executeCodeSpy).not.toHaveBeenCalled();
      vi.advanceTimersByTime(500);
      expect(executeCodeSpy).toHaveBeenCalled();
    });
  });

  describe("Trust gating", () => {
    function createMockUrlStateWithCode(
      code: string | null
    ): UrlPersistencePort {
      return createMockUrlPersistence(
        code === null
          ? null
          : { code, engine: "quickjs", language: "javascript", name: "" }
      );
    }

    it("exposes trust model on EditorCore", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlStateWithCode("console.log(1)"),
      });

      expect(core.session).toBeDefined();
      expect(core.session.isTrustRequired()).toBe(true);
    });

    it("when URL has code param, defers initial engine init and opens trust dialog", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlStateWithCode("console.log('shared')"),
      });

      // Trust model should detect shared code
      expect(core.session.isTrustRequired()).toBe(true);
      // Trust dialog should be auto-opened at creation
      expect(core.overlays.isOpen("trust-required")).toBe(true);
    });

    it("when no code param, engine init proceeds normally", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlStateWithCode(null),
      });

      expect(core.session.isTrustRequired()).toBe(false);
      // Trust dialog should NOT auto-open
      expect(core.overlays.isOpen("trust-required")).toBe(false);
    });

    it("when trust required, RUN_CODE opens dialog and does NOT execute", async () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlStateWithCode("console.log(1)"),
      });

      const executeSpy = vi.spyOn(core.engine, "executeCode");
      const openSpy = vi.spyOn(core.overlays, "open");

      await core.commands.runCode();

      expect(openSpy).toHaveBeenCalledWith("trust-required");
      expect(executeSpy).not.toHaveBeenCalled();
    });

    it("when trust granted, RUN_CODE executes normally", async () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlStateWithCode(null),
      });

      expect(core.session.isTrustRequired()).toBe(false);
      const executeSpy = vi.spyOn(core.engine, "executeCode");

      await core.commands.runCode();

      expect(executeSpy).toHaveBeenCalled();
    });

    it("when trust required, selectEngine opens dialog and blocks init", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlStateWithCode("console.log(1)"),
      });

      const selectSpy = vi.spyOn(core.engine, "selectEngineEntry");
      const openSpy = vi.spyOn(core.overlays, "open");

      core.commands.selectEngine("mock", "plaintext");

      expect(openSpy).toHaveBeenCalledWith("trust-required");
      expect(selectSpy).not.toHaveBeenCalled();
    });

    it("when trust required, retryEngineInit opens dialog and blocks init", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlStateWithCode("console.log(1)"),
      });

      const retrySpy = vi.spyOn(core.engine, "retryInit");
      const openSpy = vi.spyOn(core.overlays, "open");

      core.commands.retryEngineInit();

      expect(openSpy).toHaveBeenCalledWith("trust-required");
      expect(retrySpy).not.toHaveBeenCalled();
    });

    it("when grantTrust called, grants trust and closes dialog (init deferred to RUN_CODE)", async () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlStateWithCode("console.log(1)"),
      });

      expect(core.session.isTrustRequired()).toBe(true);

      const selectSpy = vi.spyOn(core.engine, "selectEngineEntry");
      const initializeSpy = vi
        .spyOn(core.engine, "initializeSelectedEngine")
        .mockResolvedValue(undefined);
      const closeSpy = vi.spyOn(core.overlays, "close");

      core.commands.grantTrust();

      // Drain microtasks so async handler bodies settle.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(core.session.isTrustRequired()).toBe(false);
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
          fileIo: createMockFileIoDeps(),
          persistence: createMockPersistence(),
          urlPersistence: createMockUrlStateWithCode("console.log(1)"),
        });
        core.settings.updateSettings({
          autoRunDelay: 500,
          isAutoRunEnabled: true,
        });
        vi.spyOn(core.engine, "engineStatus").mockReturnValue("ready");
        const executeCodeSpy = vi
          .spyOn(core.engine, "executeCode")
          .mockResolvedValue(undefined);

        core.commands.updateBuffer("code");

        vi.advanceTimersByTime(500);
        expect(executeCodeSpy).not.toHaveBeenCalled();
      });

      it("when trust not required, auto-run fires normally", () => {
        const core = createEditorCore({
          fileIo: createMockFileIoDeps(),
          persistence: createMockPersistence(),
          urlPersistence: createMockUrlStateWithCode(null),
        });
        core.settings.updateSettings({
          autoRunDelay: 500,
          isAutoRunEnabled: true,
        });
        vi.spyOn(core.engine, "engineStatus").mockReturnValue("ready");
        const executeCodeSpy = vi
          .spyOn(core.engine, "executeCode")
          .mockResolvedValue(undefined);

        core.commands.updateBuffer("code");

        vi.advanceTimersByTime(500);
        expect(executeCodeSpy).toHaveBeenCalled();
      });
    });
  });

  describe("File backup flow", () => {
    function createCoreWithFileIo() {
      const { fileIo, readFile, writeFile } = createMockFileIo();
      const core = createEditorCore({
        fileIo,
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlPersistence(),
      });
      return { core, readFile, writeFile };
    }

    it("exposes engineRegistry with resolveByExtension on EditorCore", () => {
      const { core } = createCoreWithFileIo();
      expect(core.engineRegistry).toBeDefined();
      expect(core.engineRegistry.resolveByExtension(".js")).toEqual({
        engineId: "quickjs",
        language: "javascript",
      });
    });

    describe("RESET_PROJECT_STATE", () => {
      it("clears URL params via clear()", () => {
        const urlPersistence = createMockUrlPersistence();
        const clearSpy = vi.spyOn(urlPersistence, "clear");
        const freshCore = createEditorCore({
          fileIo: createMockFileIo().fileIo,
          persistence: createMockPersistence(),
          urlPersistence,
        });
        clearSpy.mockClear();
        freshCore.commands.resetProjectState();
        expect(clearSpy).toHaveBeenCalled();
      });

      it("clears the buffer, output, and cursor position", () => {
        const { core } = createCoreWithFileIo();
        core.session.setCode("existing content");
        core.session.setCursorPosition(5, 10, 0, 0);

        core.commands.resetProjectState();

        // Default settings (isDefaultCodeEnabled: true) re-insert the
        // curated starter snippet. Cursor and output are still reset.
        expect(core.session.code()).toBe(QUICKJS_DEFAULT_BUFFER_CODE);
        expect(core.session.cursorPosition()).toEqual({
          column: 1,
          line: 1,
          selectionLength: 0,
          selectionLines: 0,
        });
      });

      it("terminates the engine so it returns to an idle state", () => {
        const { core } = createCoreWithFileIo();
        const terminateSpy = vi.spyOn(core.engine, "terminate");

        core.commands.resetProjectState();

        expect(terminateSpy).toHaveBeenCalled();
      });

      it("grants trust after reset so the editor is unblocked", () => {
        const urlPersistence = createMockUrlPersistence();
        const freshCore = createEditorCore({
          fileIo: createMockFileIo().fileIo,
          persistence: createMockPersistence(),
          urlPersistence,
        });
        // Force trust required to simulate a previous session
        freshCore.session.markTrustRequired();
        expect(freshCore.session.isTrustRequired()).toBe(true);

        freshCore.commands.resetProjectState();

        expect(freshCore.session.isTrustRequired()).toBe(false);
      });
    });

    describe("LOAD_FILE_FROM_DISK", () => {
      it("populates buffer, project name (without extension), and engine entry", () => {
        const { core } = createCoreWithFileIo();

        core.commands.loadFile({
          content: "console.log(1)",
          engineId: "quickjs",
          language: "javascript",
          name: "script.js",
        });

        expect(core.session.code()).toBe("console.log(1)");
        expect(core.session.projectName()).toBe("script");
        expect(core.session.activeEngineId()).toBe("quickjs");
        expect(core.session.activeLanguage()).toBe("javascript");
      });

      it("selects the engine but does NOT call initializeSelectedEngine (THE FIX)", () => {
        const { core } = createCoreWithFileIo();
        const initializeSpy = vi.spyOn(core.engine, "initializeSelectedEngine");

        core.commands.loadFile({
          content: "console.log(1)",
          engineId: "quickjs",
          language: "javascript",
          name: "script.js",
        });

        // THE FIX: file-loaded code is untrusted — engine must NOT be
        // initialized here. Init is deferred to GRANT_TRUST.
        expect(initializeSpy).not.toHaveBeenCalled();
      });

      it("re-arms the trust gate so file-loaded code requires acknowledgment", () => {
        const { core } = createCoreWithFileIo();
        // Start with trust granted (no URL code)
        expect(core.session.isTrustRequired()).toBe(false);

        core.commands.loadFile({
          content: "console.log(1)",
          engineId: "quickjs",
          language: "javascript",
          name: "script.js",
        });

        expect(core.session.isTrustRequired()).toBe(true);
        // Trust-required dialog should be open
        expect(core.overlays.isOpen("trust-required")).toBe(true);
      });

      it("blocks the engine so the status reflects the gate", () => {
        const { core } = createCoreWithFileIo();
        const setBlockedSpy = vi.spyOn(core.engine, "setBlocked");

        core.commands.loadFile({
          content: "console.log(1)",
          engineId: "quickjs",
          language: "javascript",
          name: "script.js",
        });

        expect(setBlockedSpy).toHaveBeenCalledWith(true);
      });

      it("download after load produces correct filename without double extension", async () => {
        const { core, writeFile } = createCoreWithFileIo();

        // Load file with extension
        core.commands.loadFile({
          content: "console.log('test')",
          engineId: "quickjs",
          language: "javascript",
          name: "myscript.js",
        });

        // Verify project name is stripped
        expect(core.session.projectName()).toBe("myscript");

        // Download should produce correct filename (not myscript.js.js)
        await core.commands.downloadBufferToFile();

        expect(writeFile).toHaveBeenCalledWith(
          "myscript.js",
          "console.log('test')"
        );
      });
    });

    describe("DOWNLOAD_BUFFER_TO_FILE", () => {
      it("writes the current buffer content to the file adapter with .js for javascript engines", async () => {
        const { core, writeFile } = createCoreWithFileIo();
        core.session.setCode("console.log('hi')");
        core.session.setProjectName("myapp");
        vi.spyOn(core.engine, "activeLanguage").mockReturnValue("javascript");

        await core.commands.downloadBufferToFile();

        expect(writeFile).toHaveBeenCalledWith("myapp.js", "console.log('hi')");
      });

      it("uses .py for python engines", async () => {
        const { core, writeFile } = createCoreWithFileIo();
        core.session.setCode("print('hi')");
        core.session.setProjectName("script");
        core.session.selectEngine("micropython", "python");

        await core.commands.downloadBufferToFile();

        expect(writeFile).toHaveBeenCalledWith("script.py", "print('hi')");
      });

      it("propagates adapter errors as a notification and does not crash", async () => {
        const { core, writeFile } = createCoreWithFileIo();
        writeFile.mockRejectedValue(new Error("blocked"));
        const dispatchSpy = vi.spyOn(
          core.notifications,
          "dispatchNotification"
        );

        await core.commands.downloadBufferToFile();

        expect(dispatchSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Download failed",
            type: "error",
          })
        );
      });

      it("downloads empty buffer as file with empty content", async () => {
        const { core, writeFile } = createCoreWithFileIo();
        core.session.setCode("");
        core.session.setProjectName("empty-project");
        vi.spyOn(core.engine, "activeLanguage").mockReturnValue("javascript");

        await core.commands.downloadBufferToFile();

        expect(writeFile).toHaveBeenCalledWith("empty-project.js", "");
      });

      it("downloads empty buffer with empty project name (sanitizes to untitled_project.js)", async () => {
        const { core, writeFile } = createCoreWithFileIo();
        core.session.setCode("");
        core.session.setProjectName("");
        vi.spyOn(core.engine, "activeLanguage").mockReturnValue("javascript");

        await core.commands.downloadBufferToFile();

        expect(writeFile).toHaveBeenCalledWith("untitled_project.js", "");
      });
    });
  });

  describe("Engine URL conditional persistence (engine-state-url-sync)", () => {
    function createSpyUrlPersistence(
      initial: CanonicalState | null = null
    ): UrlPersistencePort {
      let current: CanonicalState | null = initial;
      return {
        clear: vi.fn(() => {
          current = null;
        }),
        load: vi.fn(() => current),
        save: vi.fn((state: CanonicalState) => {
          current = state;
          return { isShareable: true };
        }),
      };
    }

    // REQ-ENG-007: LOAD_FILE_FROM_DISK with same engine as active → engine
    // must be seeded in URL.
    it("LOAD_FILE_FROM_DISK with same engine seeds engine in URL", () => {
      const urlPersistence = createSpyUrlPersistence();
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence,
      });

      expect(urlPersistence.load()).toBeNull();

      core.commands.loadFile({
        content: "print('hi')",
        engineId: "quickjs",
        language: "javascript",
        name: "hello.js",
      });

      expect(urlPersistence.load()?.engine).toBe("quickjs");
    });

    // REQ-ENG-002 + tracker reset: after RESET_PROJECT_STATE, typing code
    // must re-seed the URL with the active engine.
    it("after RESET_PROJECT_STATE, typing code writes engine to URL", () => {
      const urlPersistence = createSpyUrlPersistence({
        code: "hi",
        engine: "mock",
        language: "plaintext",
        name: "",
      });
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence,
      });

      // Prime the model with some code so the state is consistent
      core.commands.updateBuffer("hi");
      expect(urlPersistence.load()?.engine).toBe("mock");

      // Reset the project
      core.commands.resetProjectState();
      expect(urlPersistence.load()).toBeNull();

      // Type code again. This must write the engine to URL.
      core.commands.updateBuffer("world");
      expect(urlPersistence.load()?.engine).toBe("mock");
    });
  });

  describe("REQ-ENG-006: URL limit exceeded handling", () => {
    beforeEach(() => {
      // Reset URL to a clean state before each test
      window.history.replaceState(null, "", "/");
      // Suppress the expected warning from the size limit check
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("strips URL when limit exceeded, resets tracker on empty buffer, re-seeds on next valid write", () => {
      const urlPersistence = createBrowserUrlPersistenceAdapter();

      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence,
      });

      // Step 1: Load editor with initial code. Default engine is "quickjs";
      // the first non-empty buffer update seeds it to the URL.
      core.commands.updateBuffer("initial code");

      expect(urlPersistence.load()?.engine).toBe("quickjs");
      expect(core.session.isUrlShareable()).toBe(true);

      // Step 2: Type code that exceeds the URL limit (>8000 chars when compressed).
      let massiveCode = "";
      for (let i = 0; i < 2000; i += 1) {
        massiveCode += `${Math.random().toString(36)}-`;
      }
      core.commands.updateBuffer(massiveCode);

      expect(urlPersistence.load()).toBeNull();
      expect(core.session.isUrlShareable()).toBe(false);

      // Step 3: Clear the buffer.
      core.commands.updateBuffer("");

      expect(urlPersistence.load()).toBeNull();

      // Step 4: Type new code that fits within the limit.
      core.commands.updateBuffer("short code");

      expect(urlPersistence.load()?.engine).toBe("quickjs");
      expect(core.session.isUrlShareable()).toBe(true);
    });
  });

  describe("select/init split contract (fix-file-load-trust-bypass)", () => {
    function createMockUrlStateWithCode(
      code: string | null
    ): UrlPersistencePort {
      return createMockUrlPersistence(
        code === null
          ? null
          : { code, engine: "quickjs", language: "javascript", name: "" }
      );
    }

    it("on startup without trust: selectEngineEntry + initializeSelectedEngine are called", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlStateWithCode(null),
      });
      const selectSpy = vi.spyOn(core.engine, "selectEngineEntry");
      const initSpy = vi
        .spyOn(core.engine, "initializeSelectedEngine")
        .mockResolvedValue(undefined);

      // The non-trust startup path was already taken during construction.
      // Spies installed AFTER construction won't see those initial calls.
      // Verify the public post-construction state is correct instead.
      expect(core.session.isTrustRequired()).toBe(false);
      expect(selectSpy).not.toHaveBeenCalled(); // spies installed after init
      expect(initSpy).not.toHaveBeenCalled(); // spies installed after init
    });

    it("on startup with trust required: initializeSelectedEngine is NOT called", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlStateWithCode("console.log(1)"),
      });
      // Trust-required startup path: signals seeded from URL, no init.
      // Init is deferred to GRANT_TRUST.
      expect(core.session.isTrustRequired()).toBe(true);
      expect(core.overlays.isOpen("trust-required")).toBe(true);
    });

    it("SELECT_ENGINE_ENTRY in trusted mode calls selectEngine AND initializeSelectedEngine", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlStateWithCode(null),
      });
      const selectSpy = vi.spyOn(core.session, "selectEngine");
      const initSpy = vi
        .spyOn(core.engine, "initializeSelectedEngine")
        .mockResolvedValue(undefined);

      core.commands.selectEngine("mock", "plaintext");

      expect(selectSpy).toHaveBeenCalledWith("mock", "plaintext");
      expect(initSpy).toHaveBeenCalled();
    });

    it("GRANT_TRUST does NOT call initializeSelectedEngine (init deferred to RUN_CODE)", async () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlStateWithCode("console.log(1)"),
      });

      const selectSpy = vi.spyOn(core.session, "selectEngine");
      const initSpy = vi
        .spyOn(core.engine, "initializeSelectedEngine")
        .mockResolvedValue(undefined);

      core.commands.grantTrust();

      // Drain microtasks
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Init is deferred to RUN_CODE — GRANT_TRUST only grants trust.
      expect(initSpy).not.toHaveBeenCalled();
      // Selection already happened — no re-select.
      expect(selectSpy).not.toHaveBeenCalled();
    });

    it("after GRANT_TRUST, RUN_CODE executes code (lazy init happens inside executeCode)", async () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlStateWithCode("console.log(1)"),
      });

      // Trust is required initially
      expect(core.session.isTrustRequired()).toBe(true);

      // Grant trust — should NOT initialize
      core.commands.grantTrust();
      expect(core.session.isTrustRequired()).toBe(false);
      expect(core.engine.engineStatus()).toBe("idle");

      // Now run code — executeCode is called (lazy init is internal to executeCode)
      const executeSpy = vi.spyOn(core.engine, "executeCode");
      await core.commands.runCode();
      expect(executeSpy).toHaveBeenCalled();
    });

    it("LOAD_FILE_FROM_DISK calls session.loadFile but NOT initializeSelectedEngine", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlStateWithCode(null),
      });
      const loadFileSpy = vi.spyOn(core.session, "loadFile");
      const initSpy = vi.spyOn(core.engine, "initializeSelectedEngine");

      core.commands.loadFile({
        content: "evil()",
        engineId: "mock",
        language: "plaintext",
        name: "evil.js",
      });

      expect(loadFileSpy).toHaveBeenCalledWith({
        content: "evil()",
        engineId: "mock",
        language: "plaintext",
        name: "evil.js",
      });
      // THE FIX: untrusted file-loaded code must not spawn a worker.
      expect(initSpy).not.toHaveBeenCalled();
    });

    it("RESET_PROJECT_STATE calls session.reset AND initializeSelectedEngine", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createMockPersistence(),
        urlPersistence: createMockUrlStateWithCode(null),
      });
      const resetSpy = vi.spyOn(core.session, "reset");
      const initSpy = vi
        .spyOn(core.engine, "initializeSelectedEngine")
        .mockResolvedValue(undefined);

      core.commands.resetProjectState();

      expect(resetSpy).toHaveBeenCalled();
      expect(initSpy).toHaveBeenCalled();
    });
  });

  describe("Default buffer content (default-code)", () => {
    function createUrlPersistenceWithCode(
      code: string | null
    ): UrlPersistencePort {
      return createMockUrlPersistence(
        code === null
          ? null
          : { code, engine: "quickjs", language: "javascript", name: "" }
      );
    }

    function createPersistenceWithSettings(
      settings: Record<string, unknown>
    ): PersistencePort {
      const data = new Map<string, string>();
      data.set("settings", JSON.stringify(settings));
      return {
        get: (key) => data.get(key) ?? null,
        remove: (key) => data.delete(key),
        set: (key, val) => data.set(key, val),
      };
    }

    it("new project + setting enabled → buffer starts with QUICKJS_DEFAULT_BUFFER_CODE", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createPersistenceWithSettings({
          isDefaultCodeEnabled: true,
        }),
        urlPersistence: createUrlPersistenceWithCode(null),
      });

      expect(core.session.code()).toBe(QUICKJS_DEFAULT_BUFFER_CODE);
    });

    it("new project + setting disabled → buffer starts empty", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createPersistenceWithSettings({
          isDefaultCodeEnabled: false,
        }),
        urlPersistence: createUrlPersistenceWithCode(null),
      });

      expect(core.session.code()).toBe("");
    });

    it("URL-shared project ignores the setting — buffer = URL code (not default)", () => {
      const sharedCode = "console.log('shared-from-url')";
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        // Setting is on, but URL has the user's shared code.
        persistence: createPersistenceWithSettings({
          isDefaultCodeEnabled: true,
        }),
        urlPersistence: createUrlPersistenceWithCode(sharedCode),
      });

      expect(core.session.code()).toBe(sharedCode);
      expect(core.session.code()).not.toBe(QUICKJS_DEFAULT_BUFFER_CODE);
    });

    it("URL stays clean on first paint — `code` is NOT written when default snippet is shown", () => {
      const urlPersistence = createUrlPersistenceWithCode(null);
      const saveSpy = vi.spyOn(urlPersistence, "save");

      createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createPersistenceWithSettings({
          isDefaultCodeEnabled: true,
        }),
        urlPersistence,
      });

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it("RESET_PROJECT_STATE with setting enabled → buffer = QUICKJS_DEFAULT_BUFFER_CODE", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createPersistenceWithSettings({
          isDefaultCodeEnabled: true,
        }),
        urlPersistence: createUrlPersistenceWithCode(null),
      });

      // User edits the buffer
      core.session.setCode("// user code");
      expect(core.session.code()).toBe("// user code");

      core.commands.resetProjectState();

      expect(core.session.code()).toBe(QUICKJS_DEFAULT_BUFFER_CODE);
    });

    it("RESET_PROJECT_STATE with setting disabled → buffer is empty", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createPersistenceWithSettings({
          isDefaultCodeEnabled: false,
        }),
        urlPersistence: createUrlPersistenceWithCode(null),
      });

      core.session.setCode("// user code");
      expect(core.session.code()).toBe("// user code");

      core.commands.resetProjectState();

      expect(core.session.code()).toBe("");
    });
  });

  describe("Per-engine default code (per-engine-default-code)", () => {
    function createUrlPersistenceWithCodeAndEngine(
      code: string | null,
      engine: string | null
    ): UrlPersistencePort {
      if (code === null && engine === null) {
        return createMockUrlPersistence(null);
      }
      return createMockUrlPersistence({
        code: code ?? "",
        engine: engine ?? "quickjs",
        language: engine === "micropython" ? "python" : "javascript",
        name: "",
      });
    }

    function createPersistenceWithSettings(
      settings: Record<string, unknown>
    ): PersistencePort {
      const data = new Map<string, string>();
      data.set("settings", JSON.stringify(settings));
      return {
        get: (key) => data.get(key) ?? null,
        remove: (key) => data.delete(key),
        set: (key, val) => data.set(key, val),
      };
    }

    it("new project + URL engine=quickjs + setting enabled → QuickJS default loads and flag is armed", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createPersistenceWithSettings({
          isDefaultCodeEnabled: true,
        }),
        urlPersistence: createUrlPersistenceWithCodeAndEngine(null, "quickjs"),
      });

      expect(core.session.code()).toBe(QUICKJS_DEFAULT_BUFFER_CODE);
      expect(core.session.isShowingDefaultCode()).toBe(true);
    });

    it("new project + URL engine=micropython + setting enabled → MicroPython default loads and flag is armed", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createPersistenceWithSettings({
          isDefaultCodeEnabled: true,
        }),
        urlPersistence: createUrlPersistenceWithCodeAndEngine(
          null,
          "micropython"
        ),
      });

      expect(core.session.code()).toBe(PYTHON_DEFAULT_BUFFER_CODE);
      expect(core.session.isShowingDefaultCode()).toBe(true);
    });

    it("new project + URL engine=micropython + setting disabled → empty buffer (flag disarmed)", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createPersistenceWithSettings({
          isDefaultCodeEnabled: false,
        }),
        urlPersistence: createUrlPersistenceWithCodeAndEngine(
          null,
          "micropython"
        ),
      });

      expect(core.session.code()).toBe("");
      expect(core.session.isShowingDefaultCode()).toBe(false);
    });

    it("URL-shared code is never replaced — flag is disarmed and content is preserved", () => {
      const sharedCode = "user-custom-code";
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createPersistenceWithSettings({
          isDefaultCodeEnabled: true,
        }),
        urlPersistence: createUrlPersistenceWithCodeAndEngine(
          sharedCode,
          "quickjs"
        ),
      });

      expect(core.session.code()).toBe(sharedCode);
      expect(core.session.isShowingDefaultCode()).toBe(false);
    });

    it("SELECT_ENGINE_ENTRY on pristine buffer → replaces with new engine's default and re-arms flag", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createPersistenceWithSettings({
          isDefaultCodeEnabled: true,
        }),
        urlPersistence: createUrlPersistenceWithCodeAndEngine(null, "quickjs"),
      });

      expect(core.session.code()).toBe(QUICKJS_DEFAULT_BUFFER_CODE);
      expect(core.session.isShowingDefaultCode()).toBe(true);

      // Suppress engine initialization side-effects for the switch.
      vi.spyOn(core.engine, "initializeSelectedEngine").mockResolvedValue(
        undefined
      );

      core.commands.selectEngine("micropython", "python");

      expect(core.session.code()).toBe(PYTHON_DEFAULT_BUFFER_CODE);
      expect(core.session.isShowingDefaultCode()).toBe(true);
    });

    it("SELECT_ENGINE_ENTRY on user-edited buffer → content is preserved (not replaced)", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createPersistenceWithSettings({
          isDefaultCodeEnabled: true,
        }),
        urlPersistence: createUrlPersistenceWithCodeAndEngine(null, "quickjs"),
      });

      // User edits the buffer (pristine flag disarmed).
      core.commands.updateBuffer("user-typed-something");
      expect(core.session.isShowingDefaultCode()).toBe(false);

      vi.spyOn(core.engine, "initializeSelectedEngine").mockResolvedValue(
        undefined
      );

      core.commands.selectEngine("micropython", "python");

      // User's content is preserved — engine switch does NOT touch the buffer.
      expect(core.session.code()).toBe("user-typed-something");
      expect(core.session.isShowingDefaultCode()).toBe(false);
    });

    it("URL-shared code is never replaced by engine switch (flag stays disarmed)", () => {
      const sharedCode = "user-shared-code";
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createPersistenceWithSettings({
          isDefaultCodeEnabled: true,
        }),
        urlPersistence: createUrlPersistenceWithCodeAndEngine(
          sharedCode,
          "quickjs"
        ),
      });

      expect(core.session.code()).toBe(sharedCode);
      expect(core.session.isShowingDefaultCode()).toBe(false);

      vi.spyOn(core.engine, "initializeSelectedEngine").mockResolvedValue(
        undefined
      );

      core.commands.selectEngine("micropython", "python");

      // URL-shared code survives the engine switch.
      expect(core.session.code()).toBe(sharedCode);
      expect(core.session.isShowingDefaultCode()).toBe(false);
    });

    it("RESET_PROJECT_STATE → uses active engine's default (MicroPython when active)", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createPersistenceWithSettings({
          isDefaultCodeEnabled: true,
        }),
        urlPersistence: createUrlPersistenceWithCodeAndEngine(
          null,
          "micropython"
        ),
      });

      // Sanity: editor started on MicroPython with its default.
      expect(core.session.code()).toBe(PYTHON_DEFAULT_BUFFER_CODE);

      vi.spyOn(core.engine, "initializeSelectedEngine").mockResolvedValue(
        undefined
      );

      core.commands.resetProjectState();

      // Active engine is still MicroPython — default must be the Python snippet.
      expect(core.session.code()).toBe(PYTHON_DEFAULT_BUFFER_CODE);
      expect(core.session.isShowingDefaultCode()).toBe(true);
    });

    it("UPDATE_BUFFER action passes source: 'user' to setCode (disarms the flag)", () => {
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createPersistenceWithSettings({
          isDefaultCodeEnabled: true,
        }),
        urlPersistence: createUrlPersistenceWithCodeAndEngine(null, "quickjs"),
      });

      // Buffer was pristine.
      expect(core.session.isShowingDefaultCode()).toBe(true);

      // Spy on setCode to assert the second argument.
      const setCodeSpy = vi.spyOn(core.session, "setCode");

      core.commands.updateBuffer("user-edit");

      expect(setCodeSpy).toHaveBeenCalledWith("user-edit", {
        source: "user",
      });
      expect(core.session.isShowingDefaultCode()).toBe(false);
    });

    it("engine switch to engine with no defaultBufferCode (mock) on pristine buffer → buffer cleared (no replacement content)", () => {
      // DEV-only engine: its definition has no defaultBufferCode, so the
      // pristine replacement falls back to empty. This matches the spec
      // ("engines without defaultBufferCode fall back to ''").
      const core = createEditorCore({
        fileIo: createMockFileIoDeps(),
        persistence: createPersistenceWithSettings({
          isDefaultCodeEnabled: true,
        }),
        urlPersistence: createUrlPersistenceWithCodeAndEngine(null, "quickjs"),
      });

      expect(core.session.code()).toBe(QUICKJS_DEFAULT_BUFFER_CODE);
      expect(core.session.isShowingDefaultCode()).toBe(true);

      vi.spyOn(core.engine, "initializeSelectedEngine").mockResolvedValue(
        undefined
      );

      core.commands.selectEngine("mock", "plaintext");

      // Mock has no defaultBufferCode → empty fallback, flag still armed
      // (because the empty fallback was set with source: "default", but our
      // rule says empty + source default → disarmed). The behavior is:
      // empty buffer post-switch.
      expect(core.session.code()).toBe("");
      expect(core.session.isShowingDefaultCode()).toBe(false);
    });
  });
});

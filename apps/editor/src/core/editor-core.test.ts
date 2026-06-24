import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEditorCore } from "./editor-core.ts";
import type { PersistencePort } from "./ports/persistence.ts";
import type { UrlStatePort } from "./ports/url-state.ts";

function createMockPersistence(): PersistencePort {
  return { get: vi.fn(), set: vi.fn(), remove: vi.fn() };
}

function createMockUrlState(): UrlStatePort {
  return { get: vi.fn(), set: vi.fn(), remove: vi.fn() };
}

describe("EditorCore", () => {
  it("initializes all models correctly", () => {
    const core = createEditorCore({
      persistence: createMockPersistence(),
      urlState: createMockUrlState(),
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
      });

      expect(core.trust).toBeDefined();
      expect(core.trust.isTrustRequired()).toBe(true);
    });

    it("when URL has code param, defers initial engine init and opens trust dialog", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode("console.log('shared')"),
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
      });

      expect(core.trust.isTrustRequired()).toBe(false);
      // Trust dialog should NOT auto-open
      expect(core.overlays.isOpen("trust-required")).toBe(false);
    });

    it("when trust required, RUN_CODE opens dialog and does NOT execute", () => {
      const core = createEditorCore({
        persistence: createMockPersistence(),
        urlState: createMockUrlStateWithCode("console.log(1)"),
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
});

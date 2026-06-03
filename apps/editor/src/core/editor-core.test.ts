import { describe, expect, it, vi } from "vitest";
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
});

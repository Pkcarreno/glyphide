import { describe, expect, it, vi } from "vitest";
import { createEditorCore } from "./editor-core";
import type { PersistencePort } from "./ports/persistence";
import type { UrlStatePort } from "./ports/url-state";

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

    const selectEngineSpy = vi.spyOn(core.engine, "selectEngine");
    core.dispatcher.dispatch({ type: "SELECT_ENGINE", engineId: "mock" });
    expect(selectEngineSpy).toHaveBeenCalledWith("mock");

    const onBufferUpdatedSpy = vi.spyOn(core.engine, "onBufferUpdated");
    core.dispatcher.dispatch({ type: "UPDATE_BUFFER", content: "const a = 1;" });
    expect(onBufferUpdatedSpy).toHaveBeenCalledWith("const a = 1;");
  });

  it("cleans up resources on dispose", () => {
    const core = createEditorCore({
      persistence: createMockPersistence(),
      urlState: createMockUrlState(),
    });

    const terminateSpy = vi.spyOn(core.engine, "terminate");
    core.dispose();

    expect(terminateSpy).toHaveBeenCalled();
  });
});

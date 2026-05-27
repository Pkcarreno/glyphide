import { describe, expect, it, vi } from "vitest";
import { createActionDispatcher } from "./dispatcher";

describe("ActionDispatcher", () => {
  it("routes actions to registered handlers", () => {
    const dispatcher = createActionDispatcher();
    const handler = vi.fn();

    dispatcher.on("RUN_CODE", handler);
    dispatcher.dispatch({ type: "RUN_CODE" });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ type: "RUN_CODE" });
  });

  it("does not call handlers of other types", () => {
    const dispatcher = createActionDispatcher();
    const handler = vi.fn();

    dispatcher.on("RUN_CODE", handler);
    dispatcher.dispatch({ type: "CLEAR_OUTPUT" });

    expect(handler).not.toHaveBeenCalled();
  });

  it("unsubscribes correctly", () => {
    const dispatcher = createActionDispatcher();
    const handler = vi.fn();

    const unsubscribe = dispatcher.on("RUN_CODE", handler);
    unsubscribe();
    dispatcher.dispatch({ type: "RUN_CODE" });

    expect(handler).not.toHaveBeenCalled();
  });
});

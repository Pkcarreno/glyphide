import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EngineSelectorCommand } from "./EngineSelectorCommand.tsx";

const dispatchMock = vi.fn();
const [mockIsOpen, setMockIsOpen] = createSignal(false);

vi.mock("../../core/engine/registry", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    getEngineEntries: () => [
      {
        engineId: "quickjs",
        language: "javascript",
        label: "QuickJS — JavaScript",
      },
      {
        engineId: "mock",
        language: "plaintext",
        label: "Mock Engine — Plaintext",
      },
    ],
  };
});

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    dispatcher: { dispatch: dispatchMock },
    overlays: {
      isOpen: (id: string) => id === "engine-selector" && mockIsOpen(),
    },
    engineRegistry: {},
  }),
}));

describe("EngineSelectorCommand", () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    setMockIsOpen(false);
  });

  afterEach(() => {
    cleanup();
  });

  it("when core.overlays is false, command menu is not in the DOM", () => {
    const { queryByRole } = render(() => <EngineSelectorCommand />);
    expect(queryByRole("dialog")).toBeNull();
  });

  it("renders dynamic entries from getEngineEntries", () => {
    setMockIsOpen(true);
    const { getByRole, getByText } = render(() => <EngineSelectorCommand />);
    expect(getByRole("dialog")).toBeTruthy();
    expect(getByText("QuickJS — JavaScript")).toBeTruthy();
    expect(getByText("Mock Engine — Plaintext")).toBeTruthy();
  });

  it("dispatches SELECT_ENGINE_ENTRY with correct language", () => {
    setMockIsOpen(true);
    const { getByText } = render(() => <EngineSelectorCommand />);

    fireEvent.click(getByText("Mock Engine — Plaintext"));

    expect(dispatchMock).toHaveBeenCalledWith({
      type: "SELECT_ENGINE_ENTRY",
      engineId: "mock",
      language: "plaintext",
    });
    expect(dispatchMock).toHaveBeenCalledWith({
      type: "CLOSE_OVERLAY",
      overlayId: "engine-selector",
    });
  });
});

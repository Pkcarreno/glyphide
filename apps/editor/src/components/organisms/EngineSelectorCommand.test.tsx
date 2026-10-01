import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EngineSelectorCommand } from "./EngineSelectorCommand.tsx";

const mockSelectEngine = vi.fn();
const mockCloseOverlay = vi.fn();
const mockOpenOverlay = vi.fn();
const [mockIsOpen, setMockIsOpen] = createSignal(false);

vi.mock("../../core/engine/registry", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    getEngineEntries: () => [
      {
        engineId: "quickjs",
        label: "QuickJS — JavaScript",
        language: "javascript",
      },
      {
        engineId: "mock",
        label: "Mock Engine — Plaintext",
        language: "plaintext",
      },
    ],
  };
});

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    commands: { selectEngine: mockSelectEngine },
    engineRegistry: {},
    overlays: {
      close: mockCloseOverlay,
      isOpen: (id: string) => id === "engine-selector" && mockIsOpen(),
      open: mockOpenOverlay,
    },
  }),
}));

describe("EngineSelectorCommand", () => {
  beforeEach(() => {
    mockSelectEngine.mockClear();
    mockCloseOverlay.mockClear();
    mockOpenOverlay.mockClear();
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

  it("calls commands.selectEngine with correct language and closes overlay", () => {
    setMockIsOpen(true);
    const { getByText } = render(() => <EngineSelectorCommand />);

    fireEvent.click(getByText("Mock Engine — Plaintext"));

    expect(mockSelectEngine).toHaveBeenCalledWith("mock", "plaintext");
    expect(mockCloseOverlay).toHaveBeenCalledWith("engine-selector");
  });
});

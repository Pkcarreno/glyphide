import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { SettingsModal } from "./SettingsModal";
import { createSignal } from "solid-js";
const updateSettingsMock = vi.fn();
const dispatchMock = vi.fn();

const [mockIsOpen, setMockIsOpen] = createSignal(false);

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    settings: {
      settings: {
        theme: "system",
        isWordWrapEnabled: false,
        isAutoRunEnabled: false,
        isClearOnRunEnabled: true
      },
      updateSettings: updateSettingsMock
    },
    dispatcher: { dispatch: dispatchMock },
    overlays: {
      isOpen: (id: string) => id === "settings" && mockIsOpen()
    }
  })
}));

describe("SettingsModal", () => {
  it("when core.overlays is false, modal is not in the DOM", () => {
    setMockIsOpen(false);
    const { queryByRole } = render(() => <SettingsModal />);
    expect(queryByRole("dialog")).toBeNull();
  });

  it("when core.overlays is true, modal is rendered with title", () => {
    setMockIsOpen(true);
    const { getByRole, getByText } = render(() => <SettingsModal />);
    expect(getByRole("dialog")).toBeTruthy();
    expect(getByText("Settings")).toBeTruthy();
  });

  it("when rendered, contains settings sections and switches", () => {
    setMockIsOpen(true);
    const { getAllByText, getAllByRole } = render(() => <SettingsModal />);
    expect(getAllByText("Appearance").length).toBeGreaterThan(0);
    expect(getAllByText("Execution").length).toBeGreaterThan(0);
    
    // 3 switches total (Word Wrap, Auto-run, Clear console)
    expect(getAllByRole("switch")).toHaveLength(3);
  });

  it("when close button clicked, fires dispatcher CLOSE_OVERLAY", () => {
    setMockIsOpen(true);
    dispatchMock.mockClear();
    const { getAllByRole } = render(() => <SettingsModal />);
    getAllByRole("button", { name: "Close settings" })[0].click();
    expect(dispatchMock).toHaveBeenCalledWith({ type: "CLOSE_OVERLAY", overlayId: "settings" });
  });

  it("when controlled via core state, opens and closes", () => {
    setMockIsOpen(false);
    const { queryByRole } = render(() => <SettingsModal />);
    
    expect(queryByRole("dialog")).toBeNull();
    setMockIsOpen(true);
    expect(queryByRole("dialog")).not.toBeNull();
  });
});

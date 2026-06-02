import { cleanup, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsModal } from "./SettingsModal.tsx";

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
        isClearOnRunEnabled: true,
      },
      updateSettings: updateSettingsMock,
    },
    dispatcher: { dispatch: dispatchMock },
    overlays: {
      isOpen: (id: string) => id === "settings" && mockIsOpen(),
    },
  }),
}));

describe("SettingsModal", () => {
  afterEach(() => {
    cleanup();
  });

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

  it("when rendered, displays the Appearance tab and its components by default", () => {
    setMockIsOpen(true);
    const { getAllByText, getByRole, queryByText } = render(() => (
      <SettingsModal />
    ));

    expect(getAllByText("Appearance").length).toBeGreaterThan(0);

    expect(getByRole("switch", { name: "Word Wrap" })).toBeTruthy();

    expect(getByRole("combobox")).toBeTruthy();

    expect(queryByText("Auto-run on type")).toBeNull();
  });

  it("changes tab when navigation buttons are clicked", () => {
    setMockIsOpen(true);
    const { getByRole, queryByText } = render(() => <SettingsModal />);

    const executionTab = getByRole("button", { name: "Execution" });
    executionTab.click();

    expect(getByRole("switch", { name: "Auto-run on type" })).toBeTruthy();
    expect(getByRole("switch", { name: "Clear console on run" })).toBeTruthy();

    expect(queryByText("Theme Preference")).toBeNull();
  });

  it("when close button clicked, fires dispatcher CLOSE_OVERLAY", () => {
    setMockIsOpen(true);
    dispatchMock.mockClear();
    const { getAllByRole } = render(() => <SettingsModal />);
    getAllByRole("button", { name: "Close settings" })[0].click();
    expect(dispatchMock).toHaveBeenCalledWith({
      type: "CLOSE_OVERLAY",
      overlayId: "settings",
    });
  });

  it("when controlled via core state, opens and closes", () => {
    setMockIsOpen(false);
    const { queryByRole } = render(() => <SettingsModal />);

    expect(queryByRole("dialog")).toBeNull();
    setMockIsOpen(true);
    expect(queryByRole("dialog")).not.toBeNull();
  });
});

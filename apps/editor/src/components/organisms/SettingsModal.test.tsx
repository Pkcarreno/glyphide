import { cleanup, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsModal } from "./SettingsModal.tsx";

const updateSettingsMock = vi.fn();
const resetSettingMock = vi.fn();
const dispatchMock = vi.fn();

const [mockIsOpen, setMockIsOpen] = createSignal(false);
const [mockSettings, setMockSettings] = createSignal({
  autoRunDelay: 750,
  bufferFontSize: 15,
  bufferLineHeight: 1.3,
  isAutoRunEnabled: false,
  isClearOnRunEnabled: true,
  isDefaultCodeEnabled: true,
  isWordWrapEnabled: false,
  theme: "system",
  uiFontSize: 14,
});

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    dispatcher: { dispatch: dispatchMock },
    overlays: {
      isOpen: (id: string) => id === "settings" && mockIsOpen(),
    },
    settings: {
      resetSetting: resetSettingMock,
      get settings() {
        return mockSettings();
      },
      updateSettings: updateSettingsMock,
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
    const { getAllByText, getByRole, getAllByRole } = render(() => (
      <SettingsModal />
    ));

    expect(getAllByText("Appearance").length).toBeGreaterThan(0);

    expect(getByRole("combobox")).toBeTruthy();

    // Only the Appearance panel is visible; Editor/Execution are hidden.
    const panels = getAllByRole("tabpanel", { hidden: true });
    const editorPanel = panels.find((p) =>
      p.textContent?.includes("Word Wrap")
    );
    const executionPanel = panels.find((p) =>
      p.textContent?.includes("Auto-run on type")
    );
    expect(editorPanel?.hasAttribute("hidden")).toBe(true);
    expect(executionPanel?.hasAttribute("hidden")).toBe(true);
  });

  it("changes tab to Editor when clicked", () => {
    setMockIsOpen(true);
    const { getByRole, getAllByRole } = render(() => <SettingsModal />);

    const editorTab = getByRole("tab", { name: "Editor" });
    editorTab.click();

    expect(getByRole("switch", { name: "Word Wrap" })).toBeTruthy();

    // Appearance panel must be hidden now; Editor panel must be visible
    const panels = getAllByRole("tabpanel", { hidden: true });
    const appearancePanel = panels.find((p) =>
      p.textContent?.includes("Theme Preference")
    );
    const editorPanel = panels.find((p) =>
      p.textContent?.includes("Word Wrap")
    );
    expect(appearancePanel?.hasAttribute("hidden")).toBe(true);
    expect(editorPanel?.hasAttribute("hidden")).toBe(false);
  });

  it("changes tab when navigation buttons are clicked", () => {
    setMockIsOpen(true);
    const { getByRole, getAllByRole } = render(() => <SettingsModal />);

    const executionTab = getByRole("tab", { name: "Execution" });
    executionTab.click();

    expect(getByRole("switch", { name: "Auto-run on type" })).toBeTruthy();
    expect(getByRole("switch", { name: "Clear console on run" })).toBeTruthy();
    expect(
      getByRole("spinbutton", { name: "Auto-run delay (ms)" })
    ).toBeTruthy();

    // Appearance panel must be hidden
    const panels = getAllByRole("tabpanel", { hidden: true });
    const appearancePanel = panels.find((p) =>
      p.textContent?.includes("Theme Preference")
    );
    expect(appearancePanel?.hasAttribute("hidden")).toBe(true);
  });

  it("when close button clicked, fires dispatcher CLOSE_OVERLAY", () => {
    setMockIsOpen(true);
    dispatchMock.mockClear();
    const { getByRole } = render(() => <SettingsModal />);
    getByRole("button", { name: "Close settings" }).click();
    expect(dispatchMock).toHaveBeenCalledWith({
      overlayId: "settings",
      type: "CLOSE_OVERLAY",
    });
  });

  it("when controlled via core state, opens and closes", () => {
    setMockIsOpen(false);
    const { queryByRole } = render(() => <SettingsModal />);

    expect(queryByRole("dialog")).toBeNull();
    setMockIsOpen(true);
    expect(queryByRole("dialog")).not.toBeNull();
  });

  it("when setting is modified, displays reset button and calls resetSetting on click", () => {
    setMockSettings((prev) => ({ ...prev, theme: "dark" as const }));
    setMockIsOpen(true);
    resetSettingMock.mockClear();

    const { getByRole } = render(() => <SettingsModal />);

    const resetButton = getByRole("button", {
      name: "Reset Theme Preference to default",
    });
    expect(resetButton).toBeTruthy();

    resetButton.click();
    expect(resetSettingMock).toHaveBeenCalledWith("theme");
  });

  it("renders a tablist with one tab per settings section", () => {
    setMockIsOpen(true);
    const { getAllByRole, getByRole } = render(() => <SettingsModal />);

    expect(getByRole("tablist")).toBeTruthy();
    expect(getAllByRole("tab")).toHaveLength(3);
  });

  it("renders one tabpanel per settings section (most hidden by default)", () => {
    setMockIsOpen(true);
    const { getAllByRole } = render(() => <SettingsModal />);

    // 3 panels mounted; only the active (Appearance) is visible to the role query.
    expect(getAllByRole("tabpanel", { hidden: true })).toHaveLength(3);
    expect(getAllByRole("tabpanel")).toHaveLength(1);
  });

  it("renders a single floating close button in the content area", () => {
    setMockIsOpen(true);
    const { getAllByRole } = render(() => <SettingsModal />);

    const closeButtons = getAllByRole("button", { name: "Close settings" });
    expect(closeButtons).toHaveLength(1);
    expect(closeButtons[0].classList.contains("absolute")).toBe(true);
    expect(closeButtons[0].classList.contains("top-3")).toBe(true);
    expect(closeButtons[0].classList.contains("right-3")).toBe(true);
    expect(closeButtons[0].classList.contains("z-10")).toBe(true);
  });

  it("Editor tab exposes a Default Code toggle that updates the setting", () => {
    setMockSettings((prev) => ({ ...prev, isDefaultCodeEnabled: true }));
    setMockIsOpen(true);
    updateSettingsMock.mockClear();

    const { getByRole } = render(() => <SettingsModal />);

    // Switch to Editor tab
    getByRole("tab", { name: "Editor" }).click();

    const defaultCodeSwitch = getByRole("switch", {
      name: "Default Code on New Project",
    });
    expect(defaultCodeSwitch).toBeTruthy();

    // Toggling off should call updateSettings
    defaultCodeSwitch.click();
    expect(updateSettingsMock).toHaveBeenCalledWith({
      isDefaultCodeEnabled: false,
    });
  });

  it("Default Code toggle reflects setting's modified state via reset button", () => {
    setMockSettings((prev) => ({ ...prev, isDefaultCodeEnabled: false }));
    setMockIsOpen(true);
    resetSettingMock.mockClear();

    const { getByRole } = render(() => <SettingsModal />);

    getByRole("tab", { name: "Editor" }).click();

    const resetButton = getByRole("button", {
      name: "Reset Default Code on New Project to default",
    });
    expect(resetButton).toBeTruthy();

    resetButton.click();
    expect(resetSettingMock).toHaveBeenCalledWith("isDefaultCodeEnabled");
  });
});

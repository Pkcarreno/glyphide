import { render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "./Header.tsx";

vi.stubGlobal("console", { info: vi.fn() });

const dispatchMock = vi.fn();
const applyUpdateMock = vi.fn();
const [mockIsTrustRequired, setMockIsTrustRequired] = createSignal(false);
const [mockUpdateAvailable, setMockUpdateAvailable] = createSignal(false);
vi.mock("../../core/context", () => ({
  useEditor: () => ({
    dispatcher: { dispatch: dispatchMock },
    engine: { engineStatus: () => "idle" },
    project: { displayName: () => "TEST_PROJECT", name: () => "TEST_PROJECT" },
    pwa: {
      applyUpdate: applyUpdateMock,
      updateAvailable: () => mockUpdateAvailable(),
    },
    trust: { isTrustRequired: () => mockIsTrustRequired() },
  }),
}));

const TEST_PROJECT_REGEX = /TEST_PROJECT/;
const RUN_REGEX = /Run/;
const TRUST_REGEX = /trust/i;
const UPDATE_REGEX = /update/i;
const VERSION_LABELS_REGEX = /Glyphide v/;

describe("Header", () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    setMockIsTrustRequired(false);
  });

  it("when rendered, displays the app title", () => {
    const { getByText } = render(() => <Header />);
    expect(getByText(TEST_PROJECT_REGEX)).toBeTruthy();
  });

  it("when settings button clicked, dispatches TOGGLE_OVERLAY action", () => {
    const { getByRole } = render(() => <Header />);
    getByRole("button", { name: "Settings" }).click();
    expect(dispatchMock).toHaveBeenCalledWith({
      overlayId: "settings",
      type: "TOGGLE_OVERLAY",
    });
  });

  it("when share button clicked, dispatches OPEN_OVERLAY action for share", () => {
    const { getByRole } = render(() => <Header />);
    getByRole("button", { name: "Share workspace" }).click();
    expect(dispatchMock).toHaveBeenCalledWith({
      overlayId: "share",
      type: "OPEN_OVERLAY",
    });
  });

  it("when run button clicked, dispatches RUN_CODE action", () => {
    const { getAllByRole } = render(() => <Header />);
    const buttons = getAllByRole("button", { name: RUN_REGEX });
    buttons[0].click();
    expect(dispatchMock).toHaveBeenCalledWith({ type: "RUN_CODE" });
  });

  it("when custom class is provided, merges it", () => {
    const { container } = render(() => <Header class="mb-4" />);
    expect(container.firstElementChild?.className).toContain("mb-4");
  });

  describe("Trust indicator", () => {
    it("when trust is not required, indicator is not visible", () => {
      const { queryByRole } = render(() => <Header />);
      expect(queryByRole("button", { name: TRUST_REGEX })).toBeNull();
    });

    it("when trust is required, indicator is visible", () => {
      setMockIsTrustRequired(true);
      const { getByRole } = render(() => <Header />);
      expect(getByRole("button", { name: TRUST_REGEX })).toBeTruthy();
    });

    it("when trust indicator clicked, dispatches OPEN_OVERLAY for trust-required", () => {
      setMockIsTrustRequired(true);
      const { getByRole } = render(() => <Header />);
      const indicator = getByRole("button", { name: TRUST_REGEX });
      indicator.click();
      expect(dispatchMock).toHaveBeenCalledWith({
        overlayId: "trust-required",
        type: "OPEN_OVERLAY",
      });
    });

    it("when trust required, run button still dispatches RUN_CODE (gate is in core)", () => {
      setMockIsTrustRequired(true);
      const { getAllByRole } = render(() => <Header />);
      const buttons = getAllByRole("button", { name: RUN_REGEX });
      buttons[0].click();
      // The Header still dispatches RUN_CODE — the core guard blocks it
      expect(dispatchMock).toHaveBeenCalledWith({ type: "RUN_CODE" });
    });
  });
});

describe("Header - Mobile Dropdown Items", () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    setMockIsTrustRequired(false);
  });

  it("when dropdown is opened, displays mobile-only dropdown items", () => {
    const { getByRole } = render(() => <Header />);

    // Open the dropdown by clicking the trigger (LogoSquare) - use aria-label to be specific
    const triggerButton = getByRole("button", { name: "Menu" });
    triggerButton.click();

    // Query for all menu items in the dropdown using screen (finds in document.body portal)
    const menuItems = screen.getAllByRole("menuitem");

    // Find items by their text content
    const settingsItem = menuItems.find((el) =>
      el.textContent?.includes("Settings")
    );
    const shareItem = menuItems.find((el) => el.textContent?.includes("Share"));
    const selectEngineItem = menuItems.find((el) =>
      el.textContent?.includes("Select Engine")
    );
    const engineSettingsItem = menuItems.find((el) =>
      el.textContent?.includes("Engine Settings")
    );
    const openFileItem = menuItems.find((el) =>
      el.textContent?.includes("Open File")
    );

    // New Project should always be present
    expect(
      menuItems.find((el) => el.textContent?.includes("New Project"))
    ).toBeTruthy();

    // Mobile-only items should be present when dropdown opens
    expect(settingsItem).toBeTruthy();
    expect(shareItem).toBeTruthy();
    expect(selectEngineItem).toBeTruthy();
    expect(engineSettingsItem).toBeTruthy();
    expect(openFileItem).toBeTruthy();
    expect(settingsItem?.textContent).toContain("Settings");
    expect(shareItem?.textContent).toContain("Share");
    expect(selectEngineItem?.textContent).toContain("Select Engine");
    expect(engineSettingsItem?.textContent).toContain("Engine Settings");
    expect(openFileItem?.textContent).toContain("Open File");
  });

  it("when dropdown Open File item is clicked, dispatches OPEN_OVERLAY for load-file", () => {
    const { getByRole } = render(() => <Header />);

    const triggerButton = getByRole("button", { name: "Menu" });
    triggerButton.click();

    const menuItems = screen.getAllByRole("menuitem");
    const openFileItem = menuItems.find((el) =>
      el.textContent?.includes("Open File")
    );

    expect(openFileItem).toBeTruthy();
    openFileItem?.click();

    expect(dispatchMock).toHaveBeenCalledWith({
      overlayId: "load-file",
      type: "OPEN_OVERLAY",
    });
  });

  it("when dropdown Settings item is clicked, dispatches TOGGLE_OVERLAY for settings", () => {
    const { getByRole } = render(() => <Header />);

    // Open the dropdown
    const triggerButton = getByRole("button", { name: "Menu" });
    triggerButton.click();

    // Find and click Settings menu item
    const menuItems = screen.getAllByRole("menuitem");
    const settingsItem = menuItems.find((el) =>
      el.textContent?.includes("Settings")
    );

    expect(settingsItem).toBeTruthy();
    settingsItem?.click();

    expect(dispatchMock).toHaveBeenCalledWith({
      overlayId: "settings",
      type: "TOGGLE_OVERLAY",
    });
  });

  it("when dropdown Share item is clicked, dispatches OPEN_OVERLAY for share", () => {
    const { getByRole } = render(() => <Header />);

    // Open the dropdown
    const triggerButton = getByRole("button", { name: "Menu" });
    triggerButton.click();

    // Find and click Share menu item
    const menuItems = screen.getAllByRole("menuitem");
    const shareItem = menuItems.find((el) => el.textContent?.includes("Share"));

    expect(shareItem).toBeTruthy();
    shareItem?.click();

    expect(dispatchMock).toHaveBeenCalledWith({
      overlayId: "share",
      type: "OPEN_OVERLAY",
    });
  });

  it("when dropdown Select Engine item is clicked, dispatches OPEN_OVERLAY for engine-selector", () => {
    const { getByRole } = render(() => <Header />);

    // Open the dropdown
    const triggerButton = getByRole("button", { name: "Menu" });
    triggerButton.click();

    // Find and click Select Engine menu item
    const menuItems = screen.getAllByRole("menuitem");
    const selectEngineItem = menuItems.find((el) =>
      el.textContent?.includes("Select Engine")
    );

    expect(selectEngineItem).toBeTruthy();
    selectEngineItem?.click();

    expect(dispatchMock).toHaveBeenCalledWith({
      overlayId: "engine-selector",
      type: "OPEN_OVERLAY",
    });
  });

  it("when dropdown Engine Settings item is clicked, dispatches OPEN_OVERLAY for engine-settings", () => {
    const { getByRole } = render(() => <Header />);

    // Open the dropdown
    const triggerButton = getByRole("button", { name: "Menu" });
    triggerButton.click();

    // Find and click Engine Settings menu item
    const menuItems = screen.getAllByRole("menuitem");
    const engineSettingsItem = menuItems.find((el) =>
      el.textContent?.includes("Engine Settings")
    );

    expect(engineSettingsItem).toBeTruthy();
    engineSettingsItem?.click();

    expect(dispatchMock).toHaveBeenCalledWith({
      overlayId: "engine-settings",
      type: "OPEN_OVERLAY",
    });
  });

  describe("PWA update button", () => {
    beforeEach(() => {
      applyUpdateMock.mockClear();
      setMockUpdateAvailable(false);
    });

    it("when updateAvailable is false, update button is not visible", () => {
      const { queryByRole } = render(() => <Header />);
      expect(queryByRole("button", { name: UPDATE_REGEX })).toBeNull();
    });

    it("when updateAvailable is true, update button is visible", () => {
      setMockUpdateAvailable(true);
      const { getByRole } = render(() => <Header />);
      expect(getByRole("button", { name: UPDATE_REGEX })).toBeTruthy();
    });

    it("when update button is clicked, calls pwa.applyUpdate()", () => {
      setMockUpdateAvailable(true);
      const { getByRole } = render(() => <Header />);
      const updateButton = getByRole("button", { name: UPDATE_REGEX });
      updateButton.click();
      expect(applyUpdateMock).toHaveBeenCalled();
    });

    it("when updateAvailable is true, the inline update button is wrapped in a responsive container (hidden on mobile)", () => {
      setMockUpdateAvailable(true);
      const { container } = render(() => <Header />);
      const updateButton = container.querySelector(
        'button[aria-label="Update Available"]'
      );
      expect(updateButton).toBeTruthy();
      const wrapper = updateButton?.parentElement;
      expect(wrapper?.className).toContain("hidden");
      expect(wrapper?.className).toContain("md:flex");
    });

    it("when updateAvailable is true and dropdown is opened, Update App menuitem is present", () => {
      setMockUpdateAvailable(true);
      const { getByRole } = render(() => <Header />);
      getByRole("button", { name: "Menu" }).click();
      const menuItems = screen.getAllByRole("menuitem");
      const updateItem = menuItems.find((el) =>
        el.textContent?.includes("Update App")
      );
      expect(updateItem).toBeTruthy();
      expect(updateItem?.textContent).toContain("Update App");
    });

    it("when dropdown Update App item is clicked, calls pwa.applyUpdate()", () => {
      setMockUpdateAvailable(true);
      const { getByRole } = render(() => <Header />);
      getByRole("button", { name: "Menu" }).click();
      const menuItems = screen.getAllByRole("menuitem");
      const updateItem = menuItems.find((el) =>
        el.textContent?.includes("Update App")
      );
      expect(updateItem).toBeTruthy();
      updateItem?.click();
      expect(applyUpdateMock).toHaveBeenCalled();
    });

    it("when updateAvailable is false, dropdown does not contain Update App menuitem", () => {
      const { getByRole } = render(() => <Header />);
      getByRole("button", { name: "Menu" }).click();
      const menuItems = screen.getAllByRole("menuitem");
      const updateItem = menuItems.find((el) =>
        el.textContent?.includes("Update App")
      );
      expect(updateItem).toBeUndefined();
    });

    it("when trust required and updateAvailable, dropdown Update App menuitem is still present", () => {
      setMockIsTrustRequired(true);
      setMockUpdateAvailable(true);
      const { getByRole } = render(() => <Header />);
      getByRole("button", { name: "Menu" }).click();
      const menuItems = screen.getAllByRole("menuitem");
      const updateItem = menuItems.find((el) =>
        el.textContent?.includes("Update App")
      );
      expect(updateItem).toBeTruthy();
      expect(updateItem?.textContent).toContain("Update App");
    });

    it("when updateAvailable is true, the mobile Update App group is in a block md:hidden container", () => {
      setMockUpdateAvailable(true);
      const { getByRole } = render(() => <Header />);
      getByRole("button", { name: "Menu" }).click();
      const groups = document.querySelectorAll("fieldset.block.md\\:hidden");
      const updateGroup = Array.from(groups).find((g) =>
        g.textContent?.includes("Update App")
      );
      expect(updateGroup).toBeTruthy();
    });
  });

  describe("About group", () => {
    it("when dropdown is opened, GitHub link menuitem is present", () => {
      const { getByRole } = render(() => <Header />);
      getByRole("button", { name: "Menu" }).click();
      const menuItems = screen.getAllByRole("menuitem");
      const githubItem = menuItems.find((el) =>
        el.textContent?.includes("GitHub")
      );
      expect(githubItem).toBeTruthy();
    });

    it("when GitHub link is clicked, navigates to repository URL", () => {
      const { getByRole } = render(() => <Header />);
      getByRole("button", { name: "Menu" }).click();
      const menuItems = screen.getAllByRole("menuitem");
      const githubItem = menuItems.find((el) =>
        el.textContent?.includes("GitHub")
      );
      expect(githubItem).toBeTruthy();
      expect(githubItem?.getAttribute("href")).toBe(
        "https://github.com/pkcarreno/glyphide"
      );
      expect(githubItem?.getAttribute("target")).toBe("_blank");
      expect(githubItem?.getAttribute("rel")).toBe("noopener noreferrer");
    });

    it("when dropdown is opened, version label is visible", () => {
      const { getByRole } = render(() => <Header />);
      getByRole("button", { name: "Menu" }).click();
      const versionLabels = screen.getAllByText(VERSION_LABELS_REGEX);
      expect(versionLabels.length).toBeGreaterThanOrEqual(1);
    });

    it("when dropdown is opened, separator precedes the About group", () => {
      const { getByRole } = render(() => <Header />);
      getByRole("button", { name: "Menu" }).click();
      const separators = document.querySelectorAll("hr[aria-orientation]");
      expect(separators.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("when Settings/Share buttons exist, they have hidden md:block class for mobile visibility toggle", () => {
    const { container } = render(() => <Header />);

    // Find the wrapper spans with responsive classes
    const wrapperSpans = container.querySelectorAll("span.hidden.md\\:block");

    // Should have 2 wrappers: one for Settings, one for Share
    expect(wrapperSpans.length).toBe(2);

    // Verify the button elements exist
    const buttons = container.querySelectorAll("button");
    const settingsBtn = Array.from(buttons).find(
      (btn) => btn.getAttribute("aria-label") === "Settings"
    );
    const shareBtn = Array.from(buttons).find(
      (btn) => btn.getAttribute("aria-label") === "Share workspace"
    );
    expect(settingsBtn).toBeTruthy();
    expect(shareBtn).toBeTruthy();
  });
});

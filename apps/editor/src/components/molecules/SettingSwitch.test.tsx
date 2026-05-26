import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { SettingSwitch } from "./SettingSwitch";

describe("SettingSwitch", () => {
  it("when rendered, displays the label and a switch", () => {
    const { getByText, getByRole } = render(() => (
      <SettingSwitch label="Auto-save" />
    ));
    expect(getByText("Auto-save")).toBeTruthy();
    expect(getByRole("switch")).toBeTruthy();
  });

  it("when description is provided, displays it and links via aria-describedby", () => {
    const { getByText, getByRole } = render(() => (
      <SettingSwitch
        label="Auto-save"
        description="Save file on blur"
      />
    ));
    expect(getByText("Save file on blur")).toBeTruthy();

    const sw = getByRole("switch");
    const descId = sw.getAttribute("aria-describedby");
    expect(descId).toBeTruthy();
    expect(document.getElementById(descId!)?.textContent).toBe("Save file on blur");
  });

  it("when clicked on label, toggles the switch via 'for' attribute", () => {
    const { getByText, getByRole } = render(() => (
      <SettingSwitch label="Toggle me" />
    ));
    const label = getByText("Toggle me");
    const sw = getByRole("switch");

    expect(sw.getAttribute("aria-checked")).toBe("false");
    label.click();
    expect(sw.getAttribute("aria-checked")).toBe("true");
  });

  it("when disabled is true, applies opacity to container and disables switch", () => {
    const { container, getByRole } = render(() => (
      <SettingSwitch label="Disabled option" disabled />
    ));
    // Container should have opacity-50
    expect(container.firstElementChild?.className).toContain("opacity-50");
    // Switch should be disabled
    expect(getByRole("switch")).toHaveProperty("disabled", true);
  });

  it("when custom class is provided, merges it into the container", () => {
    const { container } = render(() => (
      <SettingSwitch label="Styled" class="mb-4" />
    ));
    expect(container.firstElementChild?.className).toContain("mb-4");
  });

  it("when rendered, passes switch props down", () => {
    const { getByRole } = render(() => (
      <SettingSwitch label="Default ON" defaultChecked />
    ));
    expect(getByRole("switch").getAttribute("aria-checked")).toBe("true");
  });
});

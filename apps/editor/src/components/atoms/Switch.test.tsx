import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "./Switch.tsx";

describe("Switch", () => {
  it("when rendered with defaults, is unchecked", () => {
    const { getByRole } = render(() => <Switch aria-label="Toggle" />);
    const sw = getByRole("switch");
    expect(sw.getAttribute("aria-checked")).toBe("false");
  });

  it("when defaultChecked is true, starts checked", () => {
    const { getByRole } = render(() => (
      <Switch aria-label="Toggle" defaultChecked />
    ));
    expect(getByRole("switch").getAttribute("aria-checked")).toBe("true");
  });

  it("when clicked in uncontrolled mode, toggles state", () => {
    const { getByRole } = render(() => <Switch aria-label="Toggle" />);
    const sw = getByRole("switch");
    expect(sw.getAttribute("aria-checked")).toBe("false");
    sw.click();
    expect(sw.getAttribute("aria-checked")).toBe("true");
    sw.click();
    expect(sw.getAttribute("aria-checked")).toBe("false");
  });

  it("when clicked, fires onCheckedChange with new value", () => {
    const handler = vi.fn();
    const { getByRole } = render(() => (
      <Switch aria-label="Toggle" onCheckedChange={handler} />
    ));
    getByRole("switch").click();
    expect(handler).toHaveBeenCalledWith(true);
    getByRole("switch").click();
    expect(handler).toHaveBeenCalledWith(false);
  });

  it("when used as controlled, reflects external checked prop", () => {
    const [checked, setChecked] = createSignal(false);
    const { getByRole } = render(() => (
      <Switch
        aria-label="Toggle"
        checked={checked()}
        onCheckedChange={setChecked}
      />
    ));
    const sw = getByRole("switch");
    expect(sw.getAttribute("aria-checked")).toBe("false");
    sw.click();
    expect(sw.getAttribute("aria-checked")).toBe("true");
  });

  it("when disabled, does not toggle on click", () => {
    const handler = vi.fn();
    const { getByRole } = render(() => (
      <Switch aria-label="Toggle" disabled onCheckedChange={handler} />
    ));
    getByRole("switch").click();
    expect(handler).not.toHaveBeenCalled();
  });

  it("when disabled, has disabled attribute", () => {
    const { getByRole } = render(() => <Switch aria-label="Toggle" disabled />);
    expect(getByRole("switch")).toHaveProperty("disabled", true);
  });

  it("when custom class is provided, merges it", () => {
    const { getByRole } = render(() => (
      <Switch aria-label="Toggle" class="ml-2" />
    ));
    expect(getByRole("switch").className).toContain("ml-2");
  });

  it("when checked, applies primary background", () => {
    const { getByRole } = render(() => (
      <Switch aria-label="Toggle" defaultChecked />
    ));
    expect(getByRole("switch").className).toContain("bg-primary");
  });

  it("when unchecked, applies surface-variant background", () => {
    const { getByRole } = render(() => <Switch aria-label="Toggle" />);
    expect(getByRole("switch").className).toContain("bg-surface-variant");
  });
});

import { describe, expect, it } from "vitest";
import { createOverlayModel } from "./overlay.ts";

describe("OverlayModel", () => {
  it("when initialized, has no open overlays", () => {
    const overlays = createOverlayModel();
    expect(overlays.isOpen("settings")).toBe(false);
  });

  it("when opened, sets the overlay as open", () => {
    const overlays = createOverlayModel();
    overlays.open("settings");
    expect(overlays.isOpen("settings")).toBe(true);
  });

  it("when closed, sets the overlay as not open", () => {
    const overlays = createOverlayModel();
    overlays.open("settings");
    overlays.close("settings");
    expect(overlays.isOpen("settings")).toBe(false);
  });

  it("when toggled, toggles the open state", () => {
    const overlays = createOverlayModel();
    overlays.toggle("settings");
    expect(overlays.isOpen("settings")).toBe(true);
    overlays.toggle("settings");
    expect(overlays.isOpen("settings")).toBe(false);
  });
});

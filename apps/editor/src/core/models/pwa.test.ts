import { describe, expect, it } from "vitest";
import { createPwaModel } from "./pwa.ts";

describe("PwaModel", () => {
  it("updateAvailable() defaults to false", () => {
    const model = createPwaModel();
    expect(model.updateAvailable()).toBe(false);
  });

  it("offlineReady() defaults to false", () => {
    const model = createPwaModel();
    expect(model.offlineReady()).toBe(false);
  });

  it("setUpdateAvailable(true) flips updateAvailable() to true", () => {
    const model = createPwaModel();
    model.setUpdateAvailable(true);
    expect(model.updateAvailable()).toBe(true);
  });

  it("setOfflineReady(true) flips offlineReady() to true", () => {
    const model = createPwaModel();
    model.setOfflineReady(true);
    expect(model.offlineReady()).toBe(true);
  });

  it("applyUpdate() is callable (no-op at model level)", () => {
    const model = createPwaModel();
    expect(() => model.applyUpdate()).not.toThrow();
  });

  it("toggling setUpdateAvailable back to false returns to false", () => {
    const model = createPwaModel();
    model.setUpdateAvailable(true);
    model.setUpdateAvailable(false);
    expect(model.updateAvailable()).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import type { PersistencePort } from "../ports/persistence.ts";
import { createSettingsModel } from "./settings.ts";

function createMockPersistence(
  initialData: Record<string, string> = {}
): PersistencePort {
  const data = new Map(Object.entries(initialData));
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, val) => data.set(key, val),
    remove: (key) => data.delete(key),
  };
}

describe("SettingsModel", () => {
  it("initializes with default settings if persistence is empty", () => {
    const persistence = createMockPersistence();
    const model = createSettingsModel(persistence);

    expect(model.settings.theme).toBe("system");
    expect(model.settings.isWordWrapEnabled).toBe(false);
    expect(model.settings.uiFontSize).toBe(14);
    expect(model.settings.bufferFontSize).toBe(15);
    expect(model.settings.bufferLineHeight).toBe(1.3);
    expect(model.settings.autoRunDelay).toBe(750);
  });

  it("loads settings from persistence port", () => {
    const persistence = createMockPersistence({
      settings: JSON.stringify({ theme: "dark", isWordWrapEnabled: true }),
    });
    const model = createSettingsModel(persistence);

    expect(model.settings.theme).toBe("dark");
    expect(model.settings.isWordWrapEnabled).toBe(true);
    // Preserves defaults for missing keys
    expect(model.settings.isClearOnRunEnabled).toBe(true);
  });

  it("updates settings and persists them", () => {
    const persistence = createMockPersistence();
    const model = createSettingsModel(persistence);

    model.updateSettings({ theme: "light" });

    expect(model.settings.theme).toBe("light");
    const raw = persistence.get("settings");
    const saved = JSON.parse(raw ?? "{}");
    expect(saved.theme).toBe("light");
  });

  it("resets a specific setting to its default value", () => {
    const persistence = createMockPersistence();
    const model = createSettingsModel(persistence);

    model.updateSettings({ theme: "dark", uiFontSize: 20 });
    expect(model.settings.theme).toBe("dark");
    expect(model.settings.uiFontSize).toBe(20);

    model.resetSetting("theme");
    expect(model.settings.theme).toBe("system");
    expect(model.settings.uiFontSize).toBe(20);

    const raw = persistence.get("settings");
    const saved = JSON.parse(raw ?? "{}");
    expect(saved.theme).toBe("system");
  });
});

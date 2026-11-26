import { flush } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PersistencePort } from "../ports/persistence.ts";
import { createSettingsModel } from "./settings.ts";

function createMockPersistence(
  initialData: Record<string, string> = {}
): PersistencePort {
  const data = new Map(Object.entries(initialData));
  return {
    get: (key) => data.get(key) ?? null,
    remove: (key) => data.delete(key),
    set: (key, val) => data.set(key, val),
  };
}

function createMockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const addEventListener = vi.fn(
    (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === "change" && typeof listener === "function") {
        listeners.add(listener as (event: MediaQueryListEvent) => void);
      }
    }
  );

  const removeEventListener = vi.fn(
    (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === "change" && typeof listener === "function") {
        listeners.delete(listener as (event: MediaQueryListEvent) => void);
      }
    }
  );

  const mediaQueryList = {
    addEventListener,
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    removeEventListener,
  } as unknown as MediaQueryList;

  return {
    addEventListener,
    dispatchChange(nextMatches: boolean) {
      matches = nextMatches;
      const event = { matches: nextMatches } as MediaQueryListEvent;
      for (const listener of listeners) {
        listener(event);
      }
    },
    listenerCount: () => listeners.size,
    matchMedia: vi.fn(() => mediaQueryList),
    removeEventListener,
  };
}

const originalMatchMedia = window.matchMedia;

function setWindowMatchMedia(
  value: ((query: string) => MediaQueryList) | undefined
): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value,
    writable: true,
  });
}

describe("SettingsModel", () => {
  afterEach(() => {
    setWindowMatchMedia(originalMatchMedia);
  });
  it("initializes with default settings if persistence is empty", () => {
    const persistence = createMockPersistence();
    const model = createSettingsModel(persistence);

    expect(model.settings.theme).toBe("system");
    expect(model.settings.isWordWrapEnabled).toBe(false);
    expect(model.settings.uiFontSize).toBe(16);
    expect(model.settings.bufferFontSize).toBe(15);
    expect(model.settings.bufferLineHeight).toBe(1.3);
    expect(model.settings.autoRunDelay).toBe(750);
  });

  it("defaults isDefaultCodeEnabled to true so new projects ship with starter code", () => {
    const persistence = createMockPersistence();
    const model = createSettingsModel(persistence);

    expect(model.settings.isDefaultCodeEnabled).toBe(true);
  });

  it("merges legacy localStorage settings by defaulting missing isDefaultCodeEnabled to true", () => {
    // Simulate a returning user whose persisted settings predate the field.
    const persistence = createMockPersistence({
      settings: JSON.stringify({ isWordWrapEnabled: true, theme: "dark" }),
    });
    const model = createSettingsModel(persistence);

    expect(model.settings.theme).toBe("dark");
    expect(model.settings.isWordWrapEnabled).toBe(true);
    // Missing key falls back to DEFAULT_SETTINGS
    expect(model.settings.isDefaultCodeEnabled).toBe(true);
  });

  it("loads settings from persistence port", () => {
    const persistence = createMockPersistence({
      settings: JSON.stringify({ isWordWrapEnabled: true, theme: "dark" }),
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
    flush();

    expect(model.settings.theme).toBe("light");
    const raw = persistence.get("settings");
    const saved = JSON.parse(raw ?? "{}");
    expect(saved.theme).toBe("light");
  });

  it("resets a specific setting to its default value", () => {
    const persistence = createMockPersistence();
    const model = createSettingsModel(persistence);

    model.updateSettings({ theme: "dark", uiFontSize: 20 });
    flush();
    expect(model.settings.theme).toBe("dark");
    expect(model.settings.uiFontSize).toBe(20);

    model.resetSetting("theme");
    flush();
    expect(model.settings.theme).toBe("system");
    expect(model.settings.uiFontSize).toBe(20);

    const raw = persistence.get("settings");
    const saved = JSON.parse(raw ?? "{}");
    expect(saved.theme).toBe("system");
  });

  it("resolves explicit light and dark themes regardless of system preference", () => {
    const mockMedia = createMockMatchMedia(true);
    setWindowMatchMedia(mockMedia.matchMedia);

    const model = createSettingsModel(
      createMockPersistence({ settings: JSON.stringify({ theme: "light" }) })
    );
    expect(model.resolvedTheme()).toBe("light");

    model.updateSettings({ theme: "dark" });
    flush();
    expect(model.resolvedTheme()).toBe("dark");

    mockMedia.dispatchChange(false);
    flush();
    expect(model.resolvedTheme()).toBe("dark");

    model.dispose();
  });

  it("resolves system theme from matchMedia and updates on change events", () => {
    const mockMedia = createMockMatchMedia(false);
    setWindowMatchMedia(mockMedia.matchMedia);

    const model = createSettingsModel(createMockPersistence());
    expect(model.resolvedTheme()).toBe("light");

    mockMedia.dispatchChange(true);
    flush();
    expect(model.resolvedTheme()).toBe("dark");

    mockMedia.dispatchChange(false);
    flush();
    expect(model.resolvedTheme()).toBe("light");

    model.dispose();
  });

  it("updates resolvedTheme when switching between explicit and system themes", () => {
    const mockMedia = createMockMatchMedia(true);
    setWindowMatchMedia(mockMedia.matchMedia);

    const model = createSettingsModel(
      createMockPersistence({ settings: JSON.stringify({ theme: "light" }) })
    );
    expect(model.resolvedTheme()).toBe("light");

    model.updateSettings({ theme: "system" });
    flush();
    expect(model.resolvedTheme()).toBe("dark");

    mockMedia.dispatchChange(false);
    flush();
    expect(model.resolvedTheme()).toBe("light");

    model.dispose();
  });

  it("defaults resolvedTheme to light when window.matchMedia is unavailable", () => {
    setWindowMatchMedia(undefined);

    const model = createSettingsModel(createMockPersistence());
    expect(model.resolvedTheme()).toBe("light");

    model.updateSettings({ theme: "dark" });
    flush();
    expect(model.resolvedTheme()).toBe("dark");

    model.resetSetting("theme");
    flush();
    expect(model.resolvedTheme()).toBe("light");

    expect(() => model.dispose()).not.toThrow();
  });

  it("removes the matchMedia change listener on dispose", () => {
    const mockMedia = createMockMatchMedia(false);
    setWindowMatchMedia(mockMedia.matchMedia);

    const model = createSettingsModel(createMockPersistence());
    expect(mockMedia.listenerCount()).toBe(1);
    expect(mockMedia.addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );

    model.dispose();
    expect(mockMedia.listenerCount()).toBe(0);
    expect(mockMedia.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );

    mockMedia.dispatchChange(true);
    flush();
    expect(model.resolvedTheme()).toBe("light");
  });
});

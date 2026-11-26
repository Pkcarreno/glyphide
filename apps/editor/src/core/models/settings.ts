import type { Accessor } from "solid-js";
import { createMemo, createSignal, createStore } from "solid-js";
import type { PersistencePort } from "../ports/persistence.ts";

const SETTINGS_STORAGE_KEY = "settings";
const DARK_COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

/**
 * Supported theme preferences.
 *
 * @public
 */
export type ThemePreference = "light" | "dark" | "system";

/**
 * Shape of all persisted editor settings.
 * Treated as an immutable snapshot per reactive update cycle.
 */
export interface EditorSettings {
  autoRunDelay: number;
  bufferFontSize: number;
  bufferLineHeight: number;
  isAutoRunEnabled: boolean;
  isClearOnRunEnabled: boolean;
  isDefaultCodeEnabled: boolean;
  isWordWrapEnabled: boolean;
  theme: ThemePreference;
  uiFontSize: number;
}

/** Safe defaults when no persisted settings exist. */
export const DEFAULT_SETTINGS: EditorSettings = {
  autoRunDelay: 750,
  bufferFontSize: 15,
  bufferLineHeight: 1.3,
  isAutoRunEnabled: true,
  isClearOnRunEnabled: true,
  isDefaultCodeEnabled: true,
  isWordWrapEnabled: false,
  theme: "system",
  uiFontSize: 16,
};

/**
 * Pure model for global editor configuration.
 * Reads initial state from the persistence port and
 * writes back on every update. Views pull from this reactively.
 */
export interface SettingsModel {
  /** Unregisters system theme listeners on disposal. */
  dispose: () => void;
  /** Resets a specific setting to its default value. */
  resetSetting: <K extends keyof EditorSettings>(key: K) => void;
  /** Effective color theme after resolving the "system" preference. */
  resolvedTheme: Accessor<"light" | "dark">;
  /** Reactive store — read any property reactively. */
  settings: EditorSettings;
  /** Applies a partial patch and persists the result. */
  updateSettings: (patch: Partial<EditorSettings>) => void;
}

/** Creates a `SettingsModel` backed by the given persistence port. */
export function createSettingsModel(
  persistence: PersistencePort
): SettingsModel {
  const initial = loadSettings(persistence);
  const [settings, setSettings] = createStore<EditorSettings>(initial);

  const mediaQuery =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(DARK_COLOR_SCHEME_QUERY)
      : null;

  const [isSystemDark, setIsSystemDark] = createSignal(
    mediaQuery?.matches ?? false
  );

  function handleMediaChange(event: MediaQueryListEvent): void {
    setIsSystemDark(event.matches);
  }

  if (mediaQuery && typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handleMediaChange);
  }

  const resolvedTheme = createMemo<"light" | "dark">(() => {
    if (settings.theme === "dark" || settings.theme === "light") {
      return settings.theme;
    }
    return isSystemDark() ? "dark" : "light";
  });

  function updateSettings(patch: Partial<EditorSettings>): void {
    setSettings((draft) => {
      Object.assign(draft, patch);
    });
    persistSettings(persistence, { ...settings, ...patch });
  }

  function resetSetting<K extends keyof EditorSettings>(key: K): void {
    updateSettings({ [key]: DEFAULT_SETTINGS[key] } as Partial<EditorSettings>);
  }

  function dispose(): void {
    if (mediaQuery && typeof mediaQuery.removeEventListener === "function") {
      mediaQuery.removeEventListener("change", handleMediaChange);
    }
  }

  return { dispose, resetSetting, resolvedTheme, settings, updateSettings };
}

function loadSettings(persistence: PersistencePort): EditorSettings {
  const raw = persistence.get(SETTINGS_STORAGE_KEY);
  if (!raw) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<EditorSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persistSettings(
  persistence: PersistencePort,
  settings: EditorSettings
): void {
  persistence.set(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

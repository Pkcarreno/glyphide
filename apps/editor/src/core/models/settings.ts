import { createStore } from "solid-js/store";
import type { PersistencePort } from "../ports/persistence.ts";

const SETTINGS_STORAGE_KEY = "settings";

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
  /** Resets a specific setting to its default value. */
  resetSetting: <K extends keyof EditorSettings>(key: K) => void;
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

  function updateSettings(patch: Partial<EditorSettings>): void {
    setSettings(patch);
    persistSettings(persistence, { ...settings, ...patch });
  }

  function resetSetting<K extends keyof EditorSettings>(key: K): void {
    updateSettings({ [key]: DEFAULT_SETTINGS[key] } as Partial<EditorSettings>);
  }

  return { resetSetting, settings, updateSettings };
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

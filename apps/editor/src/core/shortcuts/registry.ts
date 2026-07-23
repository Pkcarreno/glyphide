import type { EditorAction } from "../actions/types.ts";
import type { EditorCore } from "../editor-core.ts";

/**
 * Platform-agnostic representation of a keyboard combination.
 * UI adapters convert native keyboard events into this shape.
 */
export interface KeyCombo {
  alt: boolean;
  /** Whether Ctrl (Windows/Linux) or Cmd (macOS) is held. */
  ctrlOrMeta: boolean;
  /** The key value (e.g. "Enter", "s", "Escape"). */
  key: string;
  shift: boolean;
}

/** A declarative binding between a key combination and an action. */
export interface ShortcutBinding {
  action: EditorAction;
  combo: KeyCombo;
  /** Human-readable label for tooltips (e.g. "Ctrl+Enter"). */
  label: string;
  /** Optional predicate to check if the shortcut is active in the current state. */
  when?: (core: EditorCore) => boolean;
}

/** Lookup table that resolves key combos to editor actions. */
export interface ShortcutRegistry {
  /** All registered bindings (for rendering in UI tooltips). */
  bindings: readonly ShortcutBinding[];
  /** Returns the matching action for a key combo, or `null`. */
  matchShortcut: (combo: KeyCombo, core?: EditorCore) => EditorAction | null;
}

/**
 * Creates a `ShortcutRegistry` from a list of bindings.
 * Matching is exact: all modifier flags must match.
 */
export function createShortcutRegistry(
  bindings: ShortcutBinding[]
): ShortcutRegistry {
  function matchShortcut(
    combo: KeyCombo,
    core?: EditorCore
  ): EditorAction | null {
    for (const binding of bindings) {
      const target = binding.combo;
      if (
        combo.key === target.key &&
        combo.ctrlOrMeta === target.ctrlOrMeta &&
        combo.shift === target.shift &&
        combo.alt === target.alt &&
        (!binding.when || (core && binding.when(core)))
      ) {
        return binding.action;
      }
    }
    return null;
  }

  return { bindings, matchShortcut };
}

/** Converts a native keyboard event into a platform-agnostic `KeyCombo`. */
export function parseKeyCombo(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): KeyCombo {
  return {
    alt: event.altKey,
    ctrlOrMeta: event.ctrlKey || event.metaKey,
    key: event.key,
    shift: event.shiftKey,
  };
}

/** Default keyboard shortcuts for the editor. */
export const defaultShortcutBindings: ShortcutBinding[] = [
  {
    action: { type: "RUN_CODE" },
    combo: { alt: false, ctrlOrMeta: true, key: "Enter", shift: false },
    label: "Ctrl+Enter",
  },
  {
    action: { type: "CLOSE_ALL_OVERLAYS" },
    combo: { alt: false, ctrlOrMeta: false, key: "Escape", shift: false },
    label: "Escape",
    when: (core) => core.overlays.hasActiveOverlays(),
  },
  {
    action: { type: "INTERRUPT_EXECUTION" },
    combo: { alt: false, ctrlOrMeta: false, key: "Escape", shift: false },
    label: "Escape",
    when: (core) => !core.overlays.hasActiveOverlays(),
  },
  {
    action: { overlayId: "settings", type: "TOGGLE_OVERLAY" },
    combo: { alt: false, ctrlOrMeta: true, key: ",", shift: false },
    label: "Ctrl+,",
  },
];

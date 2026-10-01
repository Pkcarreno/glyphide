import type { EditorCore } from "../editor-core.ts";

/** Identifier for commands with keyboard shortcuts. */
export type CommandId =
  | "run-code"
  | "interrupt-execution"
  | "close-all-overlays"
  | "toggle-settings";

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

/** A declarative binding between a key combination and an executable command. */
export interface ShortcutBinding {
  combo: KeyCombo;
  commandId: CommandId;
  /** Direct command execution function. */
  execute: (core: EditorCore) => void;
  /** Human-readable label for tooltips (e.g. "Ctrl+Enter"). */
  label: string;
  /** Optional predicate to check if the shortcut is active in the current state. */
  when?: (core: EditorCore) => boolean;
}

/** Lookup table that resolves key combos to editor commands. */
export interface ShortcutRegistry {
  /** All registered bindings (for rendering in UI tooltips). */
  bindings: readonly ShortcutBinding[];
  /** Returns the registered binding for a command ID, or undefined. */
  getBinding: (commandId: CommandId) => ShortcutBinding | undefined;
  /** Returns the matching binding for a key combo, or `null`. */
  matchShortcut: (combo: KeyCombo, core?: EditorCore) => ShortcutBinding | null;
}

/**
 * Creates a `ShortcutRegistry` from a list of bindings.
 * Matching is exact: all modifier flags must match.
 */
export function createShortcutRegistry(
  bindings: ShortcutBinding[]
): ShortcutRegistry {
  function getBinding(commandId: CommandId): ShortcutBinding | undefined {
    return bindings.find((binding) => binding.commandId === commandId);
  }

  function matchShortcut(
    combo: KeyCombo,
    core?: EditorCore
  ): ShortcutBinding | null {
    for (const binding of bindings) {
      const target = binding.combo;
      if (
        combo.key === target.key &&
        combo.ctrlOrMeta === target.ctrlOrMeta &&
        combo.shift === target.shift &&
        combo.alt === target.alt &&
        (!binding.when || (core && binding.when(core)))
      ) {
        return binding;
      }
    }
    return null;
  }

  return { bindings, getBinding, matchShortcut };
}

/** Converts a native keyboard event into a platform-agnostic `KeyCombo`. */
export function parseKeyCombo(event: {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
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
    combo: { alt: false, ctrlOrMeta: true, key: "Enter", shift: false },
    commandId: "run-code",
    execute: (core) => {
      core.commands.runCode();
    },
    label: "Ctrl+Enter",
  },
  {
    combo: { alt: false, ctrlOrMeta: false, key: "Escape", shift: false },
    commandId: "close-all-overlays",
    execute: (core) => {
      core.overlays.closeAll();
    },
    label: "Escape",
    when: (core) => core.overlays.hasActiveOverlays(),
  },
  {
    combo: { alt: false, ctrlOrMeta: false, key: "Escape", shift: false },
    commandId: "interrupt-execution",
    execute: (core) => {
      core.commands.interruptExecution();
    },
    label: "Escape",
    when: (core) => !core.overlays.hasActiveOverlays(),
  },
  {
    combo: { alt: false, ctrlOrMeta: true, key: ",", shift: false },
    commandId: "toggle-settings",
    execute: (core) => {
      core.overlays.toggle("settings");
    },
    label: "Ctrl+,",
  },
];

import { describe, expect, it, vi } from "vitest";
import type { EditorCore } from "../editor-core.ts";
import type { ShortcutBinding } from "./registry.ts";
import { createShortcutRegistry, parseKeyCombo } from "./registry.ts";

const mockBindings: ShortcutBinding[] = [
  {
    combo: { alt: false, ctrlOrMeta: true, key: "Enter", shift: false },
    commandId: "run-code",
    execute: vi.fn(),
    label: "Ctrl+Enter",
  },
  {
    combo: { alt: false, ctrlOrMeta: true, key: ",", shift: false },
    commandId: "toggle-settings",
    execute: vi.fn(),
    label: "Ctrl+,",
  },
];

describe("ShortcutRegistry", () => {
  it("matches exact combos and returns the matching binding", () => {
    const registry = createShortcutRegistry(mockBindings);

    const match1 = registry.matchShortcut({
      alt: false,
      ctrlOrMeta: true,
      key: "Enter",
      shift: false,
    });
    expect(match1).not.toBeNull();
    expect(match1?.commandId).toBe("run-code");
    expect(match1?.label).toBe("Ctrl+Enter");

    const match2 = registry.matchShortcut({
      alt: false,
      ctrlOrMeta: true,
      key: ",",
      shift: false,
    });
    expect(match2).not.toBeNull();
    expect(match2?.commandId).toBe("toggle-settings");
  });

  it("returns null for partial or non-matching combos", () => {
    const registry = createShortcutRegistry(mockBindings);

    const match1 = registry.matchShortcut({
      alt: false,
      ctrlOrMeta: false,
      key: "Enter",
      shift: false,
    });
    expect(match1).toBeNull();

    const match2 = registry.matchShortcut({
      alt: false,
      ctrlOrMeta: true,
      key: "Enter",
      shift: true,
    });
    expect(match2).toBeNull();
  });

  it("retrieves binding by command ID using getBinding", () => {
    const registry = createShortcutRegistry(mockBindings);

    const binding = registry.getBinding("run-code");
    expect(binding).toBeDefined();
    expect(binding?.label).toBe("Ctrl+Enter");

    const missing = registry.getBinding("interrupt-execution");
    expect(missing).toBeUndefined();
  });

  it("evaluates when condition if provided", () => {
    const conditionalBinding: ShortcutBinding = {
      combo: { alt: false, ctrlOrMeta: false, key: "Escape", shift: false },
      commandId: "interrupt-execution",
      execute: vi.fn(),
      label: "Escape",
      when: (core) => core.overlays.hasActiveOverlays(),
    };
    const registry = createShortcutRegistry([conditionalBinding]);

    const mockCoreWithOverlays = {
      overlays: { hasActiveOverlays: () => true },
    } as EditorCore;
    const mockCoreWithoutOverlays = {
      overlays: { hasActiveOverlays: () => false },
    } as EditorCore;

    const key = { alt: false, ctrlOrMeta: false, key: "Escape", shift: false };
    expect(registry.matchShortcut(key, mockCoreWithOverlays)).toBe(
      conditionalBinding
    );
    expect(registry.matchShortcut(key, mockCoreWithoutOverlays)).toBeNull();
  });

  it("parses native KeyboardEvent mock to KeyCombo correctly", () => {
    const mockEvent = {
      altKey: false,
      ctrlKey: true,
      key: "Enter",
      metaKey: false,
      shiftKey: false,
    };
    const combo = parseKeyCombo(mockEvent);
    expect(combo).toEqual({
      alt: false,
      ctrlOrMeta: true,
      key: "Enter",
      shift: false,
    });
  });
});

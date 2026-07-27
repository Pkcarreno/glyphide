import { describe, expect, it } from "vitest";
import type { ShortcutBinding } from "./registry.ts";
import { createShortcutRegistry, parseKeyCombo } from "./registry.ts";

const mockBindings: ShortcutBinding[] = [
  {
    action: { type: "RUN_CODE" },
    combo: { alt: false, ctrlOrMeta: true, key: "Enter", shift: false },
    label: "Ctrl+Enter",
  },
  {
    action: { type: "CLEAR_OUTPUT" },
    combo: { alt: false, ctrlOrMeta: true, key: "S", shift: true },
    label: "Ctrl+Shift+S",
  },
];

describe("ShortcutRegistry", () => {
  it("matches exact combos", () => {
    const registry = createShortcutRegistry(mockBindings);

    const match1 = registry.matchShortcut({
      alt: false,
      ctrlOrMeta: true,
      key: "Enter",
      shift: false,
    });
    expect(match1).toEqual({ type: "RUN_CODE" });

    const match2 = registry.matchShortcut({
      alt: false,
      ctrlOrMeta: true,
      key: "S",
      shift: true,
    });
    expect(match2).toEqual({ type: "CLEAR_OUTPUT" });
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

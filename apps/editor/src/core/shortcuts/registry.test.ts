import { describe, expect, it } from "vitest";
import { createShortcutRegistry, parseKeyCombo } from "./registry";
import type { ShortcutBinding } from "./registry";

const mockBindings: ShortcutBinding[] = [
  {
    combo: { key: "Enter", ctrlOrMeta: true, shift: false, alt: false },
    action: { type: "RUN_CODE" },
    label: "Ctrl+Enter",
  },
  {
    combo: { key: "S", ctrlOrMeta: true, shift: true, alt: false },
    action: { type: "CLEAR_OUTPUT" },
    label: "Ctrl+Shift+S",
  },
];

describe("ShortcutRegistry", () => {
  it("matches exact combos", () => {
    const registry = createShortcutRegistry(mockBindings);

    const match1 = registry.matchShortcut({ key: "Enter", ctrlOrMeta: true, shift: false, alt: false });
    expect(match1).toEqual({ type: "RUN_CODE" });

    const match2 = registry.matchShortcut({ key: "S", ctrlOrMeta: true, shift: true, alt: false });
    expect(match2).toEqual({ type: "CLEAR_OUTPUT" });
  });

  it("returns null for partial or non-matching combos", () => {
    const registry = createShortcutRegistry(mockBindings);

    const match1 = registry.matchShortcut({ key: "Enter", ctrlOrMeta: false, shift: false, alt: false });
    expect(match1).toBeNull();

    const match2 = registry.matchShortcut({ key: "Enter", ctrlOrMeta: true, shift: true, alt: false });
    expect(match2).toBeNull();
  });

  it("parses native KeyboardEvent mock to KeyCombo correctly", () => {
    const mockEvent = { key: "Enter", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false };
    const combo = parseKeyCombo(mockEvent);
    expect(combo).toEqual({ key: "Enter", ctrlOrMeta: true, shift: false, alt: false });
  });
});

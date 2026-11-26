import type { ConsoleToken } from "@glyphide/quickjs-engine/types";
import { createRoot, createSignal, flush } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import type {
  ConsoleVariant,
  OutputFormatter,
} from "../core/engine/output-formatter.ts";
import type { OutputEntry } from "../core/models/output.ts";
import { createConsoleProjection } from "./console-projection.ts";

function makeEntry(id: number, type: string, data: unknown): OutputEntry {
  return {
    data,
    id,
    timestamp: id * 10,
    type,
  };
}

function createTokenFormatter(
  spy?: (entry: OutputEntry) => void
): OutputFormatter {
  return {
    format(entry) {
      spy?.(entry);
      if (Array.isArray(entry.data)) {
        return {
          tokens: entry.data as ConsoleToken[],
          variant: entry.type as ConsoleVariant,
        };
      }
      return {
        text: String(entry.data ?? ""),
        variant: entry.type as ConsoleVariant,
      };
    },
  };
}

function setupProjection(
  initialEntries: readonly OutputEntry[],
  formatter?: OutputFormatter
) {
  const [entries, setEntries] =
    createSignal<readonly OutputEntry[]>(initialEntries);
  let dispose!: () => void;
  const projection = createRoot((disposeRoot) => {
    dispose = disposeRoot;
    return createConsoleProjection({
      entries,
      formatter: formatter ? () => formatter : undefined,
    });
  });

  return { dispose, projection, setEntries };
}

describe("createConsoleProjection", () => {
  it("formats entries with defaultFormat when no formatter is provided and bypasses formatter for system and string error entries", () => {
    const formatSpy = vi.fn();
    const formatter = createTokenFormatter(formatSpy);
    const initialEntries = [
      makeEntry(0, "system", "Engine ready."),
      makeEntry(1, "error", "ReferenceError: x is not defined"),
      makeEntry(2, "error", [
        { message: "Boom", name: "TypeError", type: "error" },
      ]),
      makeEntry(3, "log", [{ type: "number", value: 42 }]),
    ];

    const custom = setupProjection(initialEntries, formatter);
    const items = custom.projection.visibleItems();
    expect(items).toHaveLength(4);
    expect(items[0].rendered).toEqual({
      text: "Engine ready.",
      variant: "system",
    });
    expect(items[1].rendered).toEqual({
      text: "ReferenceError: x is not defined",
      variant: "error",
    });
    expect(items[2].rendered).toEqual({
      tokens: [{ message: "Boom", name: "TypeError", type: "error" }],
      variant: "error",
    });
    expect(items[3].rendered).toEqual({
      tokens: [{ type: "number", value: 42 }],
      variant: "log",
    });
    expect(formatSpy).toHaveBeenCalledTimes(2);
    custom.dispose();

    const fallback = setupProjection(initialEntries);
    expect(fallback.projection.visibleItems()[3].rendered).toEqual({
      text: "[object Object]",
      variant: "log",
    });
    fallback.dispose();
  });

  it("incrementally formats and flattens only appended entries without mutating prior arrays", () => {
    const formatSpy = vi.fn();
    const formatter = createTokenFormatter(formatSpy);

    const entry0 = makeEntry(0, "group", [{ type: "string", value: "Batch" }]);
    const entry1 = makeEntry(1, "log", "first");
    const entry2 = makeEntry(2, "log", "second");
    const entry3 = makeEntry(3, "groupEnd", undefined);
    const entry4 = makeEntry(4, "log", "outside");

    const { dispose, projection, setEntries } = setupProjection(
      [entry0, entry1],
      formatter
    );

    const firstItems = projection.visibleItems();
    expect(firstItems).toHaveLength(2);
    expect(firstItems[0].depth).toBe(0);
    expect(firstItems[1].depth).toBe(1);
    expect(formatSpy).toHaveBeenCalledTimes(2);

    formatSpy.mockClear();
    setEntries([entry0, entry1, entry2, entry3, entry4]);
    flush();

    const secondItems = projection.visibleItems();
    // Previous array snapshot must remain untouched.
    expect(firstItems).toHaveLength(2);
    expect(secondItems).toHaveLength(4);
    expect(secondItems[0]).toBe(firstItems[0]);
    expect(secondItems[1]).toBe(firstItems[1]);
    expect(secondItems[2].depth).toBe(1);
    expect(secondItems[2].rendered.text).toBe("second");
    expect(secondItems[3].depth).toBe(0);
    expect(secondItems[3].rendered.text).toBe("outside");
    // Only the 3 newly appended entries should be formatted.
    expect(formatSpy).toHaveBeenCalledTimes(3);

    dispose();
  });

  it("omits incremental appends inside a collapsed group while updating stack on groupEnd", () => {
    const formatter = createTokenFormatter();

    const group = makeEntry(0, "groupCollapsed", [
      { type: "string", value: "Collapsed" },
    ]);
    const inside1 = makeEntry(1, "log", "hidden-1");
    const inside2 = makeEntry(2, "log", "hidden-2");
    const end = makeEntry(3, "groupEnd", undefined);
    const after = makeEntry(4, "log", "visible-after");

    const { dispose, projection, setEntries } = setupProjection(
      [group, inside1],
      formatter
    );

    const beforeAppend = projection.visibleItems();
    expect(beforeAppend).toHaveLength(1);
    expect(beforeAppend[0].isCollapsed).toBe(true);

    setEntries([group, inside1, inside2]);
    flush();
    expect(projection.visibleItems()).toBe(beforeAppend);

    setEntries([group, inside1, inside2, end, after]);
    flush();
    const afterEnd = projection.visibleItems();
    expect(afterEnd).toHaveLength(2);
    expect(afterEnd[1].depth).toBe(0);
    expect(afterEnd[1].rendered.text).toBe("visible-after");

    dispose();
  });

  it("handles buffer clear, tail truncation, and front truncation without leaking stale toggles", () => {
    const formatSpy = vi.fn();
    const formatter = createTokenFormatter(formatSpy);

    const groupA = makeEntry(0, "group", [{ type: "string", value: "A" }]);
    const logA = makeEntry(1, "log", "inside-a");
    const endA = makeEntry(2, "groupEnd", undefined);
    const groupB = makeEntry(3, "group", [{ type: "string", value: "B" }]);
    const logB = makeEntry(4, "log", "inside-b");

    const { dispose, projection, setEntries } = setupProjection(
      [groupA, logA, endA, groupB, logB],
      formatter
    );

    expect(projection.visibleItems()).toHaveLength(4);
    projection.toggleGroup(0);
    flush();
    expect(projection.visibleItems().map((item) => item.entry)).toEqual([
      groupA,
      groupB,
      logB,
    ]);

    // Front truncation drops groupA..endA; stale toggle on index 0 must not collapse groupB.
    formatSpy.mockClear();
    const logAfterB = makeEntry(5, "log", "after-b");
    setEntries([groupB, logB, logAfterB]);
    flush();

    const afterFrontTrim = projection.visibleItems();
    expect(afterFrontTrim.map((item) => item.entry)).toEqual([
      groupB,
      logB,
      logAfterB,
    ]);
    expect(afterFrontTrim[0].isCollapsed).toBe(false);
    expect(afterFrontTrim[1].depth).toBe(1);
    // Surviving entries reuse formatted cache; only logAfterB is newly formatted.
    expect(formatSpy).toHaveBeenCalledTimes(1);

    // Tail truncation reuses prefix without reformatting.
    formatSpy.mockClear();
    setEntries([groupB, logB]);
    flush();
    expect(projection.visibleItems()).toHaveLength(2);
    expect(formatSpy).not.toHaveBeenCalled();

    // Clear produces empty output.
    setEntries([]);
    flush();
    expect(projection.visibleItems()).toEqual([]);

    dispose();
  });

  it("toggles groups, preserves sibling item identity, and restores defaults on reset", () => {
    const formatter = createTokenFormatter();

    const group = makeEntry(0, "group", [{ type: "string", value: "Section" }]);
    const child = makeEntry(1, "log", "child");
    const end = makeEntry(2, "groupEnd", undefined);
    const sibling = makeEntry(3, "log", "sibling");

    const { dispose, projection } = setupProjection(
      [group, child, end, sibling],
      formatter
    );

    const initialItems = projection.visibleItems();
    expect(initialItems).toHaveLength(3);
    expect(initialItems[0].isCollapsed).toBe(false);
    const [, , siblingItem] = initialItems;

    projection.toggleGroup(0);
    flush();
    const collapsedItems = projection.visibleItems();
    expect(collapsedItems).toHaveLength(2);
    expect(collapsedItems[0].isCollapsed).toBe(true);
    expect(collapsedItems[1]).toBe(siblingItem);

    // Unknown id is a safe no-op.
    projection.toggleGroup(99);
    flush();
    expect(projection.visibleItems()).toHaveLength(2);

    projection.reset();
    flush();
    const resetItems = projection.visibleItems();
    expect(resetItems).toHaveLength(3);
    expect(resetItems[0].isCollapsed).toBe(false);
    expect(resetItems[2]).toBe(siblingItem);

    dispose();
  });

  it("handles nested groups and preserves inner toggle state when outer group collapses and expands", () => {
    const formatter = createTokenFormatter();

    const outer = makeEntry(0, "group", [{ type: "string", value: "Outer" }]);
    const outerLog = makeEntry(1, "log", "outer-log");
    const inner = makeEntry(2, "group", [{ type: "string", value: "Inner" }]);
    const innerLog = makeEntry(3, "log", "inner-log");
    const innerEnd = makeEntry(4, "groupEnd", undefined);
    const outerEnd = makeEntry(5, "groupEnd", undefined);
    const topLog = makeEntry(6, "log", "top-log");

    const { dispose, projection } = setupProjection(
      [outer, outerLog, inner, innerLog, innerEnd, outerEnd, topLog],
      formatter
    );

    expect(projection.visibleItems().map((item) => item.depth)).toEqual([
      0, 1, 1, 2, 0,
    ]);

    // Collapse inner group first.
    projection.toggleGroup(2);
    flush();
    expect(projection.visibleItems().map((item) => item.entry)).toEqual([
      outer,
      outerLog,
      inner,
      topLog,
    ]);

    // Collapse outer group; inner and outerLog both hide.
    projection.toggleGroup(0);
    flush();
    expect(projection.visibleItems().map((item) => item.entry)).toEqual([
      outer,
      topLog,
    ]);

    // Re-expand outer group; inner remains collapsed.
    projection.toggleGroup(0);
    flush();
    expect(projection.visibleItems().map((item) => item.entry)).toEqual([
      outer,
      outerLog,
      inner,
      topLog,
    ]);
    expect(projection.visibleItems()[2].isCollapsed).toBe(true);

    dispose();
  });

  it("supports groupCollapsed initial state, expansion on toggle, and re-collapse on reset", () => {
    const formatter = createTokenFormatter();

    const collapsedGroup = makeEntry(0, "groupCollapsed", [
      { type: "string", value: "Details" },
    ]);
    const hiddenChild = makeEntry(1, "log", "secret");
    const end = makeEntry(2, "groupEnd", undefined);

    const { dispose, projection } = setupProjection(
      [collapsedGroup, hiddenChild, end],
      formatter
    );

    expect(projection.visibleItems()).toHaveLength(1);
    expect(projection.visibleItems()[0].isCollapsed).toBe(true);

    projection.toggleGroup(0);
    flush();
    expect(projection.visibleItems()).toHaveLength(2);
    expect(projection.visibleItems()[0].isCollapsed).toBe(false);
    expect(projection.visibleItems()[1].depth).toBe(1);
    expect(projection.visibleItems()[1].rendered.text).toBe("secret");

    projection.reset();
    flush();
    expect(projection.visibleItems()).toHaveLength(1);
    expect(projection.visibleItems()[0].isCollapsed).toBe(true);

    dispose();
  });
});

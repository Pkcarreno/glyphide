import type { ConsoleToken } from "@glyphide/quickjs-engine/types";
import { describe, expect, it } from "vitest";
import type {
  ConsoleVariant,
  RenderedOutput,
} from "../core/engine/output-formatter.ts";
import type { OutputEntry } from "../core/models/output.ts";
import { flattenConsoleEntries } from "./console-hierarchy.ts";

describe("flattenConsoleEntries", () => {
  const mockEntry = {} as OutputEntry;

  function makeItem(
    variant: ConsoleVariant,
    tokens?: ConsoleToken[]
  ): { entry: OutputEntry; rendered: RenderedOutput } {
    return {
      entry: mockEntry,
      rendered: { variant, tokens: tokens ?? [] },
    };
  }

  it("flattens basic entries with zero depth", () => {
    const entries = [makeItem("log"), makeItem("error")];
    const result = flattenConsoleEntries(entries, () => false);

    expect(result.length).toBe(2);
    expect(result[0].depth).toBe(0);
    expect(result[1].depth).toBe(0);
    expect(result[0].isGroup).toBe(false);
  });

  it("assigns correct depth inside groups", () => {
    const entries = [
      makeItem("group"),
      makeItem("log"),
      makeItem("group"),
      makeItem("log"),
      makeItem("groupEnd"),
      makeItem("log"),
      makeItem("groupEnd"),
    ];
    const result = flattenConsoleEntries(entries, () => false);

    expect(result.length).toBe(5);
    expect(result[0].depth).toBe(0); // group
    expect(result[1].depth).toBe(1); // log
    expect(result[2].depth).toBe(1); // nested group
    expect(result[3].depth).toBe(2); // log
    expect(result[4].depth).toBe(1); // log after groupEnd
  });

  it("skips groupEnd entries from the visible list", () => {
    const entries = [makeItem("group"), makeItem("log"), makeItem("groupEnd")];
    const result = flattenConsoleEntries(entries, () => false);

    expect(result.length).toBe(2);
    expect(result[0].rendered.variant).toBe("group");
    expect(result[1].rendered.variant).toBe("log");
  });

  it("hides items inside collapsed groups", () => {
    const entries = [
      makeItem("group"), // id: 0
      makeItem("log"), // id: 1
      makeItem("groupEnd"),
    ];

    // Group at id 0 is collapsed
    const result = flattenConsoleEntries(entries, (_id) => _id === 0);

    expect(result.length).toBe(1);
    expect(result[0].rendered.variant).toBe("group");
    expect(result[0].isCollapsed).toBe(true);
  });

  it("supports groupCollapsed starting state", () => {
    const entries = [
      makeItem("groupCollapsed"), // id: 0
      makeItem("log"), // id: 1
    ];

    // User hasn't toggled it, so startsCollapsed = true propagates
    const result = flattenConsoleEntries(
      entries,
      (_id, startsCollapsed) => startsCollapsed
    );

    expect(result.length).toBe(1);
    expect(result[0].rendered.variant).toBe("groupCollapsed");
  });

  it("unclosed groups keep their children", () => {
    const entries = [makeItem("group"), makeItem("log")];
    const result = flattenConsoleEntries(entries, () => false);

    expect(result.length).toBe(2);
    expect(result[1].depth).toBe(1);
  });

  it("supports incremental flattening using startIndex", () => {
    const entries = [makeItem("group"), makeItem("log"), makeItem("error")];
    const result = flattenConsoleEntries(entries.slice(0, 2), () => false);

    expect(result.length).toBe(2);
    expect(result[1].depth).toBe(1);

    // Incrementally add the third item
    const incrementalResult = flattenConsoleEntries(
      entries,
      () => false,
      2, // startIndex
      result, // pass existing visibleItems
      [{ id: 0, hidden: false }] // manually passing the groupStack state
    );

    expect(incrementalResult.length).toBe(3);
    expect(incrementalResult[2].depth).toBe(1); // Should still be in the group
    expect(incrementalResult[2].rendered.variant).toBe("error");
  });
});

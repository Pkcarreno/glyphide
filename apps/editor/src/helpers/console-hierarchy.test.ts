import { describe, expect, it } from "vitest";
import type { RenderedOutput } from "../core/engine/output-formatter.ts";
import type { OutputEntry } from "../core/models/output.ts";
import {
  buildConsoleHierarchy,
  type ConsoleGroupNode,
  type ConsoleLeafNode,
} from "./console-hierarchy.ts";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let idCounter = 0;

function makeEntry(type: string): OutputEntry {
  return { id: idCounter++, type, data: [], timestamp: 0 };
}

function makeRendered(
  variant: RenderedOutput["variant"],
  tokens: RenderedOutput["tokens"] = []
): RenderedOutput {
  return { variant, tokens };
}

function makeItem(
  variant: RenderedOutput["variant"],
  tokens: RenderedOutput["tokens"] = []
) {
  return { entry: makeEntry(variant), rendered: makeRendered(variant, tokens) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildConsoleHierarchy", () => {
  describe("flat entries — no grouping", () => {
    it("returns leaf nodes for non-group entries", () => {
      const result = buildConsoleHierarchy([
        makeItem("log"),
        makeItem("warn"),
        makeItem("error"),
      ]);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ type: "leaf" });
      expect(result[1]).toMatchObject({ type: "leaf" });
      expect(result[2]).toMatchObject({ type: "leaf" });
    });

    it("returns empty array for empty input", () => {
      expect(buildConsoleHierarchy([])).toEqual([]);
    });
  });

  describe("basic group", () => {
    it("produces a group node with leaf children", () => {
      const result = buildConsoleHierarchy([
        makeItem("group", [{ type: "string", value: "my group" }]),
        makeItem("log"),
        makeItem("warn"),
        makeItem("groupEnd"),
      ]);

      expect(result).toHaveLength(1);
      const group = result[0] as ConsoleGroupNode;
      expect(group.type).toBe("group");
      expect(group.collapsed).toBe(false);
      expect(group.label).toEqual([{ type: "string", value: "my group" }]);
      expect(group.children).toHaveLength(2);
      expect(group.children[0]).toMatchObject({ type: "leaf" });
      expect(group.children[1]).toMatchObject({ type: "leaf" });
    });

    it("allows entries before and after a group at the root level", () => {
      const result = buildConsoleHierarchy([
        makeItem("log"),
        makeItem("group"),
        makeItem("log"),
        makeItem("groupEnd"),
        makeItem("log"),
      ]);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ type: "leaf" });
      expect(result[1]).toMatchObject({ type: "group" });
      expect(result[2]).toMatchObject({ type: "leaf" });
      expect((result[1] as ConsoleGroupNode).children).toHaveLength(1);
    });
  });

  describe("nested groups", () => {
    it("nests a group inside another group", () => {
      const result = buildConsoleHierarchy([
        makeItem("group", [{ type: "string", value: "outer" }]),
        makeItem("log"),
        makeItem("group", [{ type: "string", value: "inner" }]),
        makeItem("log"),
        makeItem("groupEnd"),
        makeItem("log"),
        makeItem("groupEnd"),
      ]);

      expect(result).toHaveLength(1);
      const outer = result[0] as ConsoleGroupNode;
      expect(outer.label).toEqual([{ type: "string", value: "outer" }]);
      expect(outer.children).toHaveLength(3); // log, inner group, log

      const inner = outer.children[1] as ConsoleGroupNode;
      expect(inner.type).toBe("group");
      expect(inner.label).toEqual([{ type: "string", value: "inner" }]);
      expect(inner.children).toHaveLength(1);
    });

    it("handles deeply nested groups", () => {
      const depth = 5;
      const items = [
        ...Array.from({ length: depth }, () => makeItem("group")),
        makeItem("log"),
        ...Array.from({ length: depth }, () => makeItem("groupEnd")),
      ];

      const result = buildConsoleHierarchy(items);

      // Walk down the nesting to find the leaf
      let current = result;
      for (let i = 0; i < depth; i++) {
        expect(current).toHaveLength(1);
        expect(current[0]).toMatchObject({ type: "group" });
        current = (current[0] as ConsoleGroupNode).children;
      }
      expect(current).toHaveLength(1);
      expect(current[0]).toMatchObject({ type: "leaf" });
    });
  });

  describe("groupCollapsed", () => {
    it("produces a group node with collapsed=true", () => {
      const result = buildConsoleHierarchy([
        makeItem("groupCollapsed", [{ type: "string", value: "hidden" }]),
        makeItem("log"),
        makeItem("groupEnd"),
      ]);

      expect(result).toHaveLength(1);
      const group = result[0] as ConsoleGroupNode;
      expect(group.type).toBe("group");
      expect(group.collapsed).toBe(true);
      expect(group.label).toEqual([{ type: "string", value: "hidden" }]);
    });

    it("collapsed=false for regular group, collapsed=true for groupCollapsed", () => {
      const result = buildConsoleHierarchy([
        makeItem("group"),
        makeItem("groupEnd"),
        makeItem("groupCollapsed"),
        makeItem("groupEnd"),
      ]);

      expect((result[0] as ConsoleGroupNode).collapsed).toBe(false);
      expect((result[1] as ConsoleGroupNode).collapsed).toBe(true);
    });
  });

  describe("groupEnd edge cases", () => {
    it("groupEnd without open group is a no-op", () => {
      const result = buildConsoleHierarchy([
        makeItem("log"),
        makeItem("groupEnd"),
        makeItem("log"),
      ]);

      expect(result).toHaveLength(2);
      for (const n of result) {
        expect(n).toMatchObject({ type: "leaf" });
      }
    });

    it("multiple groupEnd calls beyond stack depth are all no-ops", () => {
      const result = buildConsoleHierarchy([
        makeItem("group"),
        makeItem("log"),
        makeItem("groupEnd"),
        makeItem("groupEnd"), // surplus — no-op
        makeItem("groupEnd"), // surplus — no-op
        makeItem("log"),
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ type: "group" });
      expect(result[1]).toMatchObject({ type: "leaf" });
    });
  });

  describe("unclosed groups", () => {
    it("unclosed group retains its children", () => {
      const result = buildConsoleHierarchy([
        makeItem("group", [{ type: "string", value: "never closed" }]),
        makeItem("log"),
        makeItem("log"),
        // no groupEnd
      ]);

      expect(result).toHaveLength(1);
      const group = result[0] as ConsoleGroupNode;
      expect(group.label).toEqual([{ type: "string", value: "never closed" }]);
      expect(group.children).toHaveLength(2);
    });

    it("multiple unclosed groups produce nested structure", () => {
      const result = buildConsoleHierarchy([
        makeItem("group"),
        makeItem("group"),
        makeItem("log"),
        // both unclosed
      ]);

      expect(result).toHaveLength(1);
      const outer = result[0] as ConsoleGroupNode;
      expect(outer.children).toHaveLength(1);
      const inner = outer.children[0] as ConsoleGroupNode;
      expect(inner.type).toBe("group");
      expect(inner.children).toHaveLength(1);
    });
  });

  describe("empty group", () => {
    it("group immediately followed by groupEnd has zero children", () => {
      const result = buildConsoleHierarchy([
        makeItem("group"),
        makeItem("groupEnd"),
      ]);

      expect(result).toHaveLength(1);
      const group = result[0] as ConsoleGroupNode;
      expect(group.children).toHaveLength(0);
    });
  });

  describe("group label tokens", () => {
    it("captures multiple label tokens from group arguments", () => {
      const tokens = [
        { type: "string" as const, value: "hello" },
        { type: "number" as const, value: 42 },
      ];

      const result = buildConsoleHierarchy([
        makeItem("group", tokens),
        makeItem("groupEnd"),
      ]);

      expect((result[0] as ConsoleGroupNode).label).toEqual(tokens);
    });

    it("group with no label has empty token array", () => {
      const result = buildConsoleHierarchy([
        makeItem("group", []),
        makeItem("groupEnd"),
      ]);

      expect((result[0] as ConsoleGroupNode).label).toEqual([]);
    });
  });

  describe("mixed entries", () => {
    it("handles complex sequence: ungrouped + groups + ungrouped", () => {
      const result = buildConsoleHierarchy([
        makeItem("log"), // root leaf 0
        makeItem("group"), // root group 1
        makeItem("warn"), //   child leaf
        makeItem("groupEnd"),
        makeItem("error"), // root leaf 2
      ]);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ type: "leaf" });
      expect((result[0] as ConsoleLeafNode).rendered.variant).toBe("log");
      expect(result[1]).toMatchObject({ type: "group" });
      expect(result[2]).toMatchObject({ type: "leaf" });
      expect((result[2] as ConsoleLeafNode).rendered.variant).toBe("error");
    });

    it("preserves entry reference on leaf nodes", () => {
      const item = makeItem("log");
      const result = buildConsoleHierarchy([item]);

      const leaf = result[0] as ConsoleLeafNode;
      expect(leaf.entry).toBe(item.entry);
      expect(leaf.rendered).toBe(item.rendered);
    });

    it("preserves entry reference on group nodes", () => {
      const groupItem = makeItem("group");
      const result = buildConsoleHierarchy([groupItem, makeItem("groupEnd")]);

      const group = result[0] as ConsoleGroupNode;
      expect(group.entry).toBe(groupItem.entry);
    });
  });
});

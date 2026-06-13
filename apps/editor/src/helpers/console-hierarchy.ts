import type { ConsoleToken } from "@glyphide/quickjs-engine/types";
import type { RenderedOutput } from "../core/engine/output-formatter.ts";
import type { OutputEntry } from "../core/models/output.ts";

/** A leaf node: a single non-group console entry. */
export interface ConsoleLeafNode {
  entry: OutputEntry;
  rendered: RenderedOutput;
  type: "leaf";
}

/**
 * A group node produced by `console.group` or `console.groupCollapsed`.
 * Children are accumulated until the matching `groupEnd` (or end of input).
 */
export interface ConsoleGroupNode {
  children: ConsoleNode[];
  /** True when created by `console.groupCollapsed` — starts collapsed in the UI. */
  collapsed: boolean;
  entry: OutputEntry;
  /** Tokenized label arguments passed to `console.group(...)`. Empty when called with no args. */
  label: ConsoleToken[];
  type: "group";
}

/** Discriminated union of all node types in the console hierarchy tree. */
export type ConsoleNode = ConsoleLeafNode | ConsoleGroupNode;

/**
 * Transforms a flat list of formatted console entries into a tree of `ConsoleNode[]`.
 *
 * Algorithm:
 * - `group` / `groupCollapsed` variants push a new group node onto the stack.
 * - `groupEnd` pops the stack. If the stack is empty it is a no-op (WHATWG spec).
 * - All other variants are appended as leaf nodes to the current stack top,
 *   or to the root list if no group is open.
 * - Unclosed groups at the end of input remain in the tree with their accumulated children.
 *
 * This is a pure function with no side effects — safe to call inside a reactive memo.
 */
export function buildConsoleHierarchy(
  formattedEntries: ReadonlyArray<{
    entry: OutputEntry;
    rendered: RenderedOutput;
  }>
): ConsoleNode[] {
  const rootNodes: ConsoleNode[] = [];
  const activeGroupStack: ConsoleGroupNode[] = [];

  /** Returns the children list of the current stack top, or root if stack is empty. */
  function getActiveGroupChildren(): ConsoleNode[] {
    return activeGroupStack.at(-1)?.children ?? rootNodes;
  }

  for (const { entry, rendered } of formattedEntries) {
    const consoleVariant = rendered.variant;

    if (consoleVariant === "group" || consoleVariant === "groupCollapsed") {
      const groupTokens = rendered.tokens ?? [];
      const newGroupNode: ConsoleGroupNode = {
        type: "group",
        label: groupTokens as ConsoleToken[],
        collapsed: consoleVariant === "groupCollapsed",
        children: [],
        entry,
      };
      getActiveGroupChildren().push(newGroupNode);
      activeGroupStack.push(newGroupNode);
      continue;
    }

    if (consoleVariant === "groupEnd") {
      // WHATWG: no-op when no group is open
      if (activeGroupStack.length > 0) {
        activeGroupStack.pop();
      }
      continue;
    }

    const newLeafNode: ConsoleLeafNode = { type: "leaf", entry, rendered };
    getActiveGroupChildren().push(newLeafNode);
  }

  return rootNodes;
}

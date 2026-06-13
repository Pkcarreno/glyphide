import Trash2 from "lucide-solid/icons/trash-2";
import type { JSX } from "solid-js";
import { createMemo, For, splitProps } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import type { ConsoleVariant } from "../../core/engine/output-formatter.ts";
import {
  defaultFormat,
  isConsoleTokenArray,
} from "../../core/engine/output-formatter.ts";
import type { OutputEntry } from "../../core/models/output.ts";
import { cn } from "../../helpers/cn.ts";
import {
  buildConsoleHierarchy,
  type ConsoleNode,
} from "../../helpers/console-hierarchy.ts";
import { ConsoleTableView } from "../atoms/ConsoleTableView.tsx";
import { Icon } from "../atoms/Icon.tsx";
import { ConsoleGroupView } from "../molecules/ConsoleGroupView.tsx";
import { ConsoleMessage } from "../molecules/ConsoleMessage.tsx";
import { ConsoleTokenView } from "../molecules/ConsoleTokenView/ConsoleTokenView.tsx";

/**
 * Subset of `ConsoleVariant` values that `ConsoleMessage` can render.
 * Group control variants (group/groupCollapsed/groupEnd) are handled
 * by `ConsoleGroupView` and never passed to `ConsoleMessage`.
 */
type MessageVariant = Exclude<
  ConsoleVariant,
  "group" | "groupCollapsed" | "groupEnd"
>;

/**
 * Props for the ConsolePane component.
 */
interface ConsolePaneProps extends JSX.HTMLAttributes<HTMLElement> {
  class?: string;
}

/**
 * Output console organism.
 * Resolves the active engine's `outputFormatter` reactively and applies it to
 * each `OutputEntry`. System and error entries emitted by the EngineModel or
 * Orchestrator always bypass the engine formatter and use `defaultFormat`.
 *
 * Groups produced by `console.group` / `console.groupCollapsed` are rendered
 * as collapsible `ConsoleGroupView` nodes via `buildConsoleHierarchy`.
 */
function ConsolePane(props: ConsolePaneProps) {
  const [local, rest] = splitProps(props, ["class"]);
  const core = useEditor();

  function handleClear() {
    core.dispatcher.dispatch({ type: "CLEAR_OUTPUT" });
  }

  /**
   * Returns the formatter for the currently active engine, if any.
   * Reading `activeEngineId()` inside a reactive context tracks updates.
   */
  function getFormatter() {
    try {
      const engineDefinition = core.engineRegistry.getDefinition(
        core.engine.activeEngineId()
      );
      return engineDefinition.outputFormatter;
    } catch {
      return;
    }
  }

  /**
   * Formats a single entry using the active engine's formatter (or default).
   * System and string-data error entries always bypass the engine formatter.
   */
  function formatEntry(entry: OutputEntry) {
    const isBypassEntry =
      entry.type === "system" ||
      (entry.type === "error" && typeof entry.data === "string");

    return isBypassEntry
      ? defaultFormat(entry)
      : (getFormatter()?.format(entry) ?? defaultFormat(entry));
  }

  /**
   * Reactive memo: formats all entries then builds the console hierarchy tree.
   * Recomputes whenever `core.output.entries()` changes.
   */
  const hierarchy = createMemo(() =>
    buildConsoleHierarchy(
      core.output.entries().map((entry) => ({
        entry,
        rendered: formatEntry(entry),
      }))
    )
  );

  /** Recursively renders a single ConsoleNode (leaf or group). */
  function renderNode(node: ConsoleNode): JSX.Element {
    if (node.type === "group") {
      return <ConsoleGroupView node={node} renderNode={renderNode} />;
    }

    const { rendered } = node;
    // buildConsoleHierarchy guarantees group-type variants are never leaf nodes.
    // Cast is safe: group/groupCollapsed/groupEnd entries become group tree nodes.
    const variant = rendered.variant as MessageVariant;

    if (rendered.tokens && isConsoleTokenArray(rendered.tokens)) {
      if (variant === "table" && rendered.tokens.length > 0) {
        return (
          <ConsoleMessage type={variant}>
            <ConsoleTableView token={rendered.tokens[0]} />
            {rendered.tokens.length > 1 && (
              <ConsoleTokenView tokens={rendered.tokens.slice(1)} />
            )}
          </ConsoleMessage>
        );
      }

      return (
        <ConsoleMessage class="whitespace-pre-wrap" type={variant}>
          <ConsoleTokenView tokens={rendered.tokens} />
        </ConsoleMessage>
      );
    }

    return (
      <ConsoleMessage
        class="whitespace-pre-wrap"
        message={rendered.text ?? ""}
        type={variant}
      />
    );
  }

  return (
    <section
      class={cn(
        "flex h-full w-full flex-col overflow-hidden bg-surface",
        local.class
      )}
      {...rest}
    >
      <div class="flex shrink-0 items-center justify-between border-outline-variant border-b px-4 py-1.5">
        <h2 class="select-none font-bold font-sans text-on-surface-variant text-section-header uppercase tracking-widest">
          Output
        </h2>
        <div class="flex items-center gap-1">
          <button
            class="flex cursor-pointer items-center gap-1 rounded-sm border border-transparent px-1.5 py-0.5 font-medium text-on-surface-variant text-status-bar uppercase tracking-wider transition-colors hover:border-outline-variant hover:bg-surface-variant hover:text-on-surface"
            onClick={handleClear}
            type="button"
          >
            <Icon icon={Trash2} size={10} />
            Clear
          </button>
        </div>
      </div>

      <div class="flex flex-1 flex-col overflow-auto py-2">
        <For each={hierarchy()}>{(node) => renderNode(node)}</For>
      </div>
    </section>
  );
}

export { ConsolePane, type ConsolePaneProps };

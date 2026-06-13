import ChevronDown from "lucide-solid/icons/chevron-down";
import ChevronRight from "lucide-solid/icons/chevron-right";
import type { JSX } from "solid-js";
import { createSignal, Show } from "solid-js";
import { cn } from "../../helpers/cn.ts";
import { Icon } from "./Icon.tsx";

interface ExpandableNodeProps {
  /** Content shown in the expanded state. */
  children: JSX.Element;
  class?: string;
  /** When true, the node starts in the expanded state. Defaults to false. */
  defaultExpanded?: boolean;
  /** Inline content shown as the toggle trigger / collapsed preview. */
  preview: JSX.Element;
}

/**
 * Atom that renders a chevron-toggled expandable node.
 *
 * Used by both token collection rendering (arrays, objects, maps, sets) and
 * console group rendering to provide visual consistency between the two.
 * The `defaultExpanded` prop controls the initial toggle state — e.g.
 * `console.groupCollapsed` sets it to `false`, `console.group` to `true`.
 */
function ExpandableNode(props: ExpandableNodeProps) {
  const [isExpanded, setIsExpanded] = createSignal(
    props.defaultExpanded ?? false
  );

  return (
    <span class={cn("inline-flex flex-col align-top", props.class)}>
      <button
        class="-ml-1 inline-flex cursor-pointer items-center gap-1 rounded px-1 transition-colors hover:bg-surface-variant/50"
        onClick={() => setIsExpanded(!isExpanded())}
        type="button"
      >
        <span class="text-on-surface-variant opacity-70">
          <Icon icon={isExpanded() ? ChevronDown : ChevronRight} size={12} />
        </span>
        {props.preview}
      </button>
      <Show when={isExpanded()}>
        <span class="mt-1 ml-1.5 flex flex-col gap-1 border-outline-variant/30 border-l pl-4">
          {props.children}
        </span>
      </Show>
    </span>
  );
}

export { ExpandableNode, type ExpandableNodeProps };

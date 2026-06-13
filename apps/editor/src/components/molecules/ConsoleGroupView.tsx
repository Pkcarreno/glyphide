import { For, Show } from "solid-js";
import type {
  ConsoleGroupNode,
  ConsoleNode,
} from "../../helpers/console-hierarchy.ts";
import { ExpandableNode } from "../atoms/ExpandableNode.tsx";
import { ConsoleTokenView } from "./ConsoleTokenView/ConsoleTokenView.tsx";

interface ConsoleGroupViewProps {
  node: ConsoleGroupNode;
  /** Recursive renderer for child nodes — passed in to avoid circular module deps. */
  renderNode: (node: ConsoleNode) => import("solid-js").JSX.Element;
}

/**
 * Molecule that renders a `ConsoleGroupNode`.
 *
 * Reuses `ExpandableNode` for visual consistency with object/array expansion:
 * same chevron toggle, same indented border-l children layout.
 *
 * - `node.collapsed === false` → group starts expanded (`console.group`)
 * - `node.collapsed === true`  → group starts collapsed (`console.groupCollapsed`)
 * Toggle state is local and persists while the component is mounted.
 */
function ConsoleGroupView(props: ConsoleGroupViewProps) {
  const hasLabel = () => props.node.label.length > 0;

  const preview = (
    <span class="inline-flex items-baseline gap-1.5 font-mono text-on-surface-variant text-sm">
      <Show
        fallback={<span class="italic opacity-50">&lt;no label&gt;</span>}
        when={hasLabel()}
      >
        <ConsoleTokenView tokens={props.node.label} />
      </Show>
    </span>
  );

  return (
    <div class="border-transparent border-l-2 px-2 py-0.5">
      <ExpandableNode defaultExpanded={!props.node.collapsed} preview={preview}>
        <For each={props.node.children}>
          {(child) => props.renderNode(child)}
        </For>
      </ExpandableNode>
    </div>
  );
}

export { ConsoleGroupView, type ConsoleGroupViewProps };

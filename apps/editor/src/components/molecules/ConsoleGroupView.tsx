import type { VoidProps } from "solid-js";
import { Show } from "solid-js";
import type { FlatConsoleItem } from "../../helpers/console-hierarchy.ts";
import { ExpandableTrigger } from "../atoms/ExpandableNode.tsx";
import { ConsoleTokenView } from "./ConsoleTokenView/ConsoleTokenView.tsx";

interface ConsoleGroupViewProps {
  item: FlatConsoleItem;
  onToggle: () => void;
}

/**
 * Molecule that renders a group label header.
 * Since the tree is flattened for the VirtualList, this component no longer
 * manages or renders its own children. It only triggers the toggle event.
 */
function ConsoleGroupView(props: VoidProps<ConsoleGroupViewProps>) {
  const hasLabel = () =>
    props.item.groupLabel ? props.item.groupLabel.length > 0 : false;
  const isExpanded = () => !props.item.isCollapsed;

  return (
    <div class="shrink-0 border-l-2 border-transparent px-2 py-0.5">
      <span class="inline-flex flex-col align-top">
        <ExpandableTrigger
          isExpanded={isExpanded()}
          onClick={() => props.onToggle()}
        >
          <span class="text-on-surface-variant inline-flex items-baseline gap-1.5 font-mono text-sm">
            <Show
              fallback={<span class="italic opacity-50">&lt;no label&gt;</span>}
              when={hasLabel()}
            >
              <ConsoleTokenView tokens={props.item.groupLabel ?? []} />
            </Show>
          </span>
        </ExpandableTrigger>
      </span>
    </div>
  );
}

/** @public */
export { ConsoleGroupView, type ConsoleGroupViewProps };

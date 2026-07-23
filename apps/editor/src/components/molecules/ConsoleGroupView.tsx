import ChevronDown from "lucide-solid/icons/chevron-down";
import ChevronRight from "lucide-solid/icons/chevron-right";
import { Show } from "solid-js";
import type { FlatConsoleItem } from "../../helpers/console-hierarchy.ts";
import { Icon } from "../atoms/Icon.tsx";
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
function ConsoleGroupView(props: ConsoleGroupViewProps) {
  const hasLabel = () =>
    props.item.groupLabel ? props.item.groupLabel.length > 0 : false;
  const isExpanded = () => !props.item.isCollapsed;

  const preview = (
    <span class="inline-flex items-baseline gap-1.5 font-mono text-on-surface-variant text-sm">
      <Show
        fallback={<span class="italic opacity-50">&lt;no label&gt;</span>}
        when={hasLabel()}
      >
        <ConsoleTokenView tokens={props.item.groupLabel ?? []} />
      </Show>
    </span>
  );

  return (
    <div class="shrink-0 border-transparent border-l-2 px-2 py-0.5">
      <span class="inline-flex flex-col align-top">
        <button
          class="-ml-1 inline-flex pointer-coarse:min-h-11 cursor-pointer items-center gap-1 rounded pointer-coarse:px-3 px-1 transition-colors hover:bg-surface-variant/50"
          onClick={() => props.onToggle()}
          type="button"
        >
          <span class="text-on-surface-variant opacity-70">
            <Icon icon={isExpanded() ? ChevronDown : ChevronRight} size={12} />
          </span>
          {preview}
        </button>
      </span>
    </div>
  );
}

/** @public */
export { ConsoleGroupView, type ConsoleGroupViewProps };

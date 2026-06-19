import ChevronRight from "lucide-solid/icons/chevron-right";
import type { JSX } from "solid-js";
import { createSignal, Show } from "solid-js";
import { cn } from "../../helpers/cn.ts";
import { Icon } from "./Icon.tsx";

/**
 * Configuration props for the ExpandableNode component.
 *
 * Intent: Defines the content, initial visual state, and an optional persistence key
 * for the togglable view.
 *
 * Edge cases: If `stateKey` is omitted, the expansion state relies entirely on local
 * component state and will reset if the component unmounts.
 *
 * Side effects: None.
 */
interface ExpandableNodeProps {
  /** Content shown in the expanded state. */
  children: JSX.Element;
  class?: string;
  /** When true, the node starts in the expanded state. Defaults to false. */
  defaultExpanded?: boolean;
  /** Inline content shown as the toggle trigger / collapsed preview. */
  preview: JSX.Element;
  /** Optional stable object reference to persist the expanded state across remounts (e.g. when scrolling out of view in a VirtualList). */
  stateKey?: object;
}

const globalExpandedState = new WeakMap<object, boolean>();
const idForStateKey = new WeakMap<object, string>();
let nextExpandableContentId = 1;

/**
 * Atom that renders a chevron-toggled expandable node.
 *
 * Used by both token collection rendering (arrays, objects, maps, sets) and
 * console group rendering to provide visual consistency between the two.
 * The `defaultExpanded` prop controls the initial toggle state — e.g.
 * `console.groupCollapsed` sets it to `false`, `console.group` to `true`.
 */
function ExpandableNode(props: ExpandableNodeProps) {
  const initial = props.stateKey
    ? (globalExpandedState.get(props.stateKey) ??
      props.defaultExpanded ??
      false)
    : (props.defaultExpanded ?? false);

  const [isExpanded, setIsExpanded] = createSignal(initial);

  const toggle = () => {
    const next = !isExpanded();
    setIsExpanded(next);
    if (props.stateKey) {
      globalExpandedState.set(props.stateKey, next);
    }
  };

  let contentId: string;
  if (props.stateKey) {
    if (!idForStateKey.has(props.stateKey)) {
      idForStateKey.set(
        props.stateKey,
        `expandable-content-${Math.random().toString(36).slice(2, 9)}`
      );
    }
    contentId = idForStateKey.get(props.stateKey) ?? "";
  } else {
    const instanceAutoId = nextExpandableContentId++;
    contentId = `expandable-content-${instanceAutoId}`;
  }

  return (
    <span class={cn("inline-flex flex-col align-top", props.class)}>
      <button
        aria-controls={contentId}
        aria-expanded={isExpanded() ? "true" : "false"}
        class="group -ml-1 inline-flex cursor-pointer items-center gap-1 rounded px-1 transition-colors hover:bg-surface-variant/50"
        data-expanded={isExpanded() ? "true" : "false"}
        onClick={toggle}
        type="button"
      >
        <span
          class={cn(
            "rotate-0 text-on-surface-variant opacity-70 motion-safe:transition-transform motion-safe:duration-150",
            "group-data-[expanded=true]:rotate-90 motion-reduce:transition-none motion-reduce:duration-0"
          )}
        >
          <Icon icon={ChevronRight} size={12} />
        </span>
        {props.preview}
      </button>

      <span
        class="mt-1 ml-1.5 flex flex-col gap-1 border-outline-variant/30 border-l pl-4"
        id={contentId}
      >
        <Show when={isExpanded()}>{props.children}</Show>
      </span>
    </span>
  );
}

export { ExpandableNode, type ExpandableNodeProps };

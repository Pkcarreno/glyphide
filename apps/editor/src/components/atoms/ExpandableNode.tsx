import type { JSX } from "@solidjs/web";
import ChevronRight from "lucide-solid/icons/chevron-right";
import type { FlowProps, ParentProps } from "solid-js";
import {
  createContext,
  createSignal,
  createUniqueId,
  merge,
  omit,
  Show,
  untrack,
  useContext,
} from "solid-js";
import { cn } from "../../helpers/cn.ts";
import { Icon } from "./Icon.tsx";

interface ExpandableScopeStore {
  contentIds: WeakMap<object, string>;
  expandedState: WeakMap<object, boolean>;
}

const ExpandableScopeContext = createContext<ExpandableScopeStore | null>(null);

/**
 * Provides an isolated `stateKey` expansion store for descendant `ExpandableNode` instances.
 */
function ExpandableScope(props: ParentProps) {
  const store: ExpandableScopeStore = {
    contentIds: new WeakMap(),
    expandedState: new WeakMap(),
  };

  return (
    <ExpandableScopeContext value={store}>
      {props.children}
    </ExpandableScopeContext>
  );
}

/**
 * Configuration props for the ExpandableTrigger component.
 */
interface ExpandableTriggerProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  class?: string;
  /** Whether the controlled region is expanded. */
  isExpanded: boolean;
}

/**
 * Accessible chevron button trigger shared by `ExpandableNode` and `ConsoleGroupView`.
 */
function ExpandableTrigger(rawProps: ParentProps<ExpandableTriggerProps>) {
  const props = merge({ type: "button" as const }, rawProps);
  const rest = omit(props, "class", "children", "isExpanded");

  return (
    <button
      aria-expanded={props.isExpanded ? "true" : "false"}
      class={cn(
        "group hover:bg-surface-variant/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 -ml-1 inline-flex cursor-pointer items-center gap-1 rounded px-1 text-left transition-colors outline-none focus-visible:ring-3 aria-invalid:ring-3 pointer-coarse:min-h-11 pointer-coarse:px-3",
        props.class
      )}
      data-expanded={props.isExpanded ? "true" : "false"}
      {...rest}
    >
      <span
        class={cn(
          "text-on-surface-variant rotate-0 opacity-70 motion-safe:transition-transform motion-safe:duration-150",
          "group-data-[expanded=true]:rotate-90 motion-reduce:transition-none motion-reduce:duration-0"
        )}
      >
        <Icon icon={ChevronRight} size={12} />
      </span>
      {props.children}
    </button>
  );
}

/**
 * Configuration props for the ExpandableNode component.
 *
 * Intent: Defines the content, initial visual state, and an optional persistence key
 * for the togglable view.
 *
 * Edge cases: If `stateKey` is omitted or no `ExpandableScope` ancestor is mounted,
 * the expansion state uses per-instance local state and resets on unmount.
 *
 * Side effects: None.
 */
interface ExpandableNodeProps {
  class?: string;
  /** When true, the node starts in the expanded state. Defaults to false. */
  defaultExpanded?: boolean;
  /** Inline content shown as the toggle trigger / collapsed preview. */
  preview: JSX.Element;
  /** Optional stable object reference to persist expansion within the nearest `ExpandableScope`. */
  stateKey?: object;
}

/**
 * Atom that renders a chevron-toggled expandable node.
 *
 * Used by token collection rendering (arrays, objects, maps, sets).
 * When mounted inside `ExpandableScope`, `stateKey` persists toggle state across remounts.
 */
function ExpandableNode(rawProps: FlowProps<ExpandableNodeProps>) {
  const props = merge({ defaultExpanded: false }, rawProps);
  const scope = useContext(ExpandableScopeContext);

  const initial = untrack(() =>
    scope && props.stateKey
      ? (scope.expandedState.get(props.stateKey) ?? props.defaultExpanded)
      : props.defaultExpanded
  );

  const [isExpanded, setIsExpanded] = createSignal(initial);

  const toggle = () => {
    const next = !isExpanded();
    setIsExpanded(next);
    if (scope && props.stateKey) {
      scope.expandedState.set(props.stateKey, next);
    }
  };

  const generatedId = `expandable-content-${createUniqueId()}`;
  const contentId = untrack(() => {
    if (scope && props.stateKey) {
      let existingId = scope.contentIds.get(props.stateKey);
      if (!existingId) {
        existingId = generatedId;
        scope.contentIds.set(props.stateKey, existingId);
      }
      return existingId;
    }
    return generatedId;
  });

  return (
    <span class={cn("inline-flex flex-col align-top", props.class)}>
      <ExpandableTrigger
        aria-controls={contentId}
        isExpanded={isExpanded()}
        onClick={toggle}
      >
        {props.preview}
      </ExpandableTrigger>

      <span
        class="border-outline-variant/30 mt-1 ml-1.5 flex flex-col gap-1 border-l pl-4"
        id={contentId}
      >
        <Show when={isExpanded()}>{props.children}</Show>
      </span>
    </span>
  );
}

/** @public */
export {
  ExpandableNode,
  type ExpandableNodeProps,
  ExpandableScope,
  ExpandableTrigger,
  type ExpandableTriggerProps,
};

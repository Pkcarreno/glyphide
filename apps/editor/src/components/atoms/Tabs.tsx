import type { Accessor, JSX } from "solid-js";
import {
  createContext,
  createSignal,
  onCleanup,
  splitProps,
  useContext,
} from "solid-js";
import { cn } from "../../helpers/cn.ts";

/* ---------- Context ---------- */

type TabsOrientation = "horizontal" | "vertical";

interface TabsContextValue {
  activeValue: Accessor<string>;
  /** Stable, unique IDs per value for aria linking. */
  generateId: (value: string, kind: "trigger" | "panel") => string;
  /** Returns trigger elements in DOM order (excluding disabled). */
  getNavigableTriggers: () => HTMLElement[];
  orientation: Accessor<TabsOrientation>;
  registerTrigger: (value: string, el: HTMLElement) => void;
  selectValue: (value: string) => void;
  unregisterTrigger: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue>();

/**
 * Retrieves the Tabs context.
 * Throws if used outside a Tabs.Root.
 *
 * @public
 */
export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error("Tabs compound components must be used within <Tabs.Root>");
  }
  return ctx;
}

/* ---------- Root ---------- */

interface TabsRootProps {
  children: JSX.Element;
  class?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  /** Fires when active tab changes. */
  onValueChange?: (value: string) => void;
  /** Semantic orientation for ARIA. Layout is CSS-driven. */
  orientation?: TabsOrientation;
  /** Controlled active value. */
  value?: string;
}

/**
 * Tabs root that owns the active value and provides context to sub-components.
 * Supports both controlled and uncontrolled modes.
 */
function TabsRoot(props: TabsRootProps) {
  const [local] = splitProps(props, [
    "value",
    "defaultValue",
    "onValueChange",
    "orientation",
    "children",
    "class",
  ]);

  const isControlled = () => local.value !== undefined;
  const [internalValue, setInternalValue] = createSignal(
    local.defaultValue ?? ""
  );
  const activeValue = () =>
    isControlled() ? (local.value ?? "") : internalValue();

  // Map keeps DOM order via insertion order; keyed by value for O(1) lookup.
  const [triggerMap, setTriggerMap] = createSignal<Map<string, HTMLElement>>(
    new Map()
  );
  // Disabled state per value (kept in sync by triggers via context callback).
  const [disabledMap, setDisabledMap] = createSignal<Map<string, boolean>>(
    new Map()
  );

  // Stable per-value ID counter — increments per value, so the trigger and
  // matching panel can share the same root ID (e.g. "tabs-a").
  const idRoots = new Map<string, number>();
  let idSeed = 0;
  const generateId = (value: string, kind: "trigger" | "panel"): string => {
    let root = idRoots.get(value);
    if (root === undefined) {
      idSeed += 1;
      root = idSeed;
      idRoots.set(value, root);
    }
    return `tabs-${root}-${kind}`;
  };

  const selectValue = (next: string) => {
    if (disabledMap().get(next)) {
      return;
    }
    if (!isControlled()) {
      setInternalValue(next);
    }
    local.onValueChange?.(next);
  };

  const registerTrigger = (value: string, el: HTMLElement) => {
    setTriggerMap((prev) => {
      const next = new Map(prev);
      next.set(value, el);
      return next;
    });
  };

  const unregisterTrigger = (value: string) => {
    setTriggerMap((prev) => {
      if (!prev.has(value)) {
        return prev;
      }
      const next = new Map(prev);
      next.delete(value);
      return next;
    });
    setDisabledMap((prev) => {
      if (!prev.has(value)) {
        return prev;
      }
      const next = new Map(prev);
      next.delete(value);
      return next;
    });
  };

  const setDisabled = (value: string, isDisabled: boolean) => {
    setDisabledMap((prev) => {
      const next = new Map(prev);
      if (isDisabled) {
        next.set(value, true);
      } else {
        next.delete(value);
      }
      return next;
    });
  };

  const getNavigableTriggers = (): HTMLElement[] => {
    const disabled = disabledMap();
    return Array.from(triggerMap().values()).filter(
      (el) => !disabled.get(el.dataset.tabValue ?? "")
    );
  };

  const context: TabsContextValue = {
    activeValue,
    generateId,
    getNavigableTriggers,
    orientation: () => local.orientation ?? "horizontal",
    registerTrigger,
    selectValue,
    unregisterTrigger,
  };

  // Expose setDisabled on the context via closure so Trigger can report it.
  // We avoid exposing it on the public context shape by attaching it on the
  // TabsRoot-level closure variable, but Trigger imports it via a setter
  // helper below.
  setDisabledRef = setDisabled;

  return (
    <TabsContext.Provider value={context}>
      <div class={cn(local.class)}>{local.children}</div>
    </TabsContext.Provider>
  );
}

// Module-level ref so Trigger can report disabled state without polluting
// the context shape. Only one Tabs.Root is rendered at a time in practice,
// so this is safe within a single render tree.
let setDisabledRef: ((value: string, isDisabled: boolean) => void) | undefined;

/* ---------- List ---------- */

interface TabsListProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
  class?: string;
}

/**
 * Container for trigger elements with `role="tablist"`.
 * Handles orientation-aware keyboard navigation (Arrow keys, Home, End).
 */
function TabsList(props: TabsListProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  const ctx = useTabs();

  const focusAndSelect = (el: HTMLElement) => {
    const value = el.dataset.tabValue;
    if (value) {
      ctx.selectValue(value);
    }
    el.focus();
  };

  const findCurrentIndex = (triggers: HTMLElement[]): number => {
    const active = document.activeElement as HTMLElement | null;
    if (active) {
      const focusedIndex = triggers.indexOf(active);
      if (focusedIndex >= 0) {
        return focusedIndex;
      }
    }
    return triggers.findIndex(
      (el) => el.dataset.tabValue === ctx.activeValue()
    );
  };

  const stepBy = (delta: number) => (triggers: HTMLElement[]) => {
    const base = findCurrentIndex(triggers);
    const start = base >= 0 ? base : 0;
    const next = (start + delta + triggers.length) % triggers.length;
    focusAndSelect(triggers[next] as HTMLElement);
  };

  const goToFirst = (triggers: HTMLElement[]) => {
    focusAndSelect(triggers[0] as HTMLElement);
  };

  const goToLast = (triggers: HTMLElement[]) => {
    focusAndSelect(triggers.at(-1) as HTMLElement);
  };

  const buildKeyMap = (): Record<string, (triggers: HTMLElement[]) => void> => {
    const isHorizontal = ctx.orientation() === "horizontal";
    return {
      ArrowDown: isHorizontal ? goToLast : stepBy(1),
      ArrowLeft: isHorizontal ? stepBy(-1) : goToFirst,
      ArrowRight: isHorizontal ? stepBy(1) : goToLast,
      ArrowUp: isHorizontal ? goToFirst : stepBy(-1),
      End: goToLast,
      Home: goToFirst,
    };
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const triggers = ctx.getNavigableTriggers();
    if (triggers.length === 0) {
      return;
    }
    const handler = buildKeyMap()[e.key];
    if (handler) {
      e.preventDefault();
      handler(triggers);
    }
  };

  return (
    <div
      aria-orientation={ctx.orientation()}
      class={cn("flex gap-1", local.class)}
      onKeyDown={handleKeyDown}
      role="tablist"
      {...rest}
    >
      {local.children}
    </div>
  );
}

/* ---------- Trigger ---------- */

interface TabsTriggerProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  children: JSX.Element;
  class?: string;
  /** When true, the trigger is not interactive. */
  disabled?: boolean;
  /** Unique value identifying this tab. */
  value: string;
}

/**
 * Individual tab button with `role="tab"`.
 * Applies ARIA, roving tabindex, registers with context, and renders visual states.
 */
function TabsTrigger(props: TabsTriggerProps) {
  const [local, rest] = splitProps(props, [
    "class",
    "children",
    "value",
    "disabled",
  ]);
  const ctx = useTabs();

  const triggerId = () => ctx.generateId(local.value, "trigger");
  const panelId = () => ctx.generateId(local.value, "panel");

  const isActive = () => ctx.activeValue() === local.value;

  const handleClick = () => {
    if (local.disabled) {
      return;
    }
    ctx.selectValue(local.value);
  };

  onCleanup(() => {
    ctx.unregisterTrigger(local.value);
  });

  return (
    <button
      aria-controls={panelId()}
      aria-selected={isActive()}
      class={cn(
        "focus-ring rounded-md px-3 py-2 text-left font-medium text-sm transition-colors",
        "pointer-coarse:min-h-11 flex-1 pointer-coarse:px-4 md:w-full",
        isActive()
          ? "bg-surface-variant text-on-surface"
          : "text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface",
        local.disabled && "cursor-not-allowed opacity-50",
        local.class
      )}
      data-tab-value={local.value}
      disabled={local.disabled}
      id={triggerId()}
      onClick={handleClick}
      ref={(node) => {
        ctx.registerTrigger(local.value, node);
        setDisabledRef?.(local.value, !!local.disabled);
      }}
      role="tab"
      tabIndex={isActive() ? 0 : -1}
      type="button"
      {...rest}
    >
      {local.children}
    </button>
  );
}

/* ---------- Content ---------- */

interface TabsContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
  class?: string;
  /** Must match a Tabs.Trigger value. */
  value: string;
}

/**
 * Tab panel with `role="tabpanel"`.
 * Mounts all panels; hides non-active ones via the `hidden` attribute.
 */
function TabsContent(props: TabsContentProps) {
  const [local, rest] = splitProps(props, ["class", "children", "value"]);
  const ctx = useTabs();

  const triggerId = () => ctx.generateId(local.value, "trigger");
  const panelId = () => ctx.generateId(local.value, "panel");
  const isActive = () => ctx.activeValue() === local.value;

  return (
    <div
      aria-labelledby={triggerId()}
      class={cn("flex flex-col gap-8", local.class)}
      hidden={!isActive()}
      id={panelId()}
      role="tabpanel"
      // tabpanel must be focusable so Tab from the trigger lands inside it.
      // biome-ignore lint/a11y/noNoninteractiveTabindex: WAI-ARIA Tabs pattern
      tabIndex={0}
      {...rest}
    >
      {local.children}
    </div>
  );
}

/* ---------- Unified Namespace ---------- */

/**
 * Composable Tabs compound component.
 * Follows WAI-ARIA Tabs pattern with roving tabindex and automatic activation.
 *
 * @public
 */
export const Tabs = {
  Content: TabsContent,
  List: TabsList,
  Root: TabsRoot,
  Trigger: TabsTrigger,
};

import {
  createSignal,
  Show,
  splitProps,
  onCleanup,
  onMount,
  createContext,
  useContext,
} from "solid-js";
import type { JSX, Accessor } from "solid-js";
import { Portal } from "solid-js/web";
import { Dynamic } from "solid-js/web";
import { cn } from "../../helpers/cn";

/* ---------- Types ---------- */

export type TooltipPosition = "top" | "bottom" | "left" | "right";

/* ---------- Context ---------- */

interface TooltipContextValue {
  isOpen: Accessor<boolean>;
  position: Accessor<TooltipPosition>;
  offset: Accessor<number>;
  coords: Accessor<{ top: number; left: number }>;
  transform: Accessor<string>;
  setTriggerRef: (el: HTMLElement) => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
}

const TooltipContext = createContext<TooltipContextValue>();

function useTooltip(): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (!ctx) {
    throw new Error(
      "Tooltip compound components must be used within <TooltipRoot>",
    );
  }
  return ctx;
}

/* ---------- Root ---------- */

interface TooltipRootProps {
  /** Where the tooltip appears relative to the trigger. Default: 'top' */
  position?: TooltipPosition;
  /** Distance from the trigger element in pixels. Default: 4 */
  offset?: number;
  children: JSX.Element;
}

/**
 * Tooltip root that manages hover state and positioning context.
 * Provides context to compound children (Trigger, Portal, Positioner, Popup).
 */
function TooltipRoot(props: TooltipRootProps) {
  const [local] = splitProps(props, [
    "position",
    "offset",
    "children",
  ]);

  const position = () => local.position ?? "top";
  const offset = () => local.offset ?? 4;

  const [isOpen, setIsOpen] = createSignal(false);
  const [coords, setCoords] = createSignal({ top: 0, left: 0 });
  const [transform, setTransform] = createSignal("");

  let triggerEl: HTMLElement | undefined;

  const setTriggerRef = (el: HTMLElement) => {
    triggerEl = el;
  };

  const updatePosition = () => {
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const pos = position();
    const off = offset();

    let top = 0;
    let left = 0;
    let trans = "";

    switch (pos) {
      case "top":
        top = rect.top - off;
        left = rect.left + rect.width / 2;
        trans = "translate(-50%, -100%)";
        break;
      case "bottom":
        top = rect.bottom + off;
        left = rect.left + rect.width / 2;
        trans = "translate(-50%, 0)";
        break;
      case "left":
        top = rect.top + rect.height / 2;
        left = rect.left - off;
        trans = "translate(-100%, -50%)";
        break;
      case "right":
        top = rect.top + rect.height / 2;
        left = rect.right + off;
        trans = "translate(0, -50%)";
        break;
    }

    setCoords({ top, left });
    setTransform(trans);
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

  const handleScrollOrResize = () => {
    if (isOpen()) {
      updatePosition();
    }
  };

  onMount(() => {
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    onCleanup(() => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    });
  });

  return (
    <TooltipContext.Provider
      value={{
        isOpen,
        position,
        offset,
        coords,
        transform,
        setTriggerRef,
        handleMouseEnter,
        handleMouseLeave,
      }}
    >
      {local.children}
    </TooltipContext.Provider>
  );
}

/* ---------- Trigger ---------- */

interface TooltipTriggerProps {
  /** The element type to render. Default: 'div' */
  as?: string | ((...args: unknown[]) => JSX.Element);
  class?: string;
  children?: JSX.Element;
  [key: string]: unknown;
}

/**
 * Renders the trigger element using Dynamic, attaching hover/focus
 * handlers and the positioning ref without injecting a wrapper div.
 */
function TooltipTrigger(props: TooltipTriggerProps) {
  const [local, rest] = splitProps(props, [
    "as",
    "class",
    "children",
  ]);

  const ctx = useTooltip();

  return (
    <Dynamic
      component={local.as ?? "div"}
      ref={(el: HTMLElement) => ctx.setTriggerRef(el)}
      onMouseEnter={ctx.handleMouseEnter}
      onMouseLeave={ctx.handleMouseLeave}
      onFocus={ctx.handleMouseEnter}
      onBlur={ctx.handleMouseLeave}
      class={cn(local.class)}
      {...rest}
    >
      {local.children}
    </Dynamic>
  );
}

/* ---------- Portal ---------- */

interface TooltipPortalProps {
  children: JSX.Element;
}

/** Wraps content in a Solid Portal, rendering to document body. */
function TooltipPortal(props: TooltipPortalProps) {
  const ctx = useTooltip();

  return (
    <Show when={ctx.isOpen()}>
      <Portal>{props.children}</Portal>
    </Show>
  );
}

/* ---------- Positioner ---------- */

interface TooltipPositionerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  class?: string;
  children?: JSX.Element;
}

/** Applies calculated fixed positioning to the tooltip content. */
function TooltipPositioner(props: TooltipPositionerProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  const ctx = useTooltip();

  return (
    <div
      class={cn("fixed z-50 pointer-events-none", local.class)}
      style={{
        top: `${ctx.coords().top}px`,
        left: `${ctx.coords().left}px`,
        transform: ctx.transform(),
      }}
      {...rest}
    >
      {local.children}
    </div>
  );
}

/* ---------- Popup ---------- */

interface TooltipPopupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  class?: string;
  children?: JSX.Element;
}

/** The visible tooltip panel with base styling. */
function TooltipPopup(props: TooltipPopupProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      role="tooltip"
      class={cn(
        "flex flex-col max-w-64 py-1 px-2",
        "bg-surface border border-outline-variant rounded shadow-md",
        "text-ui-label",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export {
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
  useTooltip,
  type TooltipRootProps,
  type TooltipTriggerProps,
  type TooltipPortalProps,
  type TooltipPositionerProps,
  type TooltipPopupProps
};

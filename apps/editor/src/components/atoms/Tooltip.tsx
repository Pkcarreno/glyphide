import type { Accessor, JSX } from "solid-js";
import {
  createContext,
  createSignal,
  onCleanup,
  onMount,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { Dynamic, Portal } from "solid-js/web";
import { cn } from "../../helpers/cn.ts";

/* ---------- Types ---------- */

export type TooltipPosition = "top" | "bottom" | "left" | "right";

/* ---------- Context ---------- */

interface TooltipContextValue {
  coords: Accessor<{ top: number; left: number }>;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  isOpen: Accessor<boolean>;
  offset: Accessor<number>;
  position: Accessor<TooltipPosition>;
  setTriggerRef: (el: HTMLElement) => void;
  transform: Accessor<string>;
}

const TooltipContext = createContext<TooltipContextValue>();

function useTooltip(): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (!ctx) {
    throw new Error(
      "Tooltip compound components must be used within <TooltipRoot>"
    );
  }
  return ctx;
}

/* ---------- Root ---------- */

interface TooltipRootProps {
  children: JSX.Element;
  /** Distance from the trigger element in pixels. Default: 4 */
  offset?: number;
  /** Where the tooltip appears relative to the trigger. Default: 'top' */
  position?: TooltipPosition;
}

/**
 * Tooltip root that manages hover state and positioning context.
 * Provides context to compound children (Trigger, Portal, Positioner, Popup).
 */
function TooltipRoot(props: TooltipRootProps) {
  const [local] = splitProps(props, ["position", "offset", "children"]);

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
    if (!triggerEl) {
      return;
    }
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
      default:
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
  children?: JSX.Element;
  class?: string;
  [key: string]: unknown;
}

/**
 * Renders the trigger element using Dynamic, attaching hover/focus
 * handlers and the positioning ref without injecting a wrapper div.
 */
function TooltipTrigger(props: TooltipTriggerProps) {
  const [local, rest] = splitProps(props, ["as", "class", "children"]);

  const ctx = useTooltip();

  return (
    <Dynamic
      class={cn(local.class)}
      component={local.as ?? "div"}
      onBlur={ctx.handleMouseLeave}
      onFocus={ctx.handleMouseEnter}
      onMouseEnter={ctx.handleMouseEnter}
      onMouseLeave={ctx.handleMouseLeave}
      ref={(el: HTMLElement) => ctx.setTriggerRef(el)}
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
  children?: JSX.Element;
  class?: string;
}

/** Applies calculated fixed positioning to the tooltip content. */
function TooltipPositioner(props: TooltipPositionerProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  const ctx = useTooltip();

  return (
    <div
      class={cn("pointer-events-none fixed z-50", local.class)}
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
  children?: JSX.Element;
  class?: string;
}

/** The visible tooltip panel with base styling. */
function TooltipPopup(props: TooltipPopupProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn(
        "flex max-w-64 flex-col px-2 py-1",
        "rounded border border-outline-variant bg-surface shadow-md",
        "text-ui-label",
        local.class
      )}
      role="tooltip"
      {...rest}
    >
      {local.children}
    </div>
  );
}

export {
  TooltipPopup,
  type TooltipPopupProps,
  TooltipPortal,
  type TooltipPortalProps,
  TooltipPositioner,
  type TooltipPositionerProps,
  TooltipRoot,
  type TooltipRootProps,
  TooltipTrigger,
  type TooltipTriggerProps,
  useTooltip,
};

import {
  autoUpdate,
  computePosition,
  flip,
  offset as floatingOffset,
  type Placement,
  shift,
} from "@floating-ui/dom";
import type { Accessor, ComponentProps, JSX, ValidComponent } from "solid-js";
import {
  createContext,
  createSignal,
  onCleanup,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { Dynamic, Portal } from "solid-js/web";
import { cn } from "../../helpers/cn.ts";

/* ---------- Types ---------- */

/**
 * Placement options for the tooltip relative to its trigger.
 */
export type TooltipPosition = Placement;

/* ---------- Context ---------- */

interface TooltipContextValue {
  coords: Accessor<{ top: number; left: number }>;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  isOpen: Accessor<boolean>;
  isPositioned: Accessor<boolean>;
  offset: Accessor<number>;
  position: Accessor<TooltipPosition>;
  setPositionerRef: (el: HTMLElement) => void;
  setTriggerRef: (el: HTMLElement) => void;
}

const TooltipContext = createContext<TooltipContextValue>();

/**
 * Hook to access the current tooltip context.
 * Must be used within a `<TooltipRoot>` component.
 */
export function useTooltip(): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (!ctx) {
    throw new Error(
      "Tooltip compound components must be used within <TooltipRoot>"
    );
  }
  return ctx;
}

/* ---------- Root ---------- */

/**
 * Props for the TooltipRoot component.
 */
export interface TooltipRootProps {
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
export function TooltipRoot(props: TooltipRootProps) {
  const [local] = splitProps(props, ["position", "offset", "children"]);

  const position = () => local.position ?? "top";
  const offset = () => local.offset ?? 4;

  const [isOpen, setIsOpen] = createSignal(false);
  const [isPositioned, setIsPositioned] = createSignal(false);
  const [coords, setCoords] = createSignal({ top: 0, left: 0 });

  let triggerEl: HTMLElement | undefined;
  let positionerEl: HTMLElement | undefined;
  let cleanupAutoUpdate: (() => void) | undefined;

  const setTriggerRef = (el: HTMLElement) => {
    triggerEl = el;
  };

  const updatePosition = () => {
    if (!(triggerEl && positionerEl)) {
      return;
    }

    computePosition(triggerEl, positionerEl, {
      placement: position(),
      middleware: [floatingOffset(offset()), flip(), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      setCoords({ top: Math.round(y), left: Math.round(x) });
      setIsPositioned(true);
    });
  };

  const setPositionerRef = (el: HTMLElement) => {
    positionerEl = el;
    if (el && triggerEl && isOpen()) {
      cleanupAutoUpdate?.();
      try {
        cleanupAutoUpdate = autoUpdate(triggerEl, positionerEl, updatePosition);
      } catch {
        // Fallback for JSDOM environments where autoUpdate can throw
        updatePosition();
        cleanupAutoUpdate = () => {
          // no-op
        };
      }
    }
  };

  const handleMouseEnter = () => {
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
    setIsPositioned(false);
    cleanupAutoUpdate?.();
    cleanupAutoUpdate = undefined;
  };

  onCleanup(() => {
    cleanupAutoUpdate?.();
  });

  return (
    <TooltipContext.Provider
      value={{
        isOpen,
        isPositioned,
        position,
        offset,
        coords,
        setTriggerRef,
        setPositionerRef,
        handleMouseEnter,
        handleMouseLeave,
      }}
    >
      {local.children}
    </TooltipContext.Provider>
  );
}

/* ---------- Trigger ---------- */

/**
 * Props for the TooltipTrigger component.
 */
export type TooltipTriggerProps<T extends ValidComponent = "div"> = {
  /** The element type to render. Default: 'div' */
  as?: T;
  children?: JSX.Element;
  class?: string;
} & Omit<ComponentProps<T>, "as" | "children" | "class">;

/**
 * Renders the trigger element using Dynamic, attaching hover/focus
 * handlers and the positioning ref without injecting a wrapper div.
 */
export function TooltipTrigger<T extends ValidComponent = "div">(
  props: TooltipTriggerProps<T>
) {
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

/**
 * Props for the TooltipPortal component.
 */
export interface TooltipPortalProps {
  children: JSX.Element;
}

/** Wraps content in a Solid Portal, rendering to document body. */
export function TooltipPortal(props: TooltipPortalProps) {
  const ctx = useTooltip();

  return (
    <Show when={ctx.isOpen()}>
      <Portal>{props.children}</Portal>
    </Show>
  );
}

/* ---------- Positioner ---------- */

/**
 * Props for the TooltipPositioner component.
 */
export interface TooltipPositionerProps
  extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: JSX.Element;
  class?: string;
}

/** Applies calculated fixed positioning to the tooltip content. */
export function TooltipPositioner(props: TooltipPositionerProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  const ctx = useTooltip();

  return (
    <div
      class={cn("pointer-events-none fixed z-50 w-max", local.class)}
      ref={ctx.setPositionerRef}
      style={{
        top: `${ctx.coords().top}px`,
        left: `${ctx.coords().left}px`,
        opacity: ctx.isPositioned() ? 1 : 0,
      }}
      {...rest}
    >
      {local.children}
    </div>
  );
}

/* ---------- Popup ---------- */

/**
 * Props for the TooltipPopup component.
 */
export interface TooltipPopupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: JSX.Element;
  class?: string;
}

/** The visible tooltip panel with base styling. */
export function TooltipPopup(props: TooltipPopupProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn(
        "flex w-max max-w-64 flex-col px-2 py-1",
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

/* ---------- Unified Component ---------- */

export type TooltipPrimitiveProps<T extends ValidComponent = "div"> = {
  /** The element type to render the trigger as. Default: 'div' */
  as?: T;
  children: JSX.Element;
  class?: string;
  meta?: string;
  offset?: number;
  position?: TooltipPosition;
  shortcut?: string;
  text: string;
} & Omit<
  ComponentProps<T>,
  | "as"
  | "children"
  | "class"
  | "text"
  | "meta"
  | "shortcut"
  | "position"
  | "offset"
>;

/**
 * Standard unified tooltip primitive for the Glyphide design system.
 * Enforces consistency by accepting only specific textual props.
 */
export function TooltipPrimitive<T extends ValidComponent = "div">(
  props: TooltipPrimitiveProps<T>
) {
  const [local, rest] = splitProps(props, [
    "as",
    "children",
    "class",
    "text",
    "meta",
    "shortcut",
    "position",
    "offset",
  ]);

  return (
    <TooltipRoot offset={local.offset} position={local.position}>
      <TooltipTrigger
        as={local.as}
        class={local.class}
        {...(rest as unknown as TooltipTriggerProps<T>)}
      >
        {local.children}
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipPositioner>
          <TooltipPopup>
            <div class="flex items-baseline justify-between gap-4">
              <span class="text-on-surface text-xs">{local.text}</span>
              <Show when={local.shortcut}>
                <span class="whitespace-nowrap font-mono text-token-comment text-tooltip-shortcut">
                  {local.shortcut}
                </span>
              </Show>
            </div>
            <Show when={local.meta}>
              <span class="mt-1.5 block text-token-comment text-tooltip-meta">
                {local.meta}
              </span>
            </Show>
          </TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </TooltipRoot>
  );
}

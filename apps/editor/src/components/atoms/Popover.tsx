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
  onMount,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { Dynamic, Portal } from "solid-js/web";
import { cn } from "../../helpers/cn.ts";

/* ---------- Types ---------- */

/**
 * Placement options for the popover, imported directly from Floating UI.
 */
export type PopoverPosition = Placement;

/* ---------- Context ---------- */

interface PopoverContextValue {
  close: () => void;
  coords: Accessor<{ top: number; left: number }>;
  isOpen: Accessor<boolean>;
  isPositioned: Accessor<boolean>;
  offset: Accessor<number>;
  position: Accessor<PopoverPosition>;
  setPositionerRef: (el: HTMLElement) => void;
  setTriggerRef: (el: HTMLElement) => void;
  toggle: () => void;
}

const PopoverContext = createContext<PopoverContextValue>();

/**
 * Retrieves the popover context.
 * Throws if used outside a PopoverRoot.
 *
 * @public
 */
export function usePopover(): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (!ctx) {
    throw new Error(
      "Popover compound components must be used within <PopoverRoot>"
    );
  }
  return ctx;
}

/* ---------- Root ---------- */

/**
 * Properties for the PopoverRoot component.
 *
 * @public
 */
export interface PopoverRootProps {
  /** The children nodes. */
  children: JSX.Element;
  /** If provided, makes the popover controlled */
  isOpen?: boolean;
  /** Distance from the trigger element in pixels. Default: 4 */
  offset?: number;
  /** Callback for when the controlled popover changes open state */
  onOpenChange?: (isOpen: boolean) => void;
  /** Where the popover appears relative to the trigger. Default: 'bottom' */
  position?: PopoverPosition;
}

/**
 * Popover root that manages open state and positioning context.
 *
 * @public
 */
export function PopoverRoot(props: PopoverRootProps) {
  const [local] = splitProps(props, [
    "position",
    "offset",
    "isOpen",
    "onOpenChange",
    "children",
  ]);

  const position = () => local.position ?? "bottom";
  const offset = () => local.offset ?? 4;

  const [internalIsOpen, setInternalIsOpen] = createSignal(false);
  const isOpen = () => local.isOpen ?? internalIsOpen();

  const [isPositioned, setIsPositioned] = createSignal(false);
  const [coords, setCoords] = createSignal({ top: 0, left: 0 });

  let triggerEl: HTMLElement | undefined;
  let positionerEl: HTMLElement | undefined;
  let cleanupAutoUpdate: (() => void) | undefined;

  const updatePosition = () => {
    if (!(triggerEl && positionerEl)) {
      return;
    }

    computePosition(triggerEl, positionerEl, {
      placement: position(),
      middleware: [floatingOffset(offset()), flip(), shift({ padding: 8 })],
    })
      .then(({ x, y }) => {
        setCoords({ top: Math.round(y), left: Math.round(x) });
        setIsPositioned(true);
      })
      .catch(() => {
        // Ignore positioning errors in JSDOM environments
      });
  };

  const bindAutoUpdate = () => {
    if (triggerEl && positionerEl && isOpen()) {
      cleanupAutoUpdate?.();
      try {
        cleanupAutoUpdate = autoUpdate(triggerEl, positionerEl, updatePosition);
      } catch {
        updatePosition();
        cleanupAutoUpdate = () => undefined;
      }
    }
  };

  const setTriggerRef = (el: HTMLElement) => {
    triggerEl = el;
    bindAutoUpdate();
  };

  const setPositionerRef = (el: HTMLElement) => {
    positionerEl = el;
    bindAutoUpdate();
  };

  const handleOpenStateChange = (nextOpen: boolean) => {
    if (local.isOpen === undefined) {
      setInternalIsOpen(nextOpen);
    }
    local.onOpenChange?.(nextOpen);

    if (!nextOpen) {
      setIsPositioned(false);
      cleanupAutoUpdate?.();
      cleanupAutoUpdate = undefined;
    }
  };

  const close = () => {
    handleOpenStateChange(false);
  };

  const _open = () => {
    handleOpenStateChange(true);
  };

  const toggle = () => {
    handleOpenStateChange(!isOpen());
  };

  onMount(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!isOpen()) {
        return;
      }
      const target = e.target as Node;
      if (
        triggerEl &&
        positionerEl &&
        !triggerEl.contains(target) &&
        !positionerEl.contains(target)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    onCleanup(() => {
      document.removeEventListener("mousedown", handleOutsideClick);
    });
  });

  onCleanup(() => {
    cleanupAutoUpdate?.();
  });

  return (
    <PopoverContext.Provider
      value={{
        isOpen,
        isPositioned,
        position,
        offset,
        coords,
        setTriggerRef,
        setPositionerRef,
        toggle,
        close,
      }}
    >
      {local.children}
    </PopoverContext.Provider>
  );
}

/* ---------- Trigger ---------- */

/**
 * Properties for the PopoverTrigger component.
 *
 * @public
 */
export type PopoverTriggerProps<T extends ValidComponent = "button"> = {
  /** The HTML tag or Solid component to render as. Default is "button". */
  as?: T;
  /** The children nodes. */
  children?: JSX.Element;
  /** Optional CSS classes. */
  class?: string;
} & Omit<ComponentProps<T>, "as" | "children" | "class">;

/**
 * The element that triggers the popover to open or close.
 * It automatically registers its reference for Floating UI positioning.
 *
 * @public
 */
export function PopoverTrigger<T extends ValidComponent = "button">(
  props: PopoverTriggerProps<T>
) {
  const [local, rest] = splitProps(props, ["as", "class", "children"]);
  const ctx = usePopover();

  return (
    <Dynamic
      class={cn(local.class)}
      component={local.as ?? "button"}
      onClick={(e: Event) => {
        ctx.toggle();
        const onClickProp = (rest as Record<string, unknown>).onClick;
        if (typeof onClickProp === "function") {
          onClickProp(e);
        }
      }}
      ref={(el: HTMLElement) => ctx.setTriggerRef(el)}
      {...rest}
    >
      {local.children}
    </Dynamic>
  );
}

/* ---------- Portal ---------- */

/**
 * Properties for the PopoverPortal component.
 *
 * @public
 */
export interface PopoverPortalProps {
  /** The content to portal when the popover is open. */
  children: JSX.Element;
}

/**
 * Portals the children into the document body (or custom portal target)
 * conditionally when the popover is open.
 *
 * @public
 */
export function PopoverPortal(props: PopoverPortalProps) {
  const ctx = usePopover();

  return (
    <Show when={ctx.isOpen()}>
      <Portal>{props.children}</Portal>
    </Show>
  );
}

/* ---------- Positioner ---------- */

/**
 * Properties for the PopoverPositioner component.
 *
 * @public
 */
export interface PopoverPositionerProps
  extends JSX.HTMLAttributes<HTMLDivElement> {
  /** The children nodes. */
  children?: JSX.Element;
  /** Optional CSS classes. */
  class?: string;
}

/**
 * A wrapper element that is absolutely positioned by Floating UI.
 * It manages the actual floating coordinates based on the context.
 *
 * @public
 */
export function PopoverPositioner(props: PopoverPositionerProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  const ctx = usePopover();

  return (
    <div
      class={cn("pointer-events-auto fixed z-50 w-max", local.class)}
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
 * Properties for the PopoverPopup component.
 *
 * @public
 */
export interface PopoverPopupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** The children nodes. */
  children?: JSX.Element;
  /** Optional CSS classes. */
  class?: string;
}

/**
 * The actual visual container of the popover (the styled box).
 * Apply classes to style the outer popover frame.
 *
 * @public
 */
export function PopoverPopup(props: PopoverPopupProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn(
        "flex flex-col",
        "rounded-lg bg-surface ring-1 ring-on-surface/10",
        "p-2.5 text-on-surface text-xs shadow-md",
        local.class
      )}
      role="dialog"
      {...rest}
    >
      {local.children}
    </div>
  );
}

/* ---------- Unified Object ---------- */

/**
 * The Unified Popover component namespace.
 * Use these dot-notation components to compose a Popover primitive.
 *
 * @public
 */
export const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Portal: PopoverPortal,
  Positioner: PopoverPositioner,
  Popup: PopoverPopup,
};

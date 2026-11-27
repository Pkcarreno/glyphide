import type { Placement } from "@floating-ui/dom";
import {
  autoUpdate,
  computePosition,
  flip,
  offset as floatingOffset,
  shift,
} from "@floating-ui/dom";
import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { dynamic, Portal } from "@solidjs/web";
import type { Accessor, FlowProps, ParentProps } from "solid-js";
import {
  createContext,
  createEffect,
  createSignal,
  merge,
  omit,
  onCleanup,
  onSettled,
  Show,
  useContext,
} from "solid-js";
import { cn } from "../../helpers/cn.ts";
import { composeEventHandlers } from "../../helpers/compose-event-handlers.ts";

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
 * Throws `ContextNotFoundError` if used outside `<Popover.Root>`.
 *
 * @public
 */
export function usePopover(): PopoverContextValue {
  return useContext(PopoverContext);
}

/* ---------- Root ---------- */

/**
 * Properties for the PopoverRoot component.
 *
 * @public
 */
export interface PopoverRootProps {
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
export function PopoverRoot(rawProps: FlowProps<PopoverRootProps>) {
  const props = merge(
    {
      offset: 4,
      position: "bottom" as PopoverPosition,
    },
    rawProps
  );
  const position = () => props.position;
  const offset = () => props.offset;

  const [internalIsOpen, setInternalIsOpen] = createSignal(false);
  const isOpen = () => props.isOpen ?? internalIsOpen();

  const [isPositioned, setIsPositioned] = createSignal(false);
  const [coords, setCoords] = createSignal({ left: 0, top: 0 });

  const [triggerEl, setTriggerEl] = createSignal<HTMLElement>();
  const [positionerEl, setPositionerEl] = createSignal<HTMLElement>();
  let cleanupAutoUpdate: (() => void) | undefined;

  const updatePosition = (trigger: HTMLElement, positioner: HTMLElement) => {
    computePosition(trigger, positioner, {
      middleware: [floatingOffset(offset()), flip(), shift({ padding: 8 })],
      placement: position(),
    })
      .then(({ x, y }) => {
        setCoords({ left: Math.round(x), top: Math.round(y) });
        setIsPositioned(true);
      })
      .catch(() => {
        // Ignore positioning errors in JSDOM environments
      });
  };

  createEffect(
    () => ({ open: isOpen(), pos: positionerEl(), trig: triggerEl() }),
    ({ open, pos, trig }) => {
      cleanupAutoUpdate?.();
      cleanupAutoUpdate = undefined;
      if (open && trig && pos) {
        try {
          cleanupAutoUpdate = autoUpdate(trig, pos, () =>
            updatePosition(trig, pos)
          );
        } catch {
          updatePosition(trig, pos);
          cleanupAutoUpdate = () => undefined;
        }
      }
    }
  );

  const setTriggerRef = (el: HTMLElement) => {
    setTriggerEl(el);
  };

  const setPositionerRef = (el: HTMLElement) => {
    setPositionerEl(el);
  };

  const handleOpenStateChange = (nextOpen: boolean) => {
    if (props.isOpen === undefined) {
      setInternalIsOpen(nextOpen);
    }
    props.onOpenChange?.(nextOpen);

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

  onSettled(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!isOpen()) {
        return;
      }
      const target = e.target as Node;
      const trig = triggerEl();
      const pos = positionerEl();
      if (trig && pos && !trig.contains(target) && !pos.contains(target)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  });

  onCleanup(() => {
    cleanupAutoUpdate?.();
  });

  return (
    <PopoverContext
      value={{
        close,
        coords,
        isOpen,
        isPositioned,
        offset,
        position,
        setPositionerRef,
        setTriggerRef,
        toggle,
      }}
    >
      {props.children}
    </PopoverContext>
  );
}

/* ---------- Trigger ---------- */

/**
 * Properties for the PopoverTrigger component.
 *
 * @public
 */
export type PopoverTriggerProps<T extends ValidComponent = "button"> =
  ParentProps<
    {
      /** The HTML tag or Solid component to render as. Default is "button". */
      as?: T;
      /** Optional CSS classes. */
      class?: string;
    } & Omit<ComponentProps<T>, "as" | "children" | "class">
  >;

/**
 * The element that triggers the popover to open or close.
 * It automatically registers its reference for Floating UI positioning.
 *
 * @public
 */
export function PopoverTrigger<T extends ValidComponent = "button">(
  props: PopoverTriggerProps<T>
) {
  const rest = omit(
    props as PopoverTriggerProps<"button">,
    "as",
    "class",
    "children",
    "onClick",
    "ref"
  );
  const ctx = usePopover();
  const Comp = dynamic(() => props.as ?? "button");

  return (
    <Comp
      class={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 outline-none focus-visible:ring-3 aria-invalid:ring-3",
        props.class
      )}
      onClick={composeEventHandlers(
        ctx.toggle,
        (props as PopoverTriggerProps<"button">).onClick
      )}
      ref={[
        (el: HTMLElement) => ctx.setTriggerRef(el),
        (props as PopoverTriggerProps<"button">).ref,
      ]}
      {...rest}
    >
      {props.children}
    </Comp>
  );
}

/* ---------- Portal ---------- */

/**
 * Properties for the PopoverPortal component.
 *
 * @public
 */
export type PopoverPortalProps = FlowProps;

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
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Optional CSS classes. */
  class?: string;
}

/**
 * A wrapper element that is absolutely positioned by Floating UI.
 * It manages the actual floating coordinates based on the context.
 *
 * @public
 */
export function PopoverPositioner(props: ParentProps<PopoverPositionerProps>) {
  const rest = omit(props, "class", "children", "ref");
  const ctx = usePopover();

  return (
    <div
      class={cn("pointer-events-auto fixed z-50 w-max", props.class)}
      ref={[ctx.setPositionerRef, props.ref]}
      style={{
        left: `${ctx.coords().left}px`,
        opacity: ctx.isPositioned() ? 1 : 0,
        top: `${ctx.coords().top}px`,
      }}
      {...rest}
    >
      {props.children}
    </div>
  );
}

/* ---------- Popup ---------- */

/**
 * Properties for the PopoverPopup component.
 *
 * @public
 */
export interface PopoverPopupProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Optional CSS classes. */
  class?: string;
}

/**
 * The actual visual container of the popover (the styled box).
 * Apply classes to style the outer popover frame.
 *
 * @public
 */
export function PopoverPopup(props: ParentProps<PopoverPopupProps>) {
  const rest = omit(props, "class", "children");

  return (
    <div
      class={cn(
        "flex flex-col",
        "bg-surface ring-on-surface/10 rounded-lg ring-1",
        "text-on-surface p-2.5 text-xs shadow-md",
        props.class
      )}
      role="dialog"
      {...rest}
    >
      {props.children}
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
  Popup: PopoverPopup,
  Portal: PopoverPortal,
  Positioner: PopoverPositioner,
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
};

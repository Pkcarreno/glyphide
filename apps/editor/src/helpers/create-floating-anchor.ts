import type { Placement } from "@floating-ui/dom";
import {
  autoUpdate,
  computePosition,
  flip,
  offset as floatingOffset,
  shift,
} from "@floating-ui/dom";
import type { Accessor } from "solid-js";
import { createEffect, createSignal, onSettled } from "solid-js";

/**
 * Options for `createFloatingAnchor`.
 */
export interface CreateFloatingAnchorOptions {
  /** Reactive accessor indicating whether the floating element is open. */
  isOpen: Accessor<boolean>;
  /** Reactive accessor for distance from the trigger in pixels. */
  offset: Accessor<number>;
  /** Callback invoked on document `mousedown` outside both trigger and floating elements. */
  onOutsideClick: () => void;
  /** Reactive accessor for Floating UI placement relative to the trigger. */
  placement: Accessor<Placement>;
}

/**
 * Reactive Floating UI anchor controller returned by `createFloatingAnchor`.
 */
export interface FloatingAnchor {
  /** Rounded viewport coordinates for the floating element. */
  coords: Accessor<{ left: number; top: number }>;
  /** Reactive accessor for the mounted floating element. */
  floatingEl: Accessor<HTMLElement | undefined>;
  /** Whether Floating UI resolved coordinates for the current open state. */
  isPositioned: Accessor<boolean>;
  /** Ref setter for the floating element. */
  setFloatingRef: (el: HTMLElement) => void;
  /** Ref setter for the trigger element. */
  setTriggerRef: (el: HTMLElement) => void;
  /** Reactive accessor for the mounted trigger element. */
  triggerEl: Accessor<HTMLElement | undefined>;
}

/**
 * Manages trigger and floating element refs, Floating UI `autoUpdate` /
 * `computePosition`, and `onSettled` document outside-click handling.
 */
export function createFloatingAnchor(
  options: CreateFloatingAnchorOptions
): FloatingAnchor {
  const [coords, setCoords] = createSignal({ left: 0, top: 0 });
  const [isPositioned, setIsPositioned] = createSignal(false);
  const [triggerEl, setTriggerEl] = createSignal<HTMLElement>();
  const [floatingEl, setFloatingEl] = createSignal<HTMLElement>();

  const setTriggerRef = (el: HTMLElement) => {
    setTriggerEl(el);
  };

  const setFloatingRef = (el: HTMLElement) => {
    setFloatingEl(el);
  };

  createEffect(
    () => ({
      floating: floatingEl(),
      offset: options.offset(),
      open: options.isOpen(),
      placement: options.placement(),
      trigger: triggerEl(),
    }),
    ({ floating, offset, open, placement, trigger }) => {
      if (!(open && trigger && floating)) {
        setIsPositioned(false);
        return;
      }

      // Guard against stale async computePosition responses after close or re-run
      let isCancelled = false;

      const updatePosition = () => {
        computePosition(trigger, floating, {
          middleware: [floatingOffset(offset), flip(), shift({ padding: 8 })],
          placement,
        })
          .then(({ x, y }) => {
            if (isCancelled) {
              return;
            }
            setCoords({ left: Math.round(x), top: Math.round(y) });
            setIsPositioned(true);
          })
          .catch(() => {
            // Ignore positioning errors in JSDOM/happy-dom environments
          });
      };

      let stopAutoUpdate: (() => void) | undefined;
      try {
        stopAutoUpdate = autoUpdate(trigger, floating, updatePosition);
      } catch {
        updatePosition();
      }

      return () => {
        isCancelled = true;
        stopAutoUpdate?.();
      };
    }
  );

  onSettled(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!options.isOpen()) {
        return;
      }
      const target = event.target as Node | null;
      const trigger = triggerEl();
      const floating = floatingEl();
      if (
        target &&
        trigger &&
        floating &&
        !trigger.contains(target) &&
        !floating.contains(target)
      ) {
        options.onOutsideClick();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  });

  return {
    coords,
    floatingEl,
    isPositioned,
    setFloatingRef,
    setTriggerRef,
    triggerEl,
  };
}

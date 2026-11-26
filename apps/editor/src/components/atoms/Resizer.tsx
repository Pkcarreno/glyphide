import type { JSX } from "@solidjs/web";
import { omit, onCleanup } from "solid-js";
import { cn } from "../../helpers/cn.ts";
import { composeEventHandlers } from "../../helpers/compose-event-handlers.ts";

interface ResizerProps extends JSX.HTMLAttributes<HTMLHRElement> {
  class?: string;
  /** Fires continuously during drag with the delta in pixels. */
  onResizeDelta?: (deltaX: number) => void;
  /** Fires when drag ends. */
  onResizeEnd?: () => void;
}

/**
 * A vertical resizer bar for splitting panels.
 * Handles pointer events (mouse and touch) to report
 * horizontal drag deltas.
 */
function Resizer(props: ResizerProps) {
  const rest = omit(
    props,
    "onResizeDelta",
    "onResizeEnd",
    "class",
    "ref",
    "onPointerDown",
    "onPointerMove",
    "onPointerUp",
    "onPointerCancel"
  );

  let isDragging = false;
  let previousCursor = "";
  let previousUserSelect = "";

  function restoreBodyStyles() {
    document.body.style.cursor = previousCursor;
    document.body.style.userSelect = previousUserSelect;
  }

  function handlePointerDown(e: PointerEvent) {
    e.preventDefault();
    const el = e.currentTarget as HTMLHRElement;
    el.setPointerCapture(e.pointerId);
    if (!isDragging) {
      previousCursor = document.body.style.cursor;
      previousUserSelect = document.body.style.userSelect;
      isDragging = true;
    }
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function handlePointerMove(e: PointerEvent) {
    const el = e.currentTarget as HTMLHRElement;
    if (el.hasPointerCapture(e.pointerId)) {
      props.onResizeDelta?.(e.movementX);
    }
  }

  function handlePointerUp(e: PointerEvent) {
    const el = e.currentTarget as HTMLHRElement;
    if (el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }

    if (isDragging) {
      isDragging = false;
      restoreBodyStyles();
    }
    props.onResizeEnd?.();
  }

  onCleanup(() => {
    if (isDragging) {
      isDragging = false;
      restoreBodyStyles();
    }
  });

  return (
    <hr
      aria-orientation="vertical"
      aria-valuenow={0}
      class={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 m-0 shrink-0 cursor-col-resize touch-none border-none outline-none focus-visible:ring-3 aria-invalid:ring-3",
        "h-full w-1 md:hover:w-1", // Keep it 1px visual, maybe expand hit area?
        "bg-outline-variant hover:bg-primary active:bg-primary transition-colors delay-75",
        props.class
      )}
      onPointerCancel={composeEventHandlers(
        handlePointerUp,
        props.onPointerCancel
      )}
      onPointerDown={composeEventHandlers(
        handlePointerDown,
        props.onPointerDown
      )}
      onPointerMove={composeEventHandlers(
        handlePointerMove,
        props.onPointerMove
      )}
      onPointerUp={composeEventHandlers(handlePointerUp, props.onPointerUp)}
      ref={props.ref}
      tabindex={0}
      {...rest}
    />
  );
}

/** @public */
export { Resizer, type ResizerProps };

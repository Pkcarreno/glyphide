import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../../helpers/cn.ts";

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
  const [local, rest] = splitProps(props, [
    "onResizeDelta",
    "onResizeEnd",
    "class",
  ]);

  function handlePointerDown(e: PointerEvent) {
    e.preventDefault();
    const el = e.currentTarget as HTMLHRElement;
    el.setPointerCapture(e.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function handlePointerMove(e: PointerEvent) {
    const el = e.currentTarget as HTMLHRElement;
    if (el.hasPointerCapture(e.pointerId)) {
      local.onResizeDelta?.(e.movementX);
    }
  }

  function handlePointerUp(e: PointerEvent) {
    const el = e.currentTarget as HTMLHRElement;
    if (el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }

    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    local.onResizeEnd?.();
  }

  return (
    <hr
      aria-orientation="vertical"
      aria-valuenow={0}
      class={cn(
        "focus-ring m-0 shrink-0 cursor-col-resize touch-none border-none",
        "h-full w-1 md:hover:w-1", // Keep it 1px visual, maybe expand hit area?
        "bg-outline-variant transition-colors delay-75 hover:bg-primary active:bg-primary",
        local.class
      )}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      tabIndex={0}
      {...rest}
    />
  );
}

/** @public */
export { Resizer, type ResizerProps };

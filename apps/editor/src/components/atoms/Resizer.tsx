import { splitProps, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../../helpers/cn";

interface ResizerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Fires continuously during drag with the delta in pixels. */
  onResizeDelta?: (deltaX: number) => void;
  /** Fires when drag ends. */
  onResizeEnd?: () => void;
  class?: string;
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
    const el = e.currentTarget as HTMLDivElement;
    el.setPointerCapture(e.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function handlePointerMove(e: PointerEvent) {
    const el = e.currentTarget as HTMLDivElement;
    if (el.hasPointerCapture(e.pointerId)) {
      local.onResizeDelta?.(e.movementX);
    }
  }

  function handlePointerUp(e: PointerEvent) {
    const el = e.currentTarget as HTMLDivElement;
    if (el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }

    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    local.onResizeEnd?.();
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      tabIndex={0}
      class={cn(
        "shrink-0 cursor-col-resize touch-none",
        "w-1 md:hover:w-1", // Keep it 1px visual, maybe expand hit area? 
        "bg-outline-variant hover:bg-primary active:bg-primary transition-colors delay-75",
        local.class,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      {...rest}
    />
  );
}

export { Resizer, type ResizerProps };

import { createSignal } from "solid-js";
import type { OverlayId } from "../actions/types";

/**
 * Pure model for global overlays (modals, command menus).
 * Manages which overlays are currently open.
 */
export interface OverlayModel {
  /** Returns true if the specified overlay is currently open. */
  isOpen(overlayId: OverlayId): boolean;
  /** Opens the specified overlay. */
  open(overlayId: OverlayId): void;
  /** Closes the specified overlay. */
  close(overlayId: OverlayId): void;
  /** Toggles the specified overlay's state. */
  toggle(overlayId: OverlayId): void;
}

/** Creates an `OverlayModel` instance. */
export function createOverlayModel(): OverlayModel {
  const [activeOverlays, setActiveOverlays] = createSignal<Set<OverlayId>>(
    new Set(),
  );

  function isOpen(overlayId: OverlayId): boolean {
    return activeOverlays().has(overlayId);
  }

  function open(overlayId: OverlayId): void {
    setActiveOverlays((prev) => {
      const next = new Set(prev);
      next.add(overlayId);
      return next;
    });
  }

  function close(overlayId: OverlayId): void {
    setActiveOverlays((prev) => {
      const next = new Set(prev);
      next.delete(overlayId);
      return next;
    });
  }

  function toggle(overlayId: OverlayId): void {
    setActiveOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(overlayId)) {
        next.delete(overlayId);
      } else {
        next.add(overlayId);
      }
      return next;
    });
  }

  return { isOpen, open, close, toggle };
}

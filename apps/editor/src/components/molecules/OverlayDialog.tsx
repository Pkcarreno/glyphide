import type { FlowProps } from "solid-js";
import { merge, omit } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import type { OverlayId } from "../../core/models/overlay.ts";
import type { CommandId } from "../../core/shortcuts/registry.ts";
import { Dialog } from "../atoms/Dialog.tsx";
import type { TooltipPosition } from "../atoms/Tooltip.tsx";
import type { ActionTooltipProps } from "./ActionTooltip.tsx";
import { ActionTooltip } from "./ActionTooltip.tsx";

/* ---------- Root ---------- */

/**
 * Props for the OverlayDialog.Root component.
 *
 * @public
 */
export interface OverlayDialogRootProps {
  /** Fires after `core.overlays` syncs the open state change. */
  onOpenChange?: (isOpen: boolean) => void;
  /** Identifier of the overlay in `core.overlays`. */
  overlayId: OverlayId;
}

/**
 * Dialog root that synchronizes open state with `core.overlays` by `overlayId`.
 */
function OverlayDialogRoot(props: FlowProps<OverlayDialogRootProps>) {
  const core = useEditor();

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      core.overlays.open(props.overlayId);
    } else {
      core.overlays.close(props.overlayId);
    }
    props.onOpenChange?.(isOpen);
  }

  return (
    <Dialog.Root
      isOpen={core.overlays.isOpen(props.overlayId)}
      onOpenChange={handleOpenChange}
    >
      {props.children}
    </Dialog.Root>
  );
}

/* ---------- Close ---------- */

/**
 * Props for the OverlayDialog.Close component.
 *
 * @public
 */
export type OverlayDialogCloseProps = FlowProps<
  Omit<
    ActionTooltipProps<"button">,
    "as" | "commandId" | "position" | "text"
  > & {
    /** Command identifier used to resolve the close shortcut. Default is "close-all-overlays". */
    commandId?: CommandId;
    /** Placement of the tooltip relative to the button. Default is "bottom". */
    position?: TooltipPosition;
    /** Tooltip label text. Default is "Close". */
    text?: string;
  }
>;

/**
 * Dialog close button wrapped with an ActionTooltip showing the close shortcut.
 */
function OverlayDialogClose(rawProps: OverlayDialogCloseProps) {
  const props = merge(
    {
      commandId: "close-all-overlays" as CommandId,
      position: "bottom" as TooltipPosition,
      text: "Close",
    },
    rawProps
  );
  const rest = omit(props, "children", "commandId", "position", "text");

  return (
    <ActionTooltip
      as={Dialog.Close}
      commandId={props.commandId}
      position={props.position}
      text={props.text}
      {...rest}
    >
      {props.children}
    </ActionTooltip>
  );
}

/* ---------- Unified Namespace ---------- */

/**
 * Molecule dialog namespace bound to `EditorCore.overlays` and shortcut tooltips.
 *
 * @public
 */
export const OverlayDialog = {
  Close: OverlayDialogClose,
  Content: Dialog.Content,
  Header: Dialog.Header,
  Overlay: Dialog.Overlay,
  Root: OverlayDialogRoot,
  Title: Dialog.Title,
  Trigger: Dialog.Trigger,
};

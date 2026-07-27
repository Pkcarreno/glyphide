import { splitProps } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { cn } from "../../helpers/cn.ts";
import { Button } from "../atoms/Button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../molecules/Dialog.tsx";

interface TrustRequiredModalProps {
  class?: string;
}

/**
 * Trust consent dialog that blocks engine execution until the user
 * explicitly grants trust. Uses the Dialog compound with
 * preventBackdropClose to prevent accidental dismissal.
 */
export function TrustRequiredModal(props: TrustRequiredModalProps) {
  const [local, rest] = splitProps(props, ["class"]);
  const core = useEditor();

  const handleOpenChange = (isOpen: boolean) => {
    core.dispatcher.dispatch({
      overlayId: "trust-required",
      type: isOpen ? "OPEN_OVERLAY" : "CLOSE_OVERLAY",
    });
  };

  return (
    <Dialog
      isOpen={core.overlays.isOpen("trust-required")}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        class={cn("w-full max-w-md overflow-hidden p-0", local.class)}
        preventBackdropClose
        {...rest}
      >
        <DialogHeader>
          <DialogTitle>Trust Required</DialogTitle>
        </DialogHeader>

        <div class="flex flex-col gap-4 bg-surface px-5 py-6">
          <p class="text-on-surface-variant text-sm leading-relaxed">
            This project contains shared code from an unknown source. The code
            will not run until you review it and grant trust.
          </p>
          <p class="text-on-surface-variant text-sm leading-relaxed">
            Only grant trust if you understand what the code does and trust its
            source. After granting trust, use the Run button to execute the
            code.
          </p>
        </div>

        <div class="border-outline-variant border-t bg-surface-variant/50 px-5 py-4">
          <div class="flex gap-3">
            <Button
              class="flex-1"
              onClick={() => core.dispatcher.dispatch({ type: "GRANT_TRUST" })}
              variant="outline"
            >
              Trust
            </Button>
            <Button
              autofocus={true}
              class="flex-1"
              onClick={() =>
                core.dispatcher.dispatch({
                  overlayId: "trust-required",
                  type: "CLOSE_OVERLAY",
                })
              }
              variant="primary"
            >
              Deny
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

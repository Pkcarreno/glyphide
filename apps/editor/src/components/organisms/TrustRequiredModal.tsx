import type { JSX } from "@solidjs/web";
import type { VoidProps } from "solid-js";
import { omit } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { cn } from "../../helpers/cn.ts";
import { Button } from "../atoms/Button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../molecules/Dialog.tsx";

interface TrustRequiredModalProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  class?: string;
}

/**
 * Modal shown when code requires user trust before execution.
 * Appears when the workspace contains untrusted shared code.
 */
export function TrustRequiredModal(props: VoidProps<TrustRequiredModalProps>) {
  const rest = omit(props, "class");
  const core = useEditor();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      core.overlays.open("trust-required");
    } else {
      core.overlays.close("trust-required");
    }
  };

  return (
    <Dialog
      isOpen={core.overlays.isOpen("trust-required")}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        class={cn("w-full max-w-md overflow-hidden p-0", props.class)}
        preventBackdropClose
        {...rest}
      >
        <DialogHeader>
          <DialogTitle>Trust Required</DialogTitle>
        </DialogHeader>

        <div class="bg-surface flex flex-col gap-4 px-5 py-6">
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

        <div class="border-outline-variant bg-surface-variant/50 border-t px-5 py-4">
          <div class="flex gap-3">
            <Button
              class="flex-1"
              onClick={() => core.commands.grantTrust()}
              variant="outline"
            >
              Trust
            </Button>
            <Button
              autofocus={true}
              class="flex-1"
              onClick={() => core.overlays.close("trust-required")}
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

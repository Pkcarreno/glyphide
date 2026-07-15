import X from "lucide-solid/icons/x";
import { createSignal, createUniqueId, splitProps } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { cn } from "../../helpers/cn.ts";
import { Button } from "../atoms/Button.tsx";
import { Icon } from "../atoms/Icon.tsx";
import { Input } from "../atoms/Input.tsx";
import { Switch } from "../atoms/Switch.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../molecules/Dialog.tsx";

interface ShareModalProps {
  class?: string;
}

export function ShareModal(props: ShareModalProps) {
  const [local, rest] = splitProps(props, ["class"]);
  const core = useEditor();

  const [isNameIncluded, setIsNameIncluded] = createSignal(true);
  const [hasCopiedLink, setHasCopiedLink] = createSignal(false);
  const [hasCopiedIframe, setHasCopiedIframe] = createSignal(false);

  const isUrlShareable = () => core.project.isUrlShareable();

  const buildShareUrl = () => {
    const url = new URL(window.location.href);
    if (!isNameIncluded()) {
      url.searchParams.delete("name");
    }
    return url.toString();
  };

  const buildIframeCode = () =>
    `<iframe src="${buildShareUrl()}" width="100%" height="500px" style="border:0; border-radius: 8px; overflow: hidden;" title="Glyphide"></iframe>`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(buildShareUrl());
    setHasCopiedLink(true);
    setTimeout(() => setHasCopiedLink(false), 2000);
  };

  const handleCopyIframe = async () => {
    await navigator.clipboard.writeText(buildIframeCode());
    setHasCopiedIframe(true);
    setTimeout(() => setHasCopiedIframe(false), 2000);
  };

  const handleDownload = () => {
    core.dispatcher.dispatch({ type: "DOWNLOAD_BUFFER_TO_FILE" });
  };

  const handleOpenChange = (isOpen: boolean) => {
    core.dispatcher.dispatch({
      type: isOpen ? "OPEN_OVERLAY" : "CLOSE_OVERLAY",
      overlayId: "share",
    });
  };

  const switchId = createUniqueId();

  return (
    <Dialog
      isOpen={core.overlays.isOpen("share")}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        class={cn("w-full max-w-lg overflow-hidden p-0", local.class)}
        {...rest}
      >
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogClose aria-label="Close share dialog">
            <Icon icon={X} size={16} />
          </DialogClose>
        </DialogHeader>

        <div class="flex flex-col gap-6 bg-surface px-5 py-6">
          <div class="flex flex-col gap-2">
            <label
              class="font-medium text-on-surface text-sm"
              for="share-link-input"
            >
              Preview Link
            </label>
            <Input
              class="font-mono text-on-surface-variant text-sm"
              disabled={!isUrlShareable()}
              id="share-link-input"
              readOnly
              value={buildShareUrl()}
            />
            {!isUrlShareable() && (
              <p class="text-warning text-xs">
                Project is too large to share via URL. Use "Download as file"
                instead.
              </p>
            )}
          </div>

          <div class="flex gap-3">
            <Button
              class="flex-1"
              disabled={!isUrlShareable()}
              onClick={handleCopyLink}
              size="lg"
              variant="primary"
            >
              {hasCopiedLink() ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              class="flex-1"
              disabled={!isUrlShareable()}
              onClick={handleCopyIframe}
              size="lg"
              variant="outline"
            >
              {hasCopiedIframe() ? "Copied!" : "Copy iframe"}
            </Button>
            <Button
              class="flex-1"
              onClick={handleDownload}
              size="lg"
              variant="outline"
            >
              Download as file
            </Button>
          </div>
        </div>

        <div class="border-outline-variant border-t bg-surface-variant/50 px-5 py-5">
          <h3 class="mb-4 font-semibold text-on-surface-variant text-xs uppercase tracking-wider">
            Options
          </h3>
          <div class="flex items-center justify-between gap-4">
            <div class="flex flex-col gap-1">
              <label
                class="cursor-pointer font-medium text-on-surface text-sm"
                for={switchId}
              >
                Include project name
              </label>
              <span class="text-on-surface-variant text-sm leading-relaxed">
                Appends the current project name to the share URL.
              </span>
            </div>
            <Switch
              aria-label="Include project name"
              checked={isNameIncluded()}
              id={switchId}
              onCheckedChange={setIsNameIncluded}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

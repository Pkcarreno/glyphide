import X from "lucide-solid/icons/x";
import { createSignal, createUniqueId, omit, onCleanup, Show } from "solid-js";
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

const COPY_INDICATOR_DURATION_MS = 2000;

function createCopyFeedback(getText: () => string) {
  const [hasCopied, setHasCopied] = createSignal(false);
  let timerId: ReturnType<typeof setTimeout> | undefined;
  let isDisposed = false;

  const clearTimer = () => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
      timerId = undefined;
    }
  };

  onCleanup(() => {
    isDisposed = true;
    clearTimer();
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(getText());
    } catch {
      return;
    }
    if (isDisposed) {
      return;
    }
    clearTimer();
    setHasCopied(true);
    timerId = setTimeout(() => {
      timerId = undefined;
      setHasCopied(false);
    }, COPY_INDICATOR_DURATION_MS);
  };

  return { copy, hasCopied };
}

export function ShareModal(props: ShareModalProps) {
  const rest = omit(props, "class");
  const core = useEditor();

  const [isNameIncluded, setIsNameIncluded] = createSignal(true);

  const isUrlShareable = () => core.session.isUrlShareable();

  const buildShareUrl = () => {
    const url = new URL(window.location.href);
    if (!isNameIncluded()) {
      url.searchParams.delete("name");
    }
    return url.toString();
  };

  const buildIframeCode = () =>
    `<iframe src="${buildShareUrl()}" width="100%" height="500px" style="border:0; border-radius: 8px; overflow: hidden;" title="Glyphide"></iframe>`;

  const linkFeedback = createCopyFeedback(buildShareUrl);
  const iframeFeedback = createCopyFeedback(buildIframeCode);

  const handleDownload = () => {
    core.commands.downloadBufferToFile();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      core.overlays.open("share");
    } else {
      core.overlays.close("share");
    }
  };

  const switchId = createUniqueId();

  return (
    <Dialog
      isOpen={core.overlays.isOpen("share")}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        class={cn("w-full max-w-lg overflow-hidden p-0", props.class)}
        {...rest}
      >
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogClose aria-label="Close share dialog">
            <Icon icon={X} size={16} />
          </DialogClose>
        </DialogHeader>

        <div class="bg-surface flex flex-col gap-6 px-5 py-6">
          <div class="flex flex-col gap-2">
            <label
              class="text-on-surface text-sm font-medium"
              for="share-link-input"
            >
              Preview Link
            </label>
            <Input
              class="text-on-surface-variant font-mono text-sm"
              disabled={!isUrlShareable()}
              id="share-link-input"
              readonly
              value={buildShareUrl()}
            />
            <Show when={!isUrlShareable()}>
              <p class="text-warning text-xs">
                Project is too large to share via URL. Use "Download as file"
                instead.
              </p>
            </Show>
          </div>

          <div class="flex gap-3">
            <Button
              class="flex-1"
              disabled={!isUrlShareable()}
              onClick={linkFeedback.copy}
              size="lg"
              variant="primary"
            >
              {linkFeedback.hasCopied() ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              class="flex-1"
              disabled={!isUrlShareable()}
              onClick={iframeFeedback.copy}
              size="lg"
              variant="outline"
            >
              {iframeFeedback.hasCopied() ? "Copied!" : "Copy iframe"}
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

        <div class="border-outline-variant bg-surface-variant/50 border-t px-5 py-5">
          <h3 class="text-on-surface-variant mb-4 text-xs font-semibold tracking-wider uppercase">
            Options
          </h3>
          <div class="flex items-center justify-between gap-4">
            <div class="flex flex-col gap-1">
              <label
                class="text-on-surface cursor-pointer text-sm font-medium"
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

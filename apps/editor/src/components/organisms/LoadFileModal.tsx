import X from "lucide-solid/icons/x";
import { createSignal, Show } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import type { FileReadResult } from "../../core/ports/file-io.ts";
import { Button } from "../atoms/Button.tsx";
import { FileDrop } from "../atoms/FileDrop.tsx";
import { Icon } from "../atoms/Icon.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
} from "../molecules/Dialog.tsx";

/**
 * Organism that lets the user load a `.js` or `.py` file from disk.
 * Shows the buffer-overwrite confirmation when needed, and surfaces
 * unsupported extensions as an inline error.
 * @public
 */
export function LoadFileModal() {
  const core = useEditor();
  const [error, setError] = createSignal<string | null>(null);
  const [pendingFile, setPendingFile] = createSignal<FileReadResult | null>(
    null
  );
  const [needsConfirm, setNeedsConfirm] = createSignal(false);

  function resetState(): void {
    setError(null);
    setPendingFile(null);
    setNeedsConfirm(false);
  }

  function closeModal(): void {
    resetState();
    core.dispatcher.dispatch({ type: "CLOSE_OVERLAY", overlayId: "load-file" });
  }

  function handleOpenChange(isOpen: boolean): void {
    core.dispatcher.dispatch({
      type: isOpen ? "OPEN_OVERLAY" : "CLOSE_OVERLAY",
      overlayId: "load-file",
    });
    if (!isOpen) {
      resetState();
    }
  }

  function commitLoad(): void {
    const file = pendingFile();
    if (!file) {
      return;
    }
    const engine = core.fileLoad.resolveEngine(file.extension);
    if (!engine) {
      return;
    }
    if (core.buffer.content() !== "") {
      core.dispatcher.dispatch({ type: "RESET_PROJECT_STATE" });
    }
    core.dispatcher.dispatch({
      type: "LOAD_FILE_FROM_DISK",
      content: file.content,
      engineId: engine.engineId,
      language: engine.language,
      name: file.name,
    });
    closeModal();
  }

  /**
   * Handles a file selected via the FileDrop atom (drop OR click-to-pick).
   * Reads the file through `readFileFromFile`, validates the engine, and
   * either loads directly (empty buffer) or stages the overwrite prompt.
   */
  async function handleFileSelected(file: File): Promise<void> {
    setError(null);
    try {
      const result = await core.fileIo.readFileFromFile(file);
      const engine = core.fileLoad.resolveEngine(result.extension);
      if (!engine) {
        setError("Unsupported file type. Please choose a .js or .py file.");
        return;
      }
      setPendingFile(result);
      if (core.buffer.content() === "") {
        commitLoad();
      } else {
        setNeedsConfirm(true);
      }
    } catch {
      // File read failed — no state change.
    }
  }

  function handleFileError(): void {
    setError("Unsupported file type. Please choose a .js or .py file.");
  }

  function handleFileRemoved(): void {
    setPendingFile(null);
    setNeedsConfirm(false);
  }

  return (
    <Dialog
      isOpen={core.overlays.isOpen("load-file")}
      onOpenChange={handleOpenChange}
    >
      <DialogContent class="w-full max-w-md overflow-hidden p-0">
        <DialogHeader class="border-outline-variant border-b bg-surface px-5 py-4">
          <h2 class="font-semibold text-on-surface text-sm tracking-wide">
            Load Project from File
          </h2>
          <DialogClose aria-label="Close load file dialog">
            <Icon icon={X} size={16} />
          </DialogClose>
        </DialogHeader>

        <div class="flex flex-col gap-5 bg-surface px-5 py-6">
          <FileDrop
            accept=".js,.py"
            onError={handleFileError}
            onFileRemoved={handleFileRemoved}
            onFileSelected={handleFileSelected}
            size="full-width"
          />

          <Show when={error()}>
            <p
              class="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-error text-sm"
              role="alert"
            >
              {error()}
            </p>
          </Show>

          <Show when={needsConfirm()}>
            <div
              class="flex flex-col gap-3 rounded-md border border-outline-variant bg-surface-variant/50 px-4 py-3"
              data-testid="overwrite-confirm"
            >
              <p class="text-on-surface text-sm leading-relaxed">
                The current buffer will be overwritten. Continue?
              </p>
            </div>
          </Show>
        </div>

        <div class="flex items-center justify-end gap-2 border-outline-variant border-t bg-surface-variant/50 px-5 py-4">
          <Show
            fallback={
              <Button onClick={closeModal} size="md" variant="ghost">
                Cancel
              </Button>
            }
            when={needsConfirm()}
          >
            <Button onClick={closeModal} size="md" variant="ghost">
              Cancel
            </Button>
            <Button onClick={commitLoad} size="md" variant="primary">
              Overwrite
            </Button>
          </Show>
        </div>
      </DialogContent>
    </Dialog>
  );
}

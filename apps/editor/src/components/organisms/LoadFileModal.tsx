import X from "lucide-solid/icons/x";
import type { VoidProps } from "solid-js";
import { createSignal, Show } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import type { FileReadResult } from "../../core/ports/file-io.ts";
import { Button } from "../atoms/Button.tsx";
import { Dialog } from "../atoms/Dialog.tsx";
import { FileDrop } from "../atoms/FileDrop.tsx";
import { Icon } from "../atoms/Icon.tsx";

function formatAllowedExtensions(extensions: readonly string[]): string {
  if (extensions.length === 0) {
    return "supported";
  }
  if (extensions.length === 1) {
    return extensions[0] ?? "";
  }
  const head = extensions.slice(0, -1).join(", ");
  const tail = extensions.at(-1) ?? "";
  return `${head} or ${tail}`;
}

/**
 * Organism that lets the user load a file from disk.
 * Shows the buffer-overwrite confirmation when needed, and surfaces
 * unsupported extensions as an inline error dynamically based on registered engines.
 * @public
 */
export function LoadFileModal(_props: VoidProps) {
  const core = useEditor();
  const [error, setError] = createSignal<string | null>(null);
  const [pendingFile, setPendingFile] = createSignal<FileReadResult | null>(
    null
  );
  const [needsConfirm, setNeedsConfirm] = createSignal(false);

  const supportedExtensions = () => core.engineRegistry.supportedExtensions;
  const acceptPattern = () => supportedExtensions().join(",");
  const unsupportedErrorMessage = () =>
    `Unsupported file type. Please choose a ${formatAllowedExtensions(supportedExtensions())} file.`;

  function resetState(): void {
    setError(null);
    setPendingFile(null);
    setNeedsConfirm(false);
  }

  function closeModal(): void {
    resetState();
    core.overlays.close("load-file");
  }

  function handleOpenChange(isOpen: boolean): void {
    if (isOpen) {
      core.overlays.open("load-file");
    } else {
      core.overlays.close("load-file");
    }
    if (!isOpen) {
      resetState();
    }
  }

  function commitLoad(targetFile?: FileReadResult | unknown): void {
    const file =
      targetFile && typeof targetFile === "object" && "extension" in targetFile
        ? (targetFile as FileReadResult)
        : pendingFile();
    if (!file) {
      return;
    }
    const engine = core.engineRegistry.resolveByExtension(file.extension);
    if (!engine) {
      return;
    }
    if (core.session.code() !== "") {
      core.commands.resetProjectState();
    }
    core.commands.loadFile({
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
      const engine = core.engineRegistry.resolveByExtension(result.extension);
      if (!engine) {
        setError(unsupportedErrorMessage());
        return;
      }
      setPendingFile(result);
      if (core.session.code() === "") {
        commitLoad(result);
      } else {
        setNeedsConfirm(true);
      }
    } catch {
      // File read failed — no state change.
    }
  }

  function handleFileError(): void {
    setError(unsupportedErrorMessage());
  }

  function handleFileRemoved(): void {
    setPendingFile(null);
    setNeedsConfirm(false);
  }

  return (
    <Dialog.Root
      isOpen={core.overlays.isOpen("load-file")}
      onOpenChange={handleOpenChange}
    >
      <Dialog.Content class="w-full max-w-md overflow-hidden p-0">
        <Dialog.Header>
          <Dialog.Title>Load Project from File</Dialog.Title>
          <Dialog.Close aria-label="Close load file dialog">
            <Icon icon={X} size={16} />
          </Dialog.Close>
        </Dialog.Header>

        <div class="bg-surface flex flex-col gap-5 px-5 py-6">
          <FileDrop
            accept={acceptPattern()}
            onError={handleFileError}
            onFileRemoved={handleFileRemoved}
            onFileSelected={handleFileSelected}
            size="full-width"
          />

          <Show when={error()}>
            <p
              class="border-error/40 bg-error/10 text-error rounded-md border px-3 py-2 text-sm"
              role="alert"
            >
              {error()}
            </p>
          </Show>

          <Show when={needsConfirm()}>
            <div
              class="border-outline-variant bg-surface-variant/50 flex flex-col gap-3 rounded-md border px-4 py-3"
              data-testid="overwrite-confirm"
            >
              <p class="text-on-surface text-sm leading-relaxed">
                The current buffer will be overwritten. Continue?
              </p>
            </div>
          </Show>
        </div>

        <div class="border-outline-variant bg-surface-variant/50 flex items-center justify-end gap-2 border-t px-5 py-4">
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
            <Button onClick={() => commitLoad()} size="md" variant="primary">
              Overwrite
            </Button>
          </Show>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

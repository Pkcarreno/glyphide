import { createEffect, createSignal, Show } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { Input } from "../atoms/Input.tsx";
import { Dialog, useDialog } from "../molecules/Dialog.tsx";

function ProjectRenameOverlay() {
  const { close } = useDialog();
  return (
    <button
      aria-hidden="true"
      class="fixed inset-0 z-50 m-0 cursor-default border-none bg-transparent p-0"
      onClick={close}
      tabIndex={-1}
      type="button"
    />
  );
}

function ProjectRenameContent() {
  const core = useEditor();
  const { isOpen, close } = useDialog();
  const [name, setName] = createSignal("");
  let inputRef: HTMLInputElement | undefined;

  createEffect(() => {
    if (isOpen()) {
      const currentName = core.project.name();
      setName(currentName === "untitled_project" ? "" : currentName);
      setTimeout(() => {
        inputRef?.focus();
        inputRef?.select();
      }, 0);
    }
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const newName = name().trim();
      if (newName) {
        core.dispatcher.dispatch({ name: newName, type: "RENAME_PROJECT" });
      }
      close();
    }
  };

  return (
    <Show when={isOpen()}>
      <div class="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]">
        <ProjectRenameOverlay />
        <div
          aria-modal="true"
          class="relative z-50 flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-2xl"
          role="dialog"
        >
          <Input
            inputSize="lg"
            onInput={(e) => setName(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter project name..."
            ref={(el) => {
              inputRef = el;
            }}
            value={name()}
            variant="ghost"
          />
        </div>
      </div>
    </Show>
  );
}

/**
 * Floating modal for renaming the active project.
 */
export function ProjectRenameModal() {
  const core = useEditor();

  const handleOpenChange = (isOpen: boolean) => {
    core.dispatcher.dispatch({
      overlayId: "project-rename",
      type: isOpen ? "OPEN_OVERLAY" : "CLOSE_OVERLAY",
    });
  };

  return (
    <Dialog
      isOpen={core.overlays.isOpen("project-rename")}
      onOpenChange={handleOpenChange}
    >
      <ProjectRenameContent />
    </Dialog>
  );
}

import { createSignal, createEffect, Show } from "solid-js";
import { useEditor } from "../../core/context";
import { Dialog, useDialog } from "../atoms/Dialog";
import { Input } from "../atoms/Input";

function ProjectRenameOverlay() {
  const { close } = useDialog();
  return (
    <div
      class="fixed inset-0 z-50 bg-transparent"
      onClick={close}
    />
  );
}

function ProjectRenameContent() {
  const core = useEditor();
  const { isOpen, close } = useDialog();
  const [name, setName] = createSignal("");
  let inputRef!: HTMLInputElement;

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
        core.dispatcher.dispatch({ type: "RENAME_PROJECT", name: newName });
      }
      close();
    }
  };

  return (
    <Show when={isOpen()}>
      <div class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
        <ProjectRenameOverlay />
        <div
          role="dialog"
          aria-modal="true"
          class="relative z-50 w-full max-w-lg flex flex-col overflow-hidden bg-surface rounded-xl border border-outline-variant shadow-2xl"
        >
          <Input
            ref={inputRef}
            variant="ghost"
            placeholder="Enter project name..."
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
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
      type: isOpen ? "OPEN_OVERLAY" : "CLOSE_OVERLAY",
      overlayId: "project-rename",
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

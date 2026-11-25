import { createSignal, onSettled, Show, untrack } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { Input } from "../atoms/Input.tsx";
import { Dialog, useDialog } from "../molecules/Dialog.tsx";

function ProjectRenameOverlay() {
  const { close } = useDialog();
  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: Backdrop overlay button is intentionally hidden from assistive tech
    <button
      aria-hidden="true"
      class="fixed inset-0 z-50 m-0 cursor-default border-none bg-transparent p-0"
      onClick={close}
      tabindex={-1}
      type="button"
    />
  );
}

function ProjectRenameForm() {
  const core = useEditor();
  const { close } = useDialog();
  const [name, setName] = createSignal(
    untrack(() => {
      const currentName = core.session.projectName();
      return currentName === "untitled_project" ? "" : currentName;
    })
  );
  let inputRef: HTMLInputElement | undefined;

  onSettled(() => {
    const timer = setTimeout(() => {
      inputRef?.focus();
      inputRef?.select();
    }, 0);
    return () => clearTimeout(timer);
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const newName = name().trim();
      if (newName) {
        core.session.setProjectName(newName);
      }
      close();
    }
  };

  return (
    <div class="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]">
      <ProjectRenameOverlay />
      <div
        aria-modal="true"
        class="border-outline-variant bg-surface relative z-50 flex w-full max-w-lg flex-col overflow-hidden rounded-xl border shadow-2xl"
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
  );
}

function ProjectRenameContent() {
  const { isOpen } = useDialog();

  return (
    <Show when={isOpen()}>
      <ProjectRenameForm />
    </Show>
  );
}

/**
 * Floating modal for renaming the active project.
 */
export function ProjectRenameModal() {
  const core = useEditor();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      core.overlays.open("project-rename");
    } else {
      core.overlays.close("project-rename");
    }
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

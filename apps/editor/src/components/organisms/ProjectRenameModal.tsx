import type { VoidProps } from "solid-js";
import { createSignal, Show, untrack } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { createAutoFocus } from "../../helpers/create-auto-focus.ts";
import { Dialog, useDialog } from "../atoms/Dialog.tsx";
import { Input } from "../atoms/Input.tsx";

function ProjectRenameOverlay(_props: VoidProps) {
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

function ProjectRenameForm(_props: VoidProps) {
  const core = useEditor();
  const { close } = useDialog();
  const [name, setName] = createSignal(
    untrack(() => {
      const currentName = core.session.projectName();
      return currentName === "untitled_project" ? "" : currentName;
    })
  );

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
          ref={[createAutoFocus<HTMLInputElement>({ select: true })]}
          value={name()}
          variant="ghost"
        />
      </div>
    </div>
  );
}

function ProjectRenameContent(_props: VoidProps) {
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
export function ProjectRenameModal(_props: VoidProps) {
  const core = useEditor();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      core.overlays.open("project-rename");
    } else {
      core.overlays.close("project-rename");
    }
  };

  return (
    <Dialog.Root
      isOpen={core.overlays.isOpen("project-rename")}
      onOpenChange={handleOpenChange}
    >
      <ProjectRenameContent />
    </Dialog.Root>
  );
}

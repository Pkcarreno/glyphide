import type { VoidProps } from "solid-js";
import { createSignal, untrack } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { createAutoFocus } from "../../helpers/create-auto-focus.ts";
import { Input } from "../atoms/Input.tsx";
import { OverlayDialog } from "../molecules/OverlayDialog.tsx";

function ProjectRenameForm(_props: VoidProps) {
  const core = useEditor();
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
      core.overlays.close("project-rename");
    }
  };

  return (
    <Input
      inputSize="lg"
      onInput={(e) => setName(e.currentTarget.value)}
      onKeyDown={handleKeyDown}
      placeholder="Enter project name..."
      ref={[createAutoFocus<HTMLInputElement>({ select: true })]}
      value={name()}
      variant="ghost"
    />
  );
}

/**
 * Floating modal for renaming the active project.
 */
export function ProjectRenameModal(_props: VoidProps) {
  return (
    <OverlayDialog.Root overlayId="project-rename">
      <OverlayDialog.Content align="top" class="max-w-lg p-0">
        <ProjectRenameForm />
      </OverlayDialog.Content>
    </OverlayDialog.Root>
  );
}

import { EngineSelectorCommand } from "./EngineSelectorCommand.tsx";
import { ProjectRenameModal } from "./ProjectRenameModal.tsx";
import { SettingsModal } from "./SettingsModal.tsx";

/**
 * Orchestrates all application-level floating elements.
 * Renders modals, command menus, and overlays decoupled from normal view flow.
 */
export function FloatingLayer() {
  return (
    <>
      <SettingsModal />
      <EngineSelectorCommand />
      <ProjectRenameModal />
    </>
  );
}

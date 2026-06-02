import { SettingsModal } from "./SettingsModal";
import { EngineSelectorCommand } from "./EngineSelectorCommand";
import { ProjectRenameModal } from "./ProjectRenameModal";

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

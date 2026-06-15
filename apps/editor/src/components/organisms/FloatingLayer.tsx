import { EngineSelectorCommand } from "./EngineSelectorCommand.tsx";
import { EngineSettingsPopover } from "./EngineSettingsPopover.tsx";
import { ProjectRenameModal } from "./ProjectRenameModal.tsx";
import { SettingsModal } from "./SettingsModal.tsx";
import { ShareModal } from "./ShareModal.tsx";
import { Toaster } from "./Toaster.tsx";

/**
 * Orchestrates all application-level floating elements.
 * Renders modals, command menus, and overlays decoupled from normal view flow.
 */
export function FloatingLayer() {
  return (
    <>
      <SettingsModal />
      <EngineSelectorCommand />
      <EngineSettingsPopover />
      <ProjectRenameModal />
      <ShareModal />
      <Toaster />
    </>
  );
}

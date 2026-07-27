import { EngineSelectorCommand } from "./EngineSelectorCommand.tsx";
import { EngineSettingsModal } from "./EngineSettingsModal.tsx";
import { LoadFileModal } from "./LoadFileModal.tsx";
import { ProjectRenameModal } from "./ProjectRenameModal.tsx";
import { SettingsModal } from "./SettingsModal.tsx";
import { ShareModal } from "./ShareModal.tsx";
import { Toaster } from "./Toaster.tsx";
import { TrustRequiredModal } from "./TrustRequiredModal.tsx";

/**
 * Orchestrates all application-level floating elements.
 * Renders modals, command menus, and overlays decoupled from normal view flow.
 */
export function FloatingLayer() {
  return (
    <>
      <SettingsModal />
      <EngineSelectorCommand />
      <EngineSettingsModal />
      <ProjectRenameModal />
      <ShareModal />
      <LoadFileModal />
      <TrustRequiredModal />
      <Toaster />
    </>
  );
}

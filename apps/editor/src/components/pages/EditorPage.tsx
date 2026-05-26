import { createSignal } from "solid-js";
import { Header } from "../organisms/Header";
import { StatusBar } from "../organisms/StatusBar";
import { EditorPane } from "../organisms/EditorPane";
import { ConsolePane } from "../organisms/ConsolePane";
import { SettingsModal } from "../organisms/SettingsModal";
import { WorkspaceLayout } from "../templates/WorkspaceLayout";
import { useTheme } from "../../stores/theme";
import type { SystemStatus } from "../../types/system";

/**
 * Main application page component.
 * Manages the top-level application state (settings modal, execution status)
 * and injects it into the WorkspaceLayout and Organisms.
 */
function EditorPage() {
  useTheme();
  
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);
  const [execStatus, setExecStatus] = createSignal<SystemStatus>("idle");

  function handleSettingsClick() {
    setIsSettingsOpen(true);
  }

  function handleShareClick() {
    alert("Share functionality coming soon!");
  }

  function handleRunClick() {
    setExecStatus("running");
    
    setTimeout(() => {
      setExecStatus("error");
    }, 1500);
  }

  function handleRunOptionsClick() {
    alert("Run options coming soon!");
  }

  return (
    <>
      <WorkspaceLayout
        header={
          <Header
            onSettingsClick={handleSettingsClick}
            onShareClick={handleShareClick}
            onRunClick={handleRunClick}
            onRunOptionsClick={handleRunOptionsClick}
          />
        }
        editorPane={<EditorPane />}
        consolePane={<ConsolePane />}
        statusBar={
          <StatusBar
            status={execStatus()}
          />
        }
      />
      <SettingsModal
        isOpen={isSettingsOpen()}
        onOpenChange={setIsSettingsOpen}
      />
    </>
  );
}

export default EditorPage;

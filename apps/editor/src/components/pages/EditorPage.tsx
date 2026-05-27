import { createSignal, createEffect } from "solid-js";
import { Header } from "../organisms/Header";
import { StatusBar } from "../organisms/StatusBar";
import { EditorPane } from "../organisms/EditorPane";
import { ConsolePane } from "../organisms/ConsolePane";
import { SettingsModal } from "../organisms/SettingsModal";
import { WorkspaceLayout } from "../templates/WorkspaceLayout";
import { useEditor } from "../../core/context";

/**
 * Main application page component.
 * Manages the top-level application state (settings modal, execution status)
 * and injects it into the WorkspaceLayout and Organisms.
 */
function EditorPage() {
  const core = useEditor();
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);

  createEffect(() => {
    const theme = core.settings.settings.theme;
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  });

  function handleSettingsClick() {
    setIsSettingsOpen(true);
  }

  function handleShareClick() {
    alert("Share functionality coming soon!");
  }

  return (
    <>
      <WorkspaceLayout
        header={
          <Header
            onSettingsClick={handleSettingsClick}
            onShareClick={handleShareClick}
          />
        }
        editorPane={<EditorPane />}
        consolePane={<ConsolePane />}
        statusBar={<StatusBar />}
      />
      <SettingsModal
        isOpen={isSettingsOpen()}
        onOpenChange={setIsSettingsOpen}
      />
    </>
  );
}

export default EditorPage;

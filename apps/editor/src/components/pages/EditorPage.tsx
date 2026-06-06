import { createEffect } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { ConsolePane } from "../organisms/ConsolePane.tsx";
import { EditorPane } from "../organisms/EditorPane.tsx";
import { FloatingLayer } from "../organisms/FloatingLayer.tsx";
import { Header } from "../organisms/Header.tsx";
import { StatusBar } from "../organisms/StatusBar.tsx";
import { WorkspaceLayout } from "../templates/WorkspaceLayout.tsx";

/**
 * Main application page component.
 * Manages the top-level application state (settings modal, execution status)
 * and injects it into the WorkspaceLayout and Organisms.
 */
function EditorPage() {
  const core = useEditor();

  createEffect(() => {
    const theme = core.settings.settings.theme;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = () => {
      const isDark =
        theme === "dark" || (theme === "system" && mediaQuery.matches);
      document.documentElement.classList.toggle("dark", isDark);
    };

    updateTheme();

    if (theme === "system") {
      mediaQuery.addEventListener("change", updateTheme);
      return () => mediaQuery.removeEventListener("change", updateTheme);
    }
  });

  createEffect(() => {
    const { uiFontSize, bufferFontSize, bufferLineHeight } =
      core.settings.settings;
    const uiScale = uiFontSize / 14;
    const bufferScale = bufferFontSize / 15;
    document.documentElement.style.setProperty(
      "--ui-scale",
      uiScale.toString()
    );
    document.documentElement.style.setProperty(
      "--buffer-scale",
      bufferScale.toString()
    );
    document.documentElement.style.setProperty(
      "--buffer-line-height",
      bufferLineHeight.toString()
    );
  });

  createEffect(() => {
    document.title = `${core.project.displayName()} - Glyphide`;
  });

  return (
    <>
      <WorkspaceLayout
        consolePane={<ConsolePane />}
        editorPane={<EditorPane />}
        header={<Header />}
        statusBar={<StatusBar />}
      />
      <FloatingLayer />
    </>
  );
}

export default EditorPage;

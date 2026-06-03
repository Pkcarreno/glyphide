import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { cn } from "../../helpers/cn.ts";
import { CodeField } from "../atoms/CodeField/CodeField.tsx";

interface EditorPaneProps
  extends Omit<JSX.HTMLAttributes<HTMLElement>, "onChange"> {
  class?: string;
}

/**
 * Main code editor organism.
 */
function EditorPane(props: EditorPaneProps) {
  const [local, rest] = splitProps(props, ["class"]);
  const core = useEditor();

  function handleValueChange(value: string) {
    core.dispatcher.dispatch({ type: "UPDATE_BUFFER", content: value });
  }

  function handleCursorChange(
    line: number,
    column: number,
    selectionLength: number,
    selectionLines: number
  ) {
    core.dispatcher.dispatch({
      type: "UPDATE_CURSOR_POSITION",
      line,
      column,
      selectionLength,
      selectionLines,
    });
  }

  const isDark = () => {
    const theme = core.settings.settings.theme;
    if (theme === "dark") {
      return true;
    }
    if (theme === "light") {
      return false;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  };

  return (
    <section
      class={cn("flex h-full flex-1 flex-col overflow-hidden", local.class)}
      {...rest}
    >
      <CodeField
        isDark={isDark()}
        isWordWrapEnabled={core.settings.settings.isWordWrapEnabled}
        language={core.engine.activeLanguage()}
        onCursorChange={handleCursorChange}
        onValueChange={handleValueChange}
        value={core.buffer.content()}
      />
    </section>
  );
}

export { EditorPane, type EditorPaneProps };

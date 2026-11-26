import type { JSX } from "@solidjs/web";
import { omit } from "solid-js";
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
  const rest = omit(props, "class");
  const core = useEditor();

  function handleValueChange(value: string) {
    core.commands.updateBuffer(value);
  }

  function handleCursorChange(
    line: number,
    column: number,
    selectionLength: number,
    selectionLines: number
  ) {
    core.session.setCursorPosition(
      line,
      column,
      selectionLength,
      selectionLines
    );
  }

  return (
    <section
      class={cn("flex h-full flex-1 flex-col overflow-hidden", props.class)}
      {...rest}
    >
      <CodeField
        isDark={core.settings.resolvedTheme() === "dark"}
        isReadOnly={core.session.isTrustRequired()}
        isWordWrapEnabled={core.settings.settings.isWordWrapEnabled}
        language={core.engine.activeLanguage()}
        onCursorChange={handleCursorChange}
        onValueChange={handleValueChange}
        value={core.session.code()}
      />
    </section>
  );
}

/** @public */
export { EditorPane, type EditorPaneProps };

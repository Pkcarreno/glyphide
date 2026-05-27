import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../../helpers/cn";
import { CodeField } from "../atoms/CodeField/CodeField";
import { useEditor } from "../../core/context";

interface EditorPaneProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "onChange"> {
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

  const isDark = () => {
    const theme = core.settings.settings.theme;
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  };

  return (
    <section
      class={cn("flex-1 h-full overflow-hidden flex flex-col", local.class)}
      {...rest}
    >
      <CodeField
        value={core.buffer.content()}
        language="javascript"
        isDark={isDark()}
        onValueChange={handleValueChange}
      />
    </section>
  );
}

export { EditorPane, type EditorPaneProps };

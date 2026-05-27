import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../../helpers/cn";
import { CodeField } from "../atoms/CodeField/CodeField";

interface EditorPaneProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "onChange"> {
  class?: string;
  value?: string;
  language?: "javascript" | "python";
  isDark?: boolean;
  onValueChange?: (value: string) => void;
}

/**
 * Main code editor organism.
 */
function EditorPane(props: EditorPaneProps) {
  const [local, rest] = splitProps(props, [
    "class",
    "value",
    "language",
    "isDark",
    "onValueChange",
  ]);

  return (
    <section
      class={cn("flex-1 h-full overflow-hidden flex flex-col", local.class)}
      {...rest}
    >
      <CodeField
        value={local.value}
        language={local.language || "javascript"}
        isDark={local.isDark}
        onValueChange={local.onValueChange}
      />
    </section>
  );
}

export { EditorPane, type EditorPaneProps };

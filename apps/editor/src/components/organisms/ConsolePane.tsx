import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { ConsoleMessage } from "../molecules/ConsoleMessage";
import { Icon } from "../atoms/Icon";
import { Trash2, Pin } from "lucide-solid";
import { cn } from "../../helpers/cn";

/**
 * Props for the ConsolePane component.
 */
interface ConsolePaneProps extends JSX.HTMLAttributes<HTMLElement> {
  class?: string;
}

/**
 * Output console organism.
 * Displays execution logs using ConsoleMessage molecules.
 * Currently renders a static skeleton based on mockups.
 */
function ConsolePane(props: ConsolePaneProps) {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <section
      class={cn(
        "bg-surface flex flex-col h-full overflow-hidden w-full",
        local.class,
      )}
      {...rest}
    >
      <div class="flex items-center justify-between px-4 py-1.5 border-b border-outline-variant shrink-0">
        <h2 class="font-mono text-section-header text-on-surface-variant select-none uppercase tracking-widest">
          Output
        </h2>
        <div class="flex items-center gap-1">
          <button class="flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-status-bar uppercase tracking-wider font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors cursor-pointer border border-transparent hover:border-outline-variant">
            <Icon icon={Pin} size={10} />
            Persist
          </button>
          <button class="flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-status-bar uppercase tracking-wider font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors cursor-pointer border border-transparent hover:border-outline-variant">
            <Icon icon={Trash2} size={10} />
            Clear
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto py-2 flex flex-col">
        <ConsoleMessage type="system" message="Engine initialized in 42ms" />
        <ConsoleMessage type="log" message="Server running at http://localhost:3000" />
        <ConsoleMessage type="warn" message="[Warn] Deprecated API usage detected" />
        <ConsoleMessage type="log" message="> GET /" />
        <ConsoleMessage
          type="error"
          message="Uncaught ReferenceError: foo is not defined\n    at main (index.ts:14:5)"
          class="whitespace-pre-wrap"
        />
        <ConsoleMessage type="system" message="Execution terminated (code 1)" />
      </div>
    </section>
  );
}

export { ConsolePane, type ConsolePaneProps };

import Pin from "lucide-solid/icons/pin";
import Trash2 from "lucide-solid/icons/trash-2";
import type { JSX } from "solid-js";
import { For, splitProps } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { cn } from "../../helpers/cn.ts";
import { Icon } from "../atoms/Icon.tsx";
import { ConsoleMessage } from "../molecules/ConsoleMessage.tsx";

/**
 * Props for the ConsolePane component.
 */
interface ConsolePaneProps extends JSX.HTMLAttributes<HTMLElement> {
  class?: string;
}

/**
 * Output console organism.
 * Displays execution logs using ConsoleMessage molecules.
 */
function ConsolePane(props: ConsolePaneProps) {
  const [local, rest] = splitProps(props, ["class"]);
  const core = useEditor();

  function handleClear() {
    core.dispatcher.dispatch({ type: "CLEAR_OUTPUT" });
  }

  return (
    <section
      class={cn(
        "flex h-full w-full flex-col overflow-hidden bg-surface",
        local.class
      )}
      {...rest}
    >
      <div class="flex shrink-0 items-center justify-between border-outline-variant border-b px-4 py-1.5">
        <h2 class="select-none font-mono text-on-surface-variant text-section-header uppercase tracking-widest">
          Output
        </h2>
        <div class="flex items-center gap-1">
          <button
            class="flex cursor-pointer items-center gap-1 rounded-sm border border-transparent px-1.5 py-0.5 font-medium text-on-surface-variant text-status-bar uppercase tracking-wider transition-colors hover:border-outline-variant hover:bg-surface-variant hover:text-on-surface"
            type="button"
          >
            <Icon icon={Pin} size={10} />
            Persist
          </button>
          <button
            class="flex cursor-pointer items-center gap-1 rounded-sm border border-transparent px-1.5 py-0.5 font-medium text-on-surface-variant text-status-bar uppercase tracking-wider transition-colors hover:border-outline-variant hover:bg-surface-variant hover:text-on-surface"
            onClick={handleClear}
            type="button"
          >
            <Icon icon={Trash2} size={10} />
            Clear
          </button>
        </div>
      </div>

      <div class="flex flex-1 flex-col overflow-auto py-2">
        <For each={core.output.entries()}>
          {(entry) => (
            <ConsoleMessage
              class="whitespace-pre-wrap"
              message={String(entry.data)}
              type={
                entry.type as
                  | "error"
                  | "log"
                  | "warn"
                  | "system"
                  | null
                  | undefined
              }
            />
          )}
        </For>
      </div>
    </section>
  );
}

export { ConsolePane, type ConsolePaneProps };

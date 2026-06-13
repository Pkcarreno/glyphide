import Trash2 from "lucide-solid/icons/trash-2";
import type { JSX } from "solid-js";
import { For, splitProps } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import type { ConsoleVariant } from "../../core/engine/output-formatter.ts";
import {
  defaultFormat,
  isConsoleTokenArray,
} from "../../core/engine/output-formatter.ts";
import { cn } from "../../helpers/cn.ts";
import { ConsoleTokenView } from "../atoms/ConsoleTokenView/ConsoleTokenView.tsx";
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
 * Resolves the active engine's `outputFormatter` reactively and applies it to
 * each `OutputEntry`. System and error entries emitted by the EngineModel or
 * Orchestrator always bypass the engine formatter and use `defaultFormat`.
 */
function ConsolePane(props: ConsolePaneProps) {
  const [local, rest] = splitProps(props, ["class"]);
  const core = useEditor();

  function handleClear() {
    core.dispatcher.dispatch({ type: "CLEAR_OUTPUT" });
  }

  /**
   * Returns the formatter for the currently active engine, if any.
   * Reading `activeEngineId()` inside a reactive context tracks updates.
   */
  function getFormatter() {
    try {
      const engineDefinition = core.engineRegistry.getDefinition(
        core.engine.activeEngineId()
      );
      return engineDefinition.outputFormatter;
    } catch {
      return;
    }
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
        <h2 class="select-none font-bold font-sans text-on-surface-variant text-section-header uppercase tracking-widest">
          Output
        </h2>
        <div class="flex items-center gap-1">
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
          {(entry) => {
            // System and EngineModel-emitted error entries always use defaultFormat.
            // These are emitted by the Orchestrator / EngineModel directly and
            // always carry string data — never ConsoleToken[].
            const isBypassEntry =
              entry.type === "system" || entry.type === "error";

            const result = isBypassEntry
              ? defaultFormat(entry)
              : (getFormatter()?.format(entry) ?? defaultFormat(entry));

            const variant = result.variant as ConsoleVariant;

            if (result.tokens && isConsoleTokenArray(result.tokens)) {
              return (
                <ConsoleMessage class="whitespace-pre-wrap" type={variant}>
                  <ConsoleTokenView tokens={result.tokens} />
                </ConsoleMessage>
              );
            }

            return (
              <ConsoleMessage
                class="whitespace-pre-wrap"
                message={result.text ?? ""}
                type={variant}
              />
            );
          }}
        </For>
      </div>
    </section>
  );
}

export { ConsolePane, type ConsolePaneProps };

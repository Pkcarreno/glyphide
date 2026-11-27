import type { JSX } from "@solidjs/web";
import Trash from "lucide-solid/icons/trash";
import type { Accessor, VoidProps } from "solid-js";
import { Errored, omit, Show } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import type {
  ConsoleVariant,
  RenderedOutput,
} from "../../core/engine/output-formatter.ts";
import { cn } from "../../helpers/cn.ts";
import type { FlatConsoleItem } from "../../helpers/console-hierarchy.ts";
import { createConsoleProjection } from "../../helpers/console-projection.ts";
import { formatCompactCount } from "../../helpers/format-compact-count.ts";
import { ConsoleTableView } from "../atoms/ConsoleTableView.tsx";
import { ExpandableScope } from "../atoms/ExpandableNode.tsx";
import { Icon } from "../atoms/Icon.tsx";
import { Tooltip } from "../atoms/Tooltip.tsx";
import { VirtualList } from "../atoms/VirtualList.tsx";
import { ConsoleGroupView } from "../molecules/ConsoleGroupView.tsx";
import { ConsoleMessage } from "../molecules/ConsoleMessage.tsx";
import { ConsoleTokenView } from "../molecules/ConsoleTokenView/ConsoleTokenView.tsx";

type MessageVariant = Exclude<
  ConsoleVariant,
  "group" | "groupCollapsed" | "groupEnd"
>;

interface ConsolePaneProps
  extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  class?: string;
}

/** Safely resolves a raw string representation for fallback message rendering. */
function getRawFallback(rendered: RenderedOutput, err: unknown): string {
  if (rendered.text !== undefined) {
    return rendered.text;
  }
  if (rendered.tokens !== undefined) {
    try {
      return JSON.stringify(rendered.tokens);
    } catch {
      // Tokens could not be serialized
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

/** Renders the inner content of a console message entry. */
function renderMessageContent(
  rendered: RenderedOutput,
  variant: MessageVariant
): JSX.Element {
  if (!rendered.tokens) {
    return (
      <ConsoleMessage
        class="whitespace-pre-wrap"
        message={rendered.text ?? ""}
        type={variant}
      />
    );
  }

  if (variant === "table" && rendered.tokens.length > 0) {
    return (
      <ConsoleMessage type={variant}>
        <ConsoleTableView token={rendered.tokens[0]} />
        <Show when={rendered.tokens.length > 1}>
          <ConsoleTokenView tokens={rendered.tokens.slice(1)} />
        </Show>
      </ConsoleMessage>
    );
  }

  return (
    <ConsoleMessage class="whitespace-pre-wrap" type={variant}>
      <ConsoleTokenView tokens={rendered.tokens} />
    </ConsoleMessage>
  );
}

function ConsolePane(props: VoidProps<ConsolePaneProps>) {
  const rest = omit(props, "class");
  const core = useEditor();

  const projection = createConsoleProjection({
    entries: core.output.entries,
    formatter: () => {
      try {
        return core.engineRegistry.getDefinition(core.engine.activeEngineId())
          .outputFormatter;
      } catch {
        // Fallback to default formatter when active engine is unavailable
      }
    },
  });

  function handleClear() {
    core.output.clearEntries();
    projection.reset();
  }

  function renderFlatNode(
    item: FlatConsoleItem,
    index: Accessor<number>
  ): JSX.Element {
    // Resolve the latest item reactively so preserved keyed rows reflect updated collapse or depth state.
    const currentItem = () => projection.visibleItems()[index()] ?? item;
    const depthStyle = () => ({
      "padding-left": `${currentItem().depth * 22}px`,
    });

    if (item.isGroup) {
      return (
        <div class="w-full" style={depthStyle()}>
          <ConsoleGroupView
            item={currentItem()}
            onToggle={() => projection.toggleGroup(currentItem().id)}
          />
        </div>
      );
    }

    const { rendered } = item;
    const variant = rendered.variant as MessageVariant;

    return (
      <div class="w-full" style={depthStyle()}>
        <Errored
          fallback={(err) => (
            <ConsoleMessage
              class="whitespace-pre-wrap"
              message={getRawFallback(rendered, err())}
              type={variant}
            />
          )}
        >
          {renderMessageContent(rendered, variant)}
        </Errored>
      </div>
    );
  }

  return (
    <section
      class={cn(
        "bg-surface flex h-full w-full flex-col overflow-hidden",
        props.class
      )}
      {...rest}
    >
      <div class="border-outline-variant flex shrink-0 items-center justify-between border-b px-4 py-1.5">
        <div class="flex items-baseline gap-1.5">
          <h2 class="text-on-surface-variant text-section-header font-sans font-bold tracking-widest uppercase select-none">
            Output
          </h2>
          <Show when={core.output.stats().totalDropped > 0}>
            <Tooltip
              as="span"
              class="inline-flex items-baseline"
              meta={`${core.output.stats().workerDropped.toLocaleString()} rate limit / ${core.output.stats().bufferDropped.toLocaleString()} buffer limit`}
              position="bottom"
              tabindex={0}
              text={`${core.output.stats().totalDropped.toLocaleString()} omitted log entries`}
            >
              <span class="text-on-surface-variant/70 text-section-header hover:text-on-surface cursor-help font-mono font-normal tracking-normal lowercase tabular-nums transition-colors select-none">
                ({formatCompactCount(core.output.stats().totalDropped)} omitted)
              </span>
            </Tooltip>
          </Show>
        </div>
        <div class="flex items-center gap-1">
          <button
            class="text-on-surface-variant text-status-bar hover:border-outline-variant hover:bg-surface-variant hover:text-on-surface focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex cursor-pointer items-center gap-1 rounded-sm border border-transparent px-1.5 py-0.5 font-medium tracking-wider uppercase transition-colors outline-none focus-visible:ring-3 aria-invalid:ring-3 pointer-coarse:min-h-11 pointer-coarse:gap-1.5 pointer-coarse:px-3"
            onClick={handleClear}
            type="button"
          >
            <Icon icon={Trash} size={10} />
            Clear
          </button>
        </div>
      </div>

      <div class="relative flex flex-1 flex-col overflow-hidden py-2">
        <ExpandableScope>
          <VirtualList
            class="h-full w-full"
            getKey={(item) => item.entry.id}
            itemHeight={24}
            items={projection.visibleItems()}
            renderItem={(item, index) => renderFlatNode(item, index)}
          />
        </ExpandableScope>
      </div>
    </section>
  );
}

/** @public */
export { ConsolePane, type ConsolePaneProps };

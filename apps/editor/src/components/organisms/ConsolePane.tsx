import Trash from "lucide-solid/icons/trash";
import type { JSX } from "solid-js";
import { createMemo, createSignal, ErrorBoundary, splitProps } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import type {
  ConsoleVariant,
  RenderedOutput,
} from "../../core/engine/output-formatter.ts";
import {
  defaultFormat,
  type OutputFormatter,
} from "../../core/engine/output-formatter.ts";

import type { OutputEntry } from "../../core/models/output.ts";
import { cn } from "../../helpers/cn.ts";
import {
  type FlatConsoleItem,
  flattenConsoleEntries,
} from "../../helpers/console-hierarchy.ts";
import { ConsoleTableView } from "../atoms/ConsoleTableView.tsx";
import { Icon } from "../atoms/Icon.tsx";
import { VirtualList } from "../atoms/VirtualList.tsx";
import { ConsoleGroupView } from "../molecules/ConsoleGroupView.tsx";
import { ConsoleMessage } from "../molecules/ConsoleMessage.tsx";
import { ConsoleTokenView } from "../molecules/ConsoleTokenView/ConsoleTokenView.tsx";

type MessageVariant = Exclude<
  ConsoleVariant,
  "group" | "groupCollapsed" | "groupEnd"
>;

interface ConsolePaneProps extends JSX.HTMLAttributes<HTMLElement> {
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
        {rendered.tokens.length > 1 && (
          <ConsoleTokenView tokens={rendered.tokens.slice(1)} />
        )}
      </ConsoleMessage>
    );
  }

  return (
    <ConsoleMessage class="whitespace-pre-wrap" type={variant}>
      <ConsoleTokenView tokens={rendered.tokens} />
    </ConsoleMessage>
  );
}

function ConsolePane(props: ConsolePaneProps) {
  const [local, rest] = splitProps(props, ["class"]);
  const core = useEditor();

  const [toggledGroups, setToggledGroups] = createSignal<Set<number>>(
    new Set(),
    { equals: false }
  );

  function handleClear() {
    core.output.clearEntries();
    setToggledGroups(new Set<number>());
  }

  function getFormatter(): OutputFormatter | undefined {
    try {
      const engineDefinition = core.engineRegistry.getDefinition(
        core.engine.activeEngineId()
      );
      return engineDefinition.outputFormatter;
    } catch {
      // Fallback
    }
  }

  function formatEntry(entry: OutputEntry) {
    const isBypassEntry =
      entry.type === "system" ||
      (entry.type === "error" && typeof entry.data === "string");

    if (isBypassEntry) {
      return defaultFormat(entry);
    }

    const formatter = getFormatter();
    return formatter ? formatter.format(entry) : defaultFormat(entry);
  }

  // Referential Stability Cache for Formatted Entries
  let cachedFormatted: { entry: OutputEntry; rendered: RenderedOutput }[] = [];

  // Incremental Cache for Flat Items
  const cachedVisibleItems: FlatConsoleItem[] = [];
  const cachedGroupStack: { id: number; hidden: boolean }[] = [];
  let lastProcessedEntriesCount = 0;

  // Track versions to force full O(N) recalculation only when groups are toggled
  let lastToggledVersion = 0;
  const [toggledVersion, setToggledVersion] = createSignal(0);

  const formattedEntries = createMemo(() => {
    const current = core.output.entries();

    if (current.length < cachedFormatted.length) {
      cachedFormatted = cachedFormatted.slice(0, current.length);
      // If output was cleared/truncated, invalidate the incremental cache
      lastProcessedEntriesCount = 0;
      cachedVisibleItems.length = 0;
      cachedGroupStack.length = 0;
    }

    for (let i = cachedFormatted.length; i < current.length; i += 1) {
      cachedFormatted.push({
        entry: current[i],
        rendered: formatEntry(current[i]),
      });
    }

    return [...cachedFormatted];
  }, []);

  const visibleItems = createMemo(() => {
    const entries = formattedEntries();
    const currentToggledVersion = toggledVersion();
    const toggled = toggledGroups();

    let startIndex = lastProcessedEntriesCount;

    // If the user toggled a group, we must recalculate visibility from the start
    if (currentToggledVersion !== lastToggledVersion) {
      startIndex = 0;
      lastToggledVersion = currentToggledVersion;
    }

    flattenConsoleEntries(
      entries,
      (id, startsCollapsed) => {
        const isToggled = toggled.has(id);
        return startsCollapsed ? !isToggled : isToggled;
      },
      startIndex,
      cachedVisibleItems,
      cachedGroupStack
    );

    lastProcessedEntriesCount = entries.length;

    // Return a shallow copy so the memo output reference changes, triggering VirtualList
    return [...cachedVisibleItems];
  });

  function toggleGroup(id: number) {
    const next = new Set<number>(toggledGroups());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setToggledGroups(next);
    setToggledVersion((v) => v + 1); // Triggers full recalculation
  }

  function renderFlatNode(item: FlatConsoleItem): JSX.Element {
    const depthStyle = {
      "padding-left": `${item.depth * 22}px`,
    };

    if (item.isGroup) {
      return (
        <div class="w-full" style={depthStyle}>
          <ConsoleGroupView item={item} onToggle={() => toggleGroup(item.id)} />
        </div>
      );
    }

    const { rendered } = item;
    const variant = rendered.variant as MessageVariant;

    return (
      <div class="w-full" style={depthStyle}>
        <ErrorBoundary
          fallback={(err) => (
            <ConsoleMessage
              class="whitespace-pre-wrap"
              message={getRawFallback(rendered, err)}
              type={variant}
            />
          )}
        >
          {renderMessageContent(rendered, variant)}
        </ErrorBoundary>
      </div>
    );
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
            class="flex pointer-coarse:min-h-11 cursor-pointer items-center gap-1 pointer-coarse:gap-1.5 rounded-sm border border-transparent pointer-coarse:px-3 px-1.5 py-0.5 font-medium text-on-surface-variant text-status-bar uppercase tracking-wider outline-none transition-colors hover:border-outline-variant hover:bg-surface-variant hover:text-on-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
            onClick={handleClear}
            type="button"
          >
            <Icon icon={Trash} size={10} />
            Clear
          </button>
        </div>
      </div>

      <div class="relative flex flex-1 flex-col overflow-hidden py-2">
        <VirtualList
          class="h-full w-full"
          itemHeight={24}
          items={visibleItems()}
          renderItem={(item) => renderFlatNode(item)}
        />
      </div>
    </section>
  );
}

/** @public */
export { ConsolePane, type ConsolePaneProps };

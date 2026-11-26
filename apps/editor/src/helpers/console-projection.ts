import type { Accessor } from "solid-js";
import { createMemo, createSignal, untrack } from "solid-js";
import type {
  OutputFormatter,
  RenderedOutput,
} from "../core/engine/output-formatter.ts";
import { defaultFormat } from "../core/engine/output-formatter.ts";
import type { OutputEntry } from "../core/models/output.ts";
import type { FlatConsoleItem } from "./console-hierarchy.ts";
import { flattenConsoleEntries } from "./console-hierarchy.ts";

/**
 * Dependencies required to construct a `ConsoleProjection`.
 *
 * @public
 */
export interface ConsoleProjectionDeps {
  /** Reactive accessor for raw console output entries. */
  entries: Accessor<readonly OutputEntry[]>;
  /** Optional reactive accessor returning the active engine output formatter. */
  formatter?: Accessor<OutputFormatter | undefined>;
}

/**
 * Reactive projection over raw console output entries that handles incremental
 * formatting, group collapse toggles, and flattened list derivation.
 *
 * @public
 */
export interface ConsoleProjection {
  /** Clears all group toggle overrides. */
  reset: () => void;
  /** Toggles the collapsed state of a console group by flat item id. */
  toggleGroup: (id: number) => void;
  /** Reactive accessor for the flattened list of currently visible console items. */
  visibleItems: Accessor<FlatConsoleItem[]>;
}

interface FormattedEntry {
  entry: OutputEntry;
  rendered: RenderedOutput;
}

interface FormattedCacheState {
  entries: readonly OutputEntry[];
  formatted: readonly FormattedEntry[];
}

interface GroupStackFrame {
  hidden: boolean;
  id: number;
}

interface FlattenedCacheState {
  formatted: readonly FormattedEntry[];
  groupStack: readonly GroupStackFrame[];
  toggled: ReadonlySet<OutputEntry>;
  visibleItems: FlatConsoleItem[];
}

function formatEntry(
  entry: OutputEntry,
  formatter: OutputFormatter | undefined
): RenderedOutput {
  const isBypassEntry =
    entry.type === "system" ||
    (entry.type === "error" && typeof entry.data === "string");

  if (isBypassEntry) {
    return defaultFormat(entry);
  }

  return formatter ? formatter.format(entry) : defaultFormat(entry);
}

function getCommonPrefixLength(
  previous: readonly FormattedEntry[],
  current: readonly OutputEntry[]
): number {
  const limit = Math.min(previous.length, current.length);
  let index = 0;
  while (index < limit && previous[index].entry === current[index]) {
    index += 1;
  }
  return index;
}

function hasSameFormattedPrefix(
  previous: readonly FormattedEntry[],
  current: readonly FormattedEntry[]
): boolean {
  if (current.length < previous.length) {
    return false;
  }
  for (let index = 0; index < previous.length; index += 1) {
    if (current[index] !== previous[index]) {
      return false;
    }
  }
  return true;
}

const INITIAL_FORMATTED_STATE: FormattedCacheState = {
  entries: [],
  formatted: [],
};

const INITIAL_FLATTENED_STATE: FlattenedCacheState = {
  formatted: [],
  groupStack: [],
  toggled: new Set(),
  visibleItems: [],
};

function computeNextFormattedState(
  previous: FormattedCacheState,
  current: readonly OutputEntry[],
  getFormatter?: Accessor<OutputFormatter | undefined>
): FormattedCacheState {
  if (current.length === 0) {
    return previous.formatted.length === 0
      ? previous
      : { entries: current, formatted: [] };
  }

  if (previous.entries === current) {
    return previous;
  }

  const previousFormatted = previous.formatted;
  const prefixLength = getCommonPrefixLength(previousFormatted, current);

  if (
    prefixLength === current.length &&
    current.length === previousFormatted.length
  ) {
    return { entries: current, formatted: previousFormatted };
  }

  if (prefixLength === current.length) {
    return {
      entries: current,
      formatted: previousFormatted.slice(0, current.length),
    };
  }

  const activeFormatter = getFormatter?.();

  if (prefixLength === 0 && previousFormatted.length > 0) {
    const previousByEntry = new Map<OutputEntry, FormattedEntry>();
    for (const item of previousFormatted) {
      previousByEntry.set(item.entry, item);
    }
    const rebuilt: FormattedEntry[] = [];
    for (const entry of current) {
      rebuilt.push(
        previousByEntry.get(entry) ?? {
          entry,
          rendered: formatEntry(entry, activeFormatter),
        }
      );
    }
    return { entries: current, formatted: rebuilt };
  }

  const added: FormattedEntry[] = [];
  for (let index = prefixLength; index < current.length; index += 1) {
    const entry = current[index];
    added.push({
      entry,
      rendered: formatEntry(entry, activeFormatter),
    });
  }

  const base =
    prefixLength === previousFormatted.length
      ? previousFormatted
      : previousFormatted.slice(0, prefixLength);

  return {
    entries: current,
    formatted: base.concat(added),
  };
}

function computeNextFlattenedState(
  previous: FlattenedCacheState,
  formatted: readonly FormattedEntry[],
  toggled: ReadonlySet<OutputEntry>
): FlattenedCacheState {
  if (formatted.length === 0) {
    if (
      previous.formatted.length === 0 &&
      previous.visibleItems.length === 0 &&
      previous.toggled === toggled
    ) {
      return previous;
    }
    return {
      formatted,
      groupStack: [],
      toggled,
      visibleItems: [],
    };
  }

  const resolveCollapsed = (id: number, startsCollapsed: boolean): boolean => {
    const isToggled = toggled.has(formatted[id].entry);
    return startsCollapsed ? !isToggled : isToggled;
  };

  const canAppendIncrementally =
    toggled === previous.toggled &&
    hasSameFormattedPrefix(previous.formatted, formatted);

  if (canAppendIncrementally) {
    if (formatted.length === previous.formatted.length) {
      return previous;
    }

    const deltaItems: FlatConsoleItem[] = [];
    const nextGroupStack = previous.groupStack.map((frame) => ({ ...frame }));

    flattenConsoleEntries(
      formatted,
      resolveCollapsed,
      previous.formatted.length,
      deltaItems,
      nextGroupStack
    );

    return {
      formatted,
      groupStack: nextGroupStack,
      toggled,
      visibleItems:
        deltaItems.length === 0
          ? previous.visibleItems
          : previous.visibleItems.concat(deltaItems),
    };
  }

  // Preserve existing FlatConsoleItem identities on toggles when entry prefix matches.
  const isSameEntrySequence =
    formatted.length === previous.formatted.length &&
    hasSameFormattedPrefix(previous.formatted, formatted);
  const nextVisibleItems = isSameEntrySequence
    ? [...previous.visibleItems]
    : [];
  const nextGroupStack: GroupStackFrame[] = [];

  flattenConsoleEntries(
    formatted,
    resolveCollapsed,
    0,
    nextVisibleItems,
    nextGroupStack
  );

  return {
    formatted,
    groupStack: nextGroupStack,
    toggled,
    visibleItems: nextVisibleItems,
  };
}

/**
 * Creates a pure reactive `ConsoleProjection` that caches formatted entries
 * and flattened hierarchy items across incremental appends without mutating
 * previously emitted arrays inside `createMemo`.
 */
export function createConsoleProjection(
  deps: ConsoleProjectionDeps
): ConsoleProjection {
  const [toggledEntries, setToggledEntries] = createSignal<
    ReadonlySet<OutputEntry>
  >(new Set(), { equals: false });

  const formattedState = createMemo<FormattedCacheState>((prev) =>
    computeNextFormattedState(
      prev ?? INITIAL_FORMATTED_STATE,
      deps.entries(),
      deps.formatter
    )
  );

  const flattenedState = createMemo<FlattenedCacheState>((prev) =>
    computeNextFlattenedState(
      prev ?? INITIAL_FLATTENED_STATE,
      formattedState().formatted,
      toggledEntries()
    )
  );

  const visibleItems = () => flattenedState().visibleItems;

  function toggleGroup(id: number): void {
    const entry = untrack(deps.entries)[id];
    if (!entry) {
      return;
    }

    const next = new Set(untrack(toggledEntries));
    if (next.has(entry)) {
      next.delete(entry);
    } else {
      next.add(entry);
    }
    setToggledEntries(next);
  }

  function reset(): void {
    if (untrack(toggledEntries).size === 0) {
      return;
    }
    setToggledEntries(new Set<OutputEntry>());
  }

  return {
    reset,
    toggleGroup,
    visibleItems,
  };
}

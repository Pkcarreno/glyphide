import type { JSX } from "@solidjs/web";
import SearchIcon from "lucide-solid/icons/search";
import type { Accessor, ParentProps, Setter, VoidProps } from "solid-js";
import {
  children,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  merge,
  omit,
  onSettled,
  Show,
  useContext,
} from "solid-js";
import { cn } from "../../helpers/cn.ts";
import { composeEventHandlers } from "../../helpers/compose-event-handlers.ts";
import { createAutoFocus } from "../../helpers/create-auto-focus.ts";
import { hasResolvedChildren } from "../../helpers/has-resolved-children.ts";
import type { DialogRootProps } from "./Dialog.tsx";
import { Dialog } from "./Dialog.tsx";
import { Icon } from "./Icon.tsx";
import type { InputProps } from "./Input.tsx";
import { Input } from "./Input.tsx";

/* ---------- Context ---------- */

interface CommandContextValue {
  registerItem: (id: string, textValue: string) => void;
  search: Accessor<string>;
  selectedId: Accessor<string | null>;
  setSearch: (value: string) => void;
  setSelectedId: Setter<string | null>;
  unregisterItem: (id: string) => void;
  visibleItems: Accessor<Set<string>>;
}

const CommandContext = createContext<CommandContextValue>();

/**
 * Retrieves the Command context.
 * Throws `ContextNotFoundError` if used outside `<Command.Root>`.
 */
function useCommand(): CommandContextValue {
  return useContext(CommandContext);
}

/* ---------- Root ---------- */

interface CommandRootProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  shouldFilter?: boolean;
}

/**
 * Root container for a command menu. Provides state and filtering logic.
 */
function CommandRoot(rawProps: ParentProps<CommandRootProps>) {
  const props = merge({ shouldFilter: true }, rawProps);
  const rest = omit(
    props,
    "class",
    "children",
    "shouldFilter",
    "onKeyDown",
    "ref"
  );
  const [search, setSearchSignal] = createSignal("");
  const [rawSelectedId, setRawSelectedId] = createSignal<string | null>(null);

  const [items, setItems] = createSignal<Map<string, string>>(new Map());

  const setSearch = (value: string) => {
    setSearchSignal(value);
    // Reset explicit selection on filter change so results start from the top match.
    setRawSelectedId(null);
  };

  const registerItem = (id: string, textValue: string) => {
    setItems((prev) => {
      const next = new Map(prev);
      next.set(id, textValue);
      return next;
    });
  };

  const unregisterItem = (id: string) => {
    setItems((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const visibleItems = createMemo(() => {
    const query = search().toLowerCase();

    if (!(query && props.shouldFilter)) {
      return new Set(items().keys());
    }

    const visible = new Set<string>();
    for (const [id, textValue] of items().entries()) {
      if (textValue.toLowerCase().includes(query)) {
        visible.add(id);
      }
    }
    return visible;
  });

  const selectedId = createMemo<string | null>(() => {
    const visible = Array.from(visibleItems());
    if (visible.length === 0) {
      return null;
    }
    const current = rawSelectedId();
    return current && visible.includes(current) ? current : visible[0];
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    const visible = Array.from(visibleItems());
    if (visible.length === 0) {
      return;
    }

    const currentId = selectedId();
    const currentIndex = currentId ? visible.indexOf(currentId) : -1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex =
        currentIndex < visible.length - 1 ? currentIndex + 1 : 0;
      setRawSelectedId(visible[nextIndex]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIndex =
        currentIndex > 0 ? currentIndex - 1 : visible.length - 1;
      setRawSelectedId(visible[nextIndex]);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = selectedId();
      if (selected) {
        const el = document.querySelector<HTMLElement>(
          `#command-item-${selected}`
        );
        el?.click();
      }
    }
  };

  return (
    <CommandContext
      value={{
        registerItem,
        search,
        selectedId,
        setSearch,
        setSelectedId: setRawSelectedId,
        unregisterItem,
        visibleItems,
      }}
    >
      {/* biome-ignore lint/a11y/useFocusableInteractive: Solid 2 uses lowercase tabindex attribute */}
      <div
        aria-expanded="true"
        aria-haspopup="listbox"
        class={cn(
          "bg-surface ring-on-surface/10 flex flex-col overflow-hidden rounded-xl shadow-md ring-1",
          props.class
        )}
        onKeyDown={composeEventHandlers(handleKeyDown, props.onKeyDown)}
        ref={props.ref}
        role="combobox"
        tabindex={-1}
        {...rest}
      >
        {props.children}
      </div>
    </CommandContext>
  );
}

/* ---------- Input ---------- */

type CommandInputProps = InputProps;

/**
 * Input field for filtering the command menu items.
 */
function CommandInput(rawProps: VoidProps<CommandInputProps>) {
  const props = merge({ placeholder: "Search..." }, rawProps);
  const rest = omit(
    props,
    "class",
    "wrapperClass",
    "placeholder",
    "onInput",
    "ref"
  );
  const ctx = useCommand();

  return (
    <Input
      class={props.class}
      inputSize="lg"
      onInput={composeEventHandlers(
        (e) => ctx.setSearch(e.currentTarget.value),
        props.onInput
      )}
      placeholder={props.placeholder}
      ref={[createAutoFocus<HTMLInputElement>(), props.ref]}
      startIcon={<Icon icon={SearchIcon} size={16} />}
      value={ctx.search()}
      variant="bottomBorder"
      wrapperClass={props.wrapperClass}
      {...rest}
    />
  );
}

/* ---------- List ---------- */

type CommandListProps = Omit<JSX.HTMLAttributes<HTMLDivElement>, "children">;

function CommandList(props: ParentProps<CommandListProps>) {
  const rest = omit(props, "class", "children");
  return (
    <div
      class={cn("max-h-75 overflow-x-hidden overflow-y-auto p-1", props.class)}
      {...rest}
    >
      {props.children}
    </div>
  );
}

/* ---------- Empty ---------- */

type CommandEmptyProps = Omit<JSX.HTMLAttributes<HTMLDivElement>, "children">;

function CommandEmpty(props: ParentProps<CommandEmptyProps>) {
  const rest = omit(props, "class", "children");
  const ctx = useCommand();
  const resolved = children(() => props.children);

  return (
    <Show when={ctx.visibleItems().size === 0}>
      <div
        class={cn(
          "text-on-surface-variant py-6 text-center text-sm",
          props.class
        )}
        {...rest}
      >
        <Show fallback="No results found." when={hasResolvedChildren(resolved)}>
          {resolved()}
        </Show>
      </div>
    </Show>
  );
}

/* ---------- Group ---------- */

interface CommandGroupProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  heading?: string;
}

function CommandGroup(props: ParentProps<CommandGroupProps>) {
  const rest = omit(props, "class", "children", "heading");

  return (
    <div class={cn("text-on-surface overflow-hidden", props.class)} {...rest}>
      <Show when={props.heading}>
        <div class="text-on-surface-variant px-2 py-1.5 text-xs font-medium uppercase">
          {props.heading}
        </div>
      </Show>
      {props.children}
    </div>
  );
}

/* ---------- Item ---------- */

interface CommandItemProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  onSelect?: () => void;
  value: string;
}

/**
 * A selectable item in the command menu.
 */
function CommandItem(props: ParentProps<CommandItemProps>) {
  const rest = omit(
    props,
    "class",
    "children",
    "value",
    "onSelect",
    "onClick",
    "onKeyDown",
    "onMouseEnter",
    "ref"
  );
  const ctx = useCommand();

  onSettled(() => {
    const id = props.value;
    ctx.registerItem(id, id);
    return () => ctx.unregisterItem(id);
  });

  const isVisible = () => ctx.visibleItems().has(props.value);
  const isSelected = () => ctx.selectedId() === props.value;

  let itemRef: HTMLDivElement | undefined;

  createEffect(
    () => isSelected(),
    (selected) => {
      if (selected && itemRef && typeof itemRef.scrollIntoView === "function") {
        itemRef.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  );

  return (
    <Show when={isVisible()}>
      {/* biome-ignore lint/a11y/useFocusableInteractive: Solid 2 uses lowercase tabindex attribute */}
      <div
        aria-selected={isSelected() ? "true" : "false"}
        class={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 relative flex min-h-7 cursor-pointer items-center rounded-sm px-2.5 py-1.5 text-xs transition-colors outline-none select-none focus-visible:ring-3 aria-invalid:ring-3",
          "pointer-coarse:min-h-11 pointer-coarse:px-3 pointer-coarse:py-2.5",
          isSelected()
            ? "bg-surface-variant text-on-surface"
            : "text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface",
          props.class
        )}
        id={`command-item-${props.value}`}
        onClick={composeEventHandlers(() => {
          props.onSelect?.();
        }, props.onClick)}
        onKeyDown={composeEventHandlers((e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            props.onSelect?.();
          }
        }, props.onKeyDown)}
        onMouseEnter={composeEventHandlers(
          () => ctx.setSelectedId(props.value),
          props.onMouseEnter
        )}
        ref={[
          (el: HTMLDivElement) => {
            itemRef = el;
          },
          props.ref,
        ]}
        role="option"
        tabindex={0}
        {...rest}
      >
        {props.children}
      </div>
    </Show>
  );
}

/* ---------- Dialog Integration ---------- */

interface CommandDialogProps extends DialogRootProps {
  /** Optional CSS classes merged with the dialog content panel. */
  class?: string;
}

/**
 * Top-aligned dialog wrapper for a command palette.
 */
function CommandDialog(props: ParentProps<CommandDialogProps>) {
  const rootProps = omit(props, "class", "children");

  return (
    <Dialog.Root {...rootProps}>
      <Dialog.Content align="top" class={cn("max-w-lg p-0", props.class)}>
        {props.children}
      </Dialog.Content>
    </Dialog.Root>
  );
}

/* ---------- Unified Namespace ---------- */

/**
 * Composable Command palette compound component.
 *
 * @public
 */
const Command = {
  Dialog: CommandDialog,
  Empty: CommandEmpty,
  Group: CommandGroup,
  Input: CommandInput,
  Item: CommandItem,
  List: CommandList,
  Root: CommandRoot,
};

/** @public */
export {
  Command,
  type CommandDialogProps,
  type CommandEmptyProps,
  type CommandGroupProps,
  type CommandInputProps,
  type CommandItemProps,
  type CommandListProps,
  type CommandRootProps,
  useCommand,
};

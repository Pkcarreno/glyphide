import {
  createContext,
  useContext,
  splitProps,
  createSignal,
  createEffect,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import type { JSX, Accessor, Setter } from "solid-js";
import { cn } from "../../helpers/cn";
import SearchIcon from "lucide-solid/icons/search";
import { Icon } from "./Icon";
import { Dialog, useDialog } from "./Dialog";
import { Input, type InputProps } from "./Input";

/* ---------- Context ---------- */

interface CommandContextValue {
  search: Accessor<string>;
  setSearch: Setter<string>;
  registerItem: (id: string, textValue: string) => void;
  unregisterItem: (id: string) => void;
  selectedId: Accessor<string | null>;
  setSelectedId: Setter<string | null>;
  visibleItems: Accessor<Set<string>>;
}

const CommandContext = createContext<CommandContextValue>();

export function useCommand() {
  const context = useContext(CommandContext);
  if (!context) {
    throw new Error("Command compound components must be used within CommandRoot");
  }
  return context;
}

/* ---------- Root ---------- */

interface CommandRootProps extends JSX.HTMLAttributes<HTMLDivElement> {
  shouldFilter?: boolean;
}

/**
 * Root container for a command menu. Provides state and filtering logic.
 */
export function CommandRoot(props: CommandRootProps) {
  const [local, rest] = splitProps(props, ["class", "children", "shouldFilter"]);
  const [search, setSearch] = createSignal("");
  const [selectedId, setSelectedId] = createSignal<string | null>(null);

  const [items, setItems] = createSignal<Map<string, string>>(new Map());

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

  const visibleItems = () => {
    const query = search().toLowerCase();
    const shouldFilter = local.shouldFilter !== false;

    if (!query || !shouldFilter) {
      return new Set(items().keys());
    }

    const visible = new Set<string>();
    for (const [id, textValue] of items().entries()) {
      if (textValue.toLowerCase().includes(query)) {
        visible.add(id);
      }
    }
    return visible;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const visible = Array.from(visibleItems());
    if (visible.length === 0) return;

    const currentIndex = selectedId() ? visible.indexOf(selectedId()!) : -1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = currentIndex < visible.length - 1 ? currentIndex + 1 : 0;
      setSelectedId(visible[nextIndex]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIndex = currentIndex > 0 ? currentIndex - 1 : visible.length - 1;
      setSelectedId(visible[nextIndex]);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = selectedId();
      if (selected) {
        const el = document.getElementById(`command-item-${selected}`);
        el?.click();
      }
    }
  };

  createEffect(() => {
    const visible = Array.from(visibleItems());
    if (visible.length > 0 && (!selectedId() || !visible.includes(selectedId()!))) {
      setSelectedId(visible[0]);
    } else if (visible.length === 0) {
      setSelectedId(null);
    }
  });

  return (
    <CommandContext.Provider
      value={{
        search,
        setSearch,
        registerItem,
        unregisterItem,
        selectedId,
        setSelectedId,
        visibleItems,
      }}
    >
      <div
        class={cn(
          "flex flex-col overflow-hidden bg-surface rounded-xl border border-outline-variant shadow-2xl",
          local.class
        )}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        {local.children}
      </div>
    </CommandContext.Provider>
  );
}

/* ---------- Input ---------- */

export interface CommandInputProps extends InputProps {}

/**
 * Input field for filtering the command menu items.
 */
export function CommandInput(props: CommandInputProps) {
  const [local, rest] = splitProps(props, ["class", "wrapperClass", "placeholder"]);
  const ctx = useCommand();
  let inputRef!: HTMLInputElement;

  onMount(() => {
    setTimeout(() => {
      inputRef?.focus();
    }, 0);
  });

  return (
    <Input
      ref={inputRef}
      variant="bottomBorder"
      class={local.class}
      wrapperClass={local.wrapperClass}
      placeholder={local.placeholder ?? "Search..."}
      value={ctx.search()}
      onInput={(e) => ctx.setSearch(e.currentTarget.value)}
      startIcon={<Icon icon={SearchIcon} size={16} />}
      {...rest}
    />
  );
}

/* ---------- List ---------- */

export function CommandList(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div
      class={cn("max-h-[300px] overflow-y-auto overflow-x-hidden p-1", local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
}

/* ---------- Empty ---------- */

export function CommandEmpty(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  const ctx = useCommand();

  return (
    <Show when={ctx.visibleItems().size === 0}>
      <div class={cn("py-6 text-center text-sm text-on-surface-variant", local.class)} {...rest}>
        {local.children ?? "No results found."}
      </div>
    </Show>
  );
}

/* ---------- Group ---------- */

interface CommandGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  heading?: string;
}

export function CommandGroup(props: CommandGroupProps) {
  const [local, rest] = splitProps(props, ["class", "children", "heading"]);

  return (
    <div
      class={cn("overflow-hidden text-on-surface", local.class)}
      {...rest}
    >
      <Show when={local.heading}>
        <div class="px-2 py-1.5 text-xs font-medium text-on-surface-variant uppercase">
          {local.heading}
        </div>
      </Show>
      {local.children}
    </div>
  );
}

/* ---------- Item ---------- */

interface CommandItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  value: string;
  onSelect?: () => void;
}

/**
 * A selectable item in the command menu.
 */
export function CommandItem(props: CommandItemProps) {
  const [local, rest] = splitProps(props, ["class", "children", "value", "onSelect"]);
  const ctx = useCommand();
  const id = local.value;

  onMount(() => {
    ctx.registerItem(id, local.value);
    onCleanup(() => ctx.unregisterItem(id));
  });

  const isVisible = () => ctx.visibleItems().has(id);
  const isSelected = () => ctx.selectedId() === id;

  let ref!: HTMLDivElement;

  createEffect(() => {
    if (isSelected() && ref && typeof ref.scrollIntoView === "function") {
      ref.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });

  return (
    <Show when={isVisible()}>
      <div
        id={`command-item-${id}`}
        ref={ref}
        class={cn(
          "relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2 text-sm outline-none transition-colors",
          isSelected() ? "bg-surface-variant text-on-surface" : "text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface",
          local.class
        )}
        onMouseEnter={() => ctx.setSelectedId(id)}
        onClick={() => {
          local.onSelect?.();
        }}
        {...rest}
      >
        {local.children}
      </div>
    </Show>
  );
}

/* ---------- Dialog Integration ---------- */

function CommandDialogOverlay(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const { close } = useDialog();
  return (
    <div
      class="fixed inset-0 z-50 bg-transparent"
      onClick={close}
      {...props}
    />
  );
}

function CommandDialogContent(props: { children: JSX.Element; class?: string }) {
  const { isOpen } = useDialog();
  return (
    <Show when={isOpen()}>
      <div class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
        <CommandDialogOverlay />
        <div
          role="dialog"
          aria-modal="true"
          class={cn("relative z-50 w-full max-w-lg", props.class)}
        >
          {props.children}
        </div>
      </div>
    </Show>
  );
}

export function CommandDialog(props: {
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  children: JSX.Element;
  class?: string;
}) {
  return (
    <Dialog isOpen={props.isOpen} onOpenChange={props.onOpenChange}>
      <CommandDialogContent class={props.class}>
        {props.children}
      </CommandDialogContent>
    </Dialog>
  );
}

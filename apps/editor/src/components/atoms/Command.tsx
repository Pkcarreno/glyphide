import SearchIcon from "lucide-solid/icons/search";
import type { Accessor, JSX, Setter } from "solid-js";
import {
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { cn } from "../../helpers/cn.ts";
import { Dialog, useDialog } from "../molecules/Dialog.tsx";
import { Icon } from "./Icon.tsx";
import { Input, type InputProps } from "./Input.tsx";

/* ---------- Context ---------- */

interface CommandContextValue {
  registerItem: (id: string, textValue: string) => void;
  search: Accessor<string>;
  selectedId: Accessor<string | null>;
  setSearch: Setter<string>;
  setSelectedId: Setter<string | null>;
  unregisterItem: (id: string) => void;
  visibleItems: Accessor<Set<string>>;
}

const CommandContext = createContext<CommandContextValue>();

/** @public */
export function useCommand() {
  const context = useContext(CommandContext);
  if (!context) {
    throw new Error(
      "Command compound components must be used within CommandRoot"
    );
  }
  return context;
}

/* ---------- Root ---------- */

interface CommandRootProps extends JSX.HTMLAttributes<HTMLDivElement> {
  shouldFilter?: boolean;
}

/**
 * Root container for a command menu. Provides state and filtering logic.
 *
 * @public
 */
export function CommandRoot(props: CommandRootProps) {
  const [local, rest] = splitProps(props, [
    "class",
    "children",
    "shouldFilter",
  ]);
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

    if (!(query && shouldFilter)) {
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
    if (visible.length === 0) {
      return;
    }

    const currentId = selectedId();
    const currentIndex = currentId ? visible.indexOf(currentId) : -1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex =
        currentIndex < visible.length - 1 ? currentIndex + 1 : 0;
      setSelectedId(visible[nextIndex]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIndex =
        currentIndex > 0 ? currentIndex - 1 : visible.length - 1;
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
    const currentId = selectedId();
    if (visible.length > 0 && !(currentId && visible.includes(currentId))) {
      setSelectedId(visible[0]);
    } else if (visible.length === 0) {
      setSelectedId(null);
    }
  });

  return (
    <CommandContext.Provider
      value={{
        registerItem,
        search,
        selectedId,
        setSearch,
        setSelectedId,
        unregisterItem,
        visibleItems,
      }}
    >
      <div
        aria-expanded={true}
        aria-haspopup="listbox"
        class={cn(
          "flex flex-col overflow-hidden rounded-xl bg-surface shadow-md ring-1 ring-on-surface/10",
          local.class
        )}
        onKeyDown={handleKeyDown}
        role="combobox"
        tabIndex={-1}
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
  const [local, rest] = splitProps(props, [
    "class",
    "wrapperClass",
    "placeholder",
  ]);
  const ctx = useCommand();
  let inputRef: HTMLInputElement | undefined;

  onMount(() => {
    setTimeout(() => {
      inputRef?.focus();
    }, 0);
  });

  return (
    <Input
      class={local.class}
      inputSize="lg"
      onInput={(e) => ctx.setSearch(e.currentTarget.value)}
      placeholder={local.placeholder ?? "Search..."}
      ref={(el) => {
        inputRef = el;
      }}
      startIcon={<Icon icon={SearchIcon} size={16} />}
      value={ctx.search()}
      variant="bottomBorder"
      wrapperClass={local.wrapperClass}
      {...rest}
    />
  );
}

/* ---------- List ---------- */

export function CommandList(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div
      class={cn("max-h-75 overflow-y-auto overflow-x-hidden p-1", local.class)}
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
      <div
        class={cn(
          "py-6 text-center text-on-surface-variant text-sm",
          local.class
        )}
        {...rest}
      >
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
    <div class={cn("overflow-hidden text-on-surface", local.class)} {...rest}>
      <Show when={local.heading}>
        <div class="px-2 py-1.5 font-medium text-on-surface-variant text-xs uppercase">
          {local.heading}
        </div>
      </Show>
      {local.children}
    </div>
  );
}

/* ---------- Item ---------- */

interface CommandItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  onSelect?: () => void;
  value: string;
}

/**
 * A selectable item in the command menu.
 */
export function CommandItem(props: CommandItemProps) {
  const [local, rest] = splitProps(props, [
    "class",
    "children",
    "value",
    "onSelect",
  ]);
  const ctx = useCommand();
  const id = local.value;

  onMount(() => {
    ctx.registerItem(id, local.value);
    onCleanup(() => ctx.unregisterItem(id));
  });

  const isVisible = () => ctx.visibleItems().has(id);
  const isSelected = () => ctx.selectedId() === id;

  let ref: HTMLDivElement | undefined;

  createEffect(() => {
    if (isSelected() && ref && typeof ref.scrollIntoView === "function") {
      ref.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  return (
    <Show when={isVisible()}>
      <div
        aria-selected={isSelected()}
        class={cn(
          "relative flex min-h-7 cursor-pointer select-none items-center rounded-sm px-2.5 py-1.5 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          "pointer-coarse:min-h-11 pointer-coarse:px-3 pointer-coarse:py-2.5",
          isSelected()
            ? "bg-surface-variant text-on-surface"
            : "text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface",
          local.class
        )}
        id={`command-item-${id}`}
        onClick={() => {
          local.onSelect?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            local.onSelect?.();
          }
        }}
        onMouseEnter={() => ctx.setSelectedId(id)}
        ref={(el) => {
          ref = el;
        }}
        role="option"
        tabIndex={0}
        {...rest}
      >
        {local.children}
      </div>
    </Show>
  );
}

/* ---------- Dialog Integration ---------- */

function CommandDialogOverlay(props: JSX.HTMLAttributes<HTMLButtonElement>) {
  const { close } = useDialog();
  return (
    <button
      aria-hidden="true"
      class="fixed inset-0 z-50 m-0 cursor-default border-none bg-transparent p-0"
      onClick={close}
      tabIndex={-1}
      type="button"
      {...props}
    />
  );
}

function CommandDialogContent(props: {
  children: JSX.Element;
  class?: string;
}) {
  const { isOpen } = useDialog();
  return (
    <Show when={isOpen()}>
      <div class="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]">
        <CommandDialogOverlay />
        <div
          aria-modal="true"
          class={cn("relative z-50 w-full max-w-lg", props.class)}
          role="dialog"
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

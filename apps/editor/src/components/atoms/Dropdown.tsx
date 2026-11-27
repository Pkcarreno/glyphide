import type { Placement } from "@floating-ui/dom";
import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { dynamic, Portal } from "@solidjs/web";
import { cva } from "class-variance-authority";
import Check from "lucide-solid/icons/check";
import type {
  Accessor,
  FlowProps,
  ParentProps,
  Setter,
  VoidProps,
} from "solid-js";
import {
  createContext,
  createSignal,
  createUniqueId,
  merge,
  omit,
  onSettled,
  Show,
  useContext,
} from "solid-js";
import { cn } from "../../helpers/cn.ts";
import { composeEventHandlers } from "../../helpers/compose-event-handlers.ts";
import { createFloatingAnchor } from "../../helpers/create-floating-anchor.ts";

/* ---------- Context ---------- */

interface DropdownContextValue {
  activeIndex: Accessor<number>;
  close: () => void;
  contentRef: Accessor<HTMLElement | undefined>;
  coords: Accessor<{ left: number; top: number }>;
  isOpen: Accessor<boolean>;
  itemIds: Accessor<string[]>;
  registerItem: (id: string) => void;
  setActiveIndex: Setter<number>;
  setContentRef: (el: HTMLElement) => void;
  setTriggerRef: (el: HTMLElement) => void;
  toggle: () => void;
  triggerRef: Accessor<HTMLElement | undefined>;
  unregisterItem: (id: string) => void;
}

const DropdownContext = createContext<DropdownContextValue>();

/**
 * Retrieves the dropdown context.
 * Throws `ContextNotFoundError` if used outside `<Dropdown.Root>`.
 *
 * @public
 */
export function useDropdown(): DropdownContextValue {
  return useContext(DropdownContext);
}

/* ---------- Root ---------- */

interface DropdownRootProps {
  /** Controlled open state */
  isOpen?: boolean;
  /** Distance from the trigger element in pixels. Default: 4 */
  offset?: number;
  /** Callback when open state changes */
  onOpenChange?: (isOpen: boolean) => void;
  /** Where the dropdown appears relative to the trigger. Default: "bottom-start" */
  placement?: Placement;
}

/**
 * Dropdown root that manages open state and provides context to sub-components.
 * Supports both controlled and uncontrolled modes.
 */
function DropdownRoot(rawProps: FlowProps<DropdownRootProps>) {
  const props = merge(
    {
      offset: 4,
      placement: "bottom-start" as Placement,
    },
    rawProps
  );
  const offset = () => props.offset;
  const placement = () => props.placement;

  const [internalIsOpen, setInternalIsOpen] = createSignal(false);
  const isOpen = () => props.isOpen ?? internalIsOpen();

  const [activeIndex, setActiveIndex] = createSignal(-1);
  const [itemIds, setItemIds] = createSignal<string[]>([]);

  const handleOpenStateChange = (nextOpen: boolean) => {
    if (props.isOpen === undefined) {
      setInternalIsOpen(nextOpen);
    }
    props.onOpenChange?.(nextOpen);

    if (!nextOpen) {
      setActiveIndex(-1);
    }
  };

  const close = () => {
    handleOpenStateChange(false);
  };

  const toggle = () => {
    handleOpenStateChange(!isOpen());
  };

  const registerItem = (id: string) => {
    setItemIds((prev) => [...prev, id]);
  };

  const unregisterItem = (id: string) => {
    setItemIds((prev) => prev.filter((itemId) => itemId !== id));
  };

  const anchor = createFloatingAnchor({
    isOpen,
    offset,
    onOutsideClick: close,
    placement,
  });

  return (
    <DropdownContext
      value={{
        activeIndex,
        close,
        contentRef: anchor.floatingEl,
        coords: anchor.coords,
        isOpen,
        itemIds,
        registerItem,
        setActiveIndex,
        setContentRef: anchor.setFloatingRef,
        setTriggerRef: anchor.setTriggerRef,
        toggle,
        triggerRef: anchor.triggerEl,
        unregisterItem,
      }}
    >
      {props.children}
    </DropdownContext>
  );
}

/* ---------- Trigger ---------- */

type DropdownTriggerProps<T extends ValidComponent = "button"> = ParentProps<
  {
    as?: T;
    class?: string;
  } & Omit<ComponentProps<T>, "as" | "children" | "class">
>;

/**
 * The element that triggers the dropdown to open or close.
 * Registers its reference for Floating UI positioning.
 * Forwards ref to the rendered element and chains onClick with toggle.
 */
function DropdownTrigger<T extends ValidComponent = "button">(
  props: DropdownTriggerProps<T>
) {
  const rest = omit(
    props as DropdownTriggerProps<"button">,
    "as",
    "class",
    "children",
    "onClick",
    "ref"
  );
  const ctx = useDropdown();
  const Comp = dynamic(() => props.as ?? "button");

  return (
    <Comp
      aria-expanded={ctx.isOpen() ? "true" : "false"}
      aria-haspopup="true"
      class={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 outline-none focus-visible:ring-3 aria-invalid:ring-3",
        props.class
      )}
      onClick={composeEventHandlers(
        ctx.toggle,
        (props as DropdownTriggerProps<"button">).onClick
      )}
      ref={[
        (el: HTMLElement) => ctx.setTriggerRef(el),
        (props as DropdownTriggerProps<"button">).ref,
      ]}
      {...rest}
    >
      {props.children}
    </Comp>
  );
}

/* ---------- Portal ---------- */

/**
 * Portals the children into the document body
 * conditionally when the dropdown is open.
 */
function DropdownPortal(props: FlowProps) {
  const ctx = useDropdown();

  return <Show when={ctx.isOpen()}>{props.children}</Show>;
}

/* ---------- Content ---------- */

interface DropdownContentProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  class?: string;
}

/**
 * The dropdown content panel with role="menu" and keyboard navigation.
 * Positioned by Floating UI relative to the trigger.
 */
function DropdownContent(props: ParentProps<DropdownContentProps>) {
  const rest = omit(props, "class", "children", "onKeyDown", "ref");
  const ctx = useDropdown();
  let contentRef: HTMLDivElement | undefined;

  const handleRef = (el: HTMLDivElement) => {
    contentRef = el;
    ctx.setContentRef(el);
  };

  const getFocusableItems = (): HTMLElement[] => {
    if (!contentRef) {
      return [];
    }
    return Array.from(
      contentRef.querySelectorAll(
        '[role="menuitem"], [role="menuitemcheckbox"]'
      )
    );
  };

  const focusItem = (index: number) => {
    const items = getFocusableItems();
    if (items.length === 0) {
      return;
    }

    const normalizedIndex =
      ((index % items.length) + items.length) % items.length;
    ctx.setActiveIndex(normalizedIndex);
    items[normalizedIndex]?.focus();
  };

  const activateItem = () => {
    const items = getFocusableItems();
    const currentIndex = ctx.activeIndex();
    if (currentIndex >= 0 && currentIndex < items.length) {
      items[currentIndex]?.click();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const itemCount = getFocusableItems().length;

    switch (e.key as string) {
      case "ArrowDown": {
        e.preventDefault();
        const nextIndex = ctx.activeIndex() + 1;
        focusItem(nextIndex >= itemCount ? 0 : nextIndex);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prevIndex = ctx.activeIndex() - 1;
        focusItem(prevIndex < 0 ? itemCount - 1 : prevIndex);
        break;
      }
      case "Home": {
        e.preventDefault();
        focusItem(0);
        break;
      }
      case "End": {
        e.preventDefault();
        focusItem(itemCount - 1);
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        if (ctx.activeIndex() >= 0) {
          activateItem();
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        ctx.close();
        ctx.triggerRef()?.focus();
        break;
      }
      default:
        break;
    }
  };

  // Focus content on open so keyboard events are captured
  onSettled(() => {
    const frameId = requestAnimationFrame(() => {
      contentRef?.focus();
    });
    return () => {
      cancelAnimationFrame(frameId);
    };
  });

  return (
    <Show when={ctx.isOpen()}>
      <Portal>
        <div
          class={cn(
            "pointer-events-auto fixed z-50 w-max origin-top-left",
            "overflow-x-hidden overflow-y-auto rounded-lg",
            "bg-surface text-on-surface ring-on-surface/10 p-1 text-xs shadow-md ring-1",
            "animate-[dropdown-in_100ms_ease-out]",
            props.class
          )}
          onKeyDown={composeEventHandlers(handleKeyDown, props.onKeyDown)}
          ref={[handleRef, props.ref]}
          role="menu"
          style={{
            left: `${ctx.coords().left}px`,
            top: `${ctx.coords().top}px`,
          }}
          tabindex={-1}
          {...rest}
        >
          {props.children}
        </div>
      </Portal>
    </Show>
  );
}

/* ---------- Group ---------- */

interface DropdownGroupProps
  extends Omit<JSX.HTMLAttributes<HTMLFieldSetElement>, "children"> {
  class?: string;
  heading?: string;
}

/**
 * Groups related menu items with an optional heading.
 */
function DropdownGroup(props: ParentProps<DropdownGroupProps>) {
  const rest = omit(props, "class", "children", "heading");

  return (
    <fieldset aria-label={props.heading} class={cn(props.class)} {...rest}>
      <Show when={props.heading}>
        <div class="text-on-surface-variant px-2 text-xs font-medium">
          {props.heading}
        </div>
      </Show>
      {props.children}
    </fieldset>
  );
}

/* ---------- Shared Menu Item ---------- */

const dropdownMenuItemVariants = cva(
  [
    "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 relative flex cursor-pointer items-center gap-1.5 rounded-sm py-1 text-xs transition-colors outline-none select-none focus-visible:ring-3 aria-invalid:ring-3",
    "pointer-coarse:min-h-11 pointer-coarse:px-3 pointer-coarse:py-2.5",
    "hover:bg-surface-variant hover:text-on-surface",
    "data-[active=true]:bg-surface-variant data-[active=true]:text-on-surface",
  ],
  {
    defaultVariants: {
      inset: false,
      isDisabled: false,
      layout: "standard",
      variant: "default",
    },
    variants: {
      layout: {
        checkbox: "pr-8 pl-1.5",
        standard: "min-h-7 px-2",
      },
      inset: {
        false: "",
        true: "pl-7",
      },
      variant: {
        default: "",
        destructive:
          "text-error hover:text-error data-[active=true]:text-error",
      },
      isDisabled: {
        false: "",
        true: "pointer-events-none cursor-default opacity-50",
      },
    },
  }
);

type DropdownMenuItemBaseProps<T extends ValidComponent = "div"> = ParentProps<
  {
    as?: ValidComponent;
    class?: string;
    idPrefix: string;
    inset?: boolean;
    isDisabled?: boolean;
    layout?: "standard" | "checkbox";
    onActivate?: () => void;
    role: "menuitem" | "menuitemcheckbox";
    variant?: "default" | "destructive";
  } & Omit<
    ComponentProps<T>,
    | "as"
    | "children"
    | "class"
    | "idPrefix"
    | "inset"
    | "isDisabled"
    | "layout"
    | "onActivate"
    | "role"
    | "variant"
  >
>;

function DropdownMenuItemBase<T extends ValidComponent = "div">(
  rawProps: DropdownMenuItemBaseProps<T>
) {
  const props = merge(
    {
      inset: false,
      isDisabled: false,
      layout: "standard" as const,
      variant: "default" as const,
    },
    rawProps as DropdownMenuItemBaseProps<"div">
  );
  const rest = omit(
    props,
    "as",
    "children",
    "class",
    "idPrefix",
    "inset",
    "isDisabled",
    "layout",
    "onActivate",
    "onClick",
    "ref",
    "role",
    "variant"
  );
  const ctx = useDropdown();
  const itemId = `${props.idPrefix}-${createUniqueId()}`;

  let itemRef: HTMLElement | undefined;

  onSettled(() => {
    if (itemRef) {
      ctx.registerItem(itemId);
    }
    return () => {
      ctx.unregisterItem(itemId);
    };
  });

  const isActive = () => {
    const items = ctx.itemIds();
    return items.indexOf(itemId) === ctx.activeIndex();
  };

  const handleClick = () => {
    if (props.isDisabled) {
      return;
    }
    props.onActivate?.();
  };

  const Comp = dynamic(() => rawProps.as ?? "div");

  return (
    <Comp
      class={cn(
        dropdownMenuItemVariants({
          inset: props.inset,
          isDisabled: props.isDisabled,
          layout: props.layout,
          variant: props.variant,
        }),
        props.class
      )}
      data-active={isActive() ? "true" : undefined}
      data-disabled={props.isDisabled ? "true" : undefined}
      onClick={composeEventHandlers(handleClick, props.onClick)}
      ref={[
        (el: HTMLElement) => {
          itemRef = el;
        },
        props.ref,
      ]}
      role={props.role}
      tabindex={-1}
      {...rest}
    >
      {props.children}
    </Comp>
  );
}

/* ---------- Item ---------- */

type DropdownItemProps<T extends ValidComponent = "div"> = ParentProps<
  {
    as?: T;
    class?: string;
    isDisabled?: boolean;
    inset?: boolean;
    variant?: "default" | "destructive";
    onSelect?: () => void;
  } & Omit<
    ComponentProps<T>,
    | "as"
    | "children"
    | "class"
    | "isDisabled"
    | "inset"
    | "variant"
    | "onSelect"
  >
>;

/**
 * A single menu item with role="menuitem".
 * Supports inset alignment, destructive variant, disabled state, and polymorphic `as` prop.
 */
function DropdownItem<T extends ValidComponent = "div">(
  rawProps: DropdownItemProps<T>
) {
  const props = merge(
    {
      inset: false,
      isDisabled: false,
    },
    rawProps as DropdownItemProps<"div">
  );
  const rest = omit(
    props,
    "as",
    "class",
    "children",
    "isDisabled",
    "inset",
    "variant",
    "onSelect",
    "onClick",
    "ref",
    "role"
  );
  const ctx = useDropdown();

  return (
    <DropdownMenuItemBase<"div">
      as={rawProps.as ?? "div"}
      class={props.class}
      data-variant={props.variant}
      idPrefix="dropdown-item"
      inset={props.inset}
      isDisabled={props.isDisabled}
      onActivate={() => {
        props.onSelect?.();
        ctx.close();
      }}
      onClick={props.onClick}
      ref={props.ref}
      role="menuitem"
      variant={props.variant}
      {...rest}
    >
      {props.children}
    </DropdownMenuItemBase>
  );
}

/* ---------- CheckboxItem ---------- */

interface DropdownCheckboxItemProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  class?: string;
  inset?: boolean;
  isChecked?: boolean;
  isDisabled?: boolean;
  onCheckedChange?: (isChecked: boolean) => void;
}

/**
 * A menu item with checkbox behavior and role="menuitemcheckbox".
 * Shows a check indicator when checked.
 */
function DropdownCheckboxItem(
  rawProps: ParentProps<DropdownCheckboxItemProps>
) {
  const props = merge(
    {
      inset: false,
      isChecked: false,
      isDisabled: false,
    },
    rawProps
  );
  const rest = omit(
    props,
    "class",
    "children",
    "isChecked",
    "isDisabled",
    "inset",
    "onCheckedChange",
    "onClick",
    "onKeyDown",
    "ref",
    "role"
  );

  const toggleChecked = () => {
    props.onCheckedChange?.(!props.isChecked);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.isDisabled) {
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleChecked();
    }
  };

  return (
    <DropdownMenuItemBase
      aria-checked={props.isChecked ? "true" : "false"}
      as="div"
      class={props.class}
      idPrefix="dropdown-checkbox"
      inset={props.inset}
      isDisabled={props.isDisabled}
      layout="checkbox"
      onActivate={toggleChecked}
      onClick={props.onClick}
      onKeyDown={composeEventHandlers(handleKeyDown, props.onKeyDown)}
      ref={props.ref}
      role="menuitemcheckbox"
      {...rest}
    >
      <span
        class="pointer-events-none absolute right-2 flex items-center justify-center"
        data-testid="dropdown-check-icon"
      >
        <Show when={props.isChecked}>
          <Check class="h-4 w-4" />
        </Show>
      </span>
      {props.children}
    </DropdownMenuItemBase>
  );
}

/* ---------- Link ---------- */

type DropdownLinkProps<T extends ValidComponent = "a"> = ParentProps<
  {
    as?: T;
    class?: string;
    isDisabled?: boolean;
    inset?: boolean;
    onSelect?: () => void;
  } & Omit<
    ComponentProps<T>,
    "as" | "children" | "class" | "isDisabled" | "inset" | "onSelect"
  >
>;

/**
 * A navigation link within a dropdown menu, rendering an `<a>` by default.
 * Shares DropdownItem's lifecycle: context registration, keyboard nav, active state.
 *
 * @public
 */
function DropdownLink<T extends ValidComponent = "a">(
  rawProps: DropdownLinkProps<T>
) {
  const props = merge(
    {
      inset: false,
      isDisabled: false,
    },
    rawProps as DropdownLinkProps<"a">
  );
  const rest = omit(
    props,
    "as",
    "class",
    "children",
    "isDisabled",
    "inset",
    "onSelect",
    "onClick",
    "ref",
    "role"
  );
  const ctx = useDropdown();

  return (
    <DropdownMenuItemBase<"a">
      as={rawProps.as ?? "a"}
      class={props.class}
      idPrefix="dropdown-link"
      inset={props.inset}
      isDisabled={props.isDisabled}
      onActivate={() => {
        props.onSelect?.();
        ctx.close();
      }}
      onClick={props.onClick}
      ref={props.ref}
      role="menuitem"
      {...rest}
    >
      {props.children}
    </DropdownMenuItemBase>
  );
}

/* ---------- Caption ---------- */

interface DropdownCaptionProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  class?: string;
}

/**
 * Non-interactive metadata text with role="presentation".
 * Excluded from keyboard navigation — does not register with dropdown context.
 *
 * @public
 */
function DropdownCaption(props: ParentProps<DropdownCaptionProps>) {
  const rest = omit(props, "class", "children");

  return (
    <div
      class={cn("text-on-surface-variant px-2 py-1 text-xs", props.class)}
      role="presentation"
      {...rest}
    >
      {props.children}
    </div>
  );
}

/* ---------- Label ---------- */

interface DropdownLabelProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  class?: string;
}

/**
 * Non-interactive section header with role="presentation".
 */
function DropdownLabel(props: ParentProps<DropdownLabelProps>) {
  const rest = omit(props, "class", "children");

  return (
    <div
      class={cn(
        "text-on-surface-variant px-2 py-1.5 text-xs font-medium",
        props.class
      )}
      role="presentation"
      {...rest}
    >
      {props.children}
    </div>
  );
}

/* ---------- Separator ---------- */

interface DropdownSeparatorProps
  extends Omit<JSX.HTMLAttributes<HTMLHRElement>, "children"> {
  class?: string;
}

/**
 * Visual divider between menu items with role="separator".
 */
function DropdownSeparator(props: VoidProps<DropdownSeparatorProps>) {
  const rest = omit(props, "class");

  return (
    <hr
      aria-orientation="horizontal"
      class={cn("bg-outline-variant -mx-1 my-1 h-px border-none", props.class)}
      {...rest}
    />
  );
}

/* ---------- Shortcut ---------- */

interface DropdownShortcutProps
  extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> {
  class?: string;
}

/**
 * Displays keyboard shortcut hints, right-aligned with muted styling.
 */
function DropdownShortcut(props: ParentProps<DropdownShortcutProps>) {
  const rest = omit(props, "class", "children");

  return (
    <span
      class={cn(
        "text-on-surface-variant ml-auto text-xs tracking-widest",
        props.class
      )}
      {...rest}
    >
      {props.children}
    </span>
  );
}

/* ---------- Unified Namespace ---------- */

/**
 * Composable Dropdown Menu compound component.
 * Follows WAI-ARIA menu pattern with roving tabindex keyboard navigation.
 *
 * @public
 */
export const Dropdown = {
  Caption: DropdownCaption,
  CheckboxItem: DropdownCheckboxItem,
  Content: DropdownContent,
  Group: DropdownGroup,
  Item: DropdownItem,
  Label: DropdownLabel,
  Link: DropdownLink,
  Portal: DropdownPortal,
  Root: DropdownRoot,
  Separator: DropdownSeparator,
  Shortcut: DropdownShortcut,
  Trigger: DropdownTrigger,
};

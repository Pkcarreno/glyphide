import {
  autoUpdate,
  computePosition,
  flip,
  offset as floatingOffset,
  type Placement,
  shift,
} from "@floating-ui/dom";
import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { dynamic, Portal } from "@solidjs/web";
import Check from "lucide-solid/icons/check";
import type { Accessor, Setter } from "solid-js";
import {
  createContext,
  createEffect,
  createSignal,
  omit,
  onCleanup,
  onSettled,
  Show,
  useContext,
} from "solid-js";
import { cn } from "../../helpers/cn.ts";

/* ---------- Context ---------- */

interface DropdownContextValue {
  activeIndex: Accessor<number>;
  close: () => void;
  contentRef: Accessor<HTMLElement | undefined>;
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
 * Throws if used outside a DropdownRoot.
 *
 * @public
 */
export function useDropdown(): DropdownContextValue {
  const ctx = useContext(DropdownContext);
  if (!ctx) {
    throw new Error(
      "Dropdown compound components must be used within <Dropdown.Root>"
    );
  }
  return ctx;
}

/* ---------- Root ---------- */

interface DropdownRootProps {
  children: JSX.Element;
  /** Controlled open state */
  isOpen?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * Dropdown root that manages open state and provides context to sub-components.
 * Supports both controlled and uncontrolled modes.
 */
function DropdownRoot(props: DropdownRootProps) {
  const [internalIsOpen, setInternalIsOpen] = createSignal(false);
  const isOpen = () => props.isOpen ?? internalIsOpen();

  const [activeIndex, setActiveIndex] = createSignal(-1);
  const [itemIds, setItemIds] = createSignal<string[]>([]);

  let triggerEl: HTMLElement | undefined;
  let contentEl: HTMLElement | undefined;
  let cleanupAutoUpdate: (() => void) | undefined;

  const handleOpenStateChange = (nextOpen: boolean) => {
    if (props.isOpen === undefined) {
      setInternalIsOpen(nextOpen);
    }
    props.onOpenChange?.(nextOpen);

    if (!nextOpen) {
      setActiveIndex(-1);
      cleanupAutoUpdate?.();
      cleanupAutoUpdate = undefined;
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

  const setTriggerRef = (el: HTMLElement) => {
    triggerEl = el;
  };

  const setContentRef = (el: HTMLElement) => {
    contentEl = el;
  };

  const updatePosition = () => {
    if (!(triggerEl && contentEl)) {
      return;
    }

    computePosition(triggerEl, contentEl, {
      middleware: [floatingOffset(4), flip(), shift({ padding: 8 })],
      placement: "bottom-start",
    })
      .then(({ x, y }) => {
        if (contentEl) {
          contentEl.style.top = `${Math.round(y)}px`;
          contentEl.style.left = `${Math.round(x)}px`;
        }
      })
      .catch(() => {
        // Ignore positioning errors in JSDOM environments
      });
  };

  const bindAutoUpdate = () => {
    if (triggerEl && contentEl && isOpen()) {
      cleanupAutoUpdate?.();
      try {
        cleanupAutoUpdate = autoUpdate(triggerEl, contentEl, updatePosition);
      } catch {
        updatePosition();
        cleanupAutoUpdate = () => undefined;
      }
    }
  };

  createEffect(isOpen, (open) => {
    if (open) {
      const frame = requestAnimationFrame(bindAutoUpdate);
      return () => cancelAnimationFrame(frame);
    }
  });

  onSettled(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!isOpen()) {
        return;
      }
      const target = e.target as Node;
      if (
        triggerEl &&
        contentEl &&
        !triggerEl.contains(target) &&
        !contentEl.contains(target)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  });

  onCleanup(() => {
    cleanupAutoUpdate?.();
  });

  return (
    <DropdownContext
      value={{
        activeIndex,
        close,
        contentRef: () => contentEl,
        isOpen,
        itemIds,
        registerItem,
        setActiveIndex,
        setContentRef,
        setTriggerRef,
        toggle,
        triggerRef: () => triggerEl,
        unregisterItem,
      }}
    >
      {props.children}
    </DropdownContext>
  );
}

/* ---------- Trigger ---------- */

type DropdownTriggerProps<T extends ValidComponent = "button"> = {
  as?: T;
  children?: JSX.Element;
  class?: string;
} & Omit<ComponentProps<T>, "as" | "children" | "class">;

/**
 * The element that triggers the dropdown to open or close.
 * Registers its reference for Floating UI positioning.
 * Forwards ref to the rendered element and chains onClick with toggle.
 */
function DropdownTrigger<T extends ValidComponent = "button">(
  props: DropdownTriggerProps<T>
) {
  const rest = omit(props, "as", "class", "children");
  const ctx = useDropdown();

  // Extract ref and onClick from rest via type casting — these are handled
  // explicitly to chain with Dropdown context and must not be spread,
  // because spread overrides explicit JSX props.
  const {
    ref: refProp,
    onClick: onClickProp,
    ...forwardProps
  } = rest as Record<string, unknown>;

  const Element = dynamic(() => props.as ?? "button");

  return (
    <Element
      aria-expanded={ctx.isOpen() ? "true" : "false"}
      aria-haspopup="true"
      class={cn(
        "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        props.class
      )}
      onClick={(e: Event) => {
        ctx.toggle();
        (onClickProp as ((e: Event) => void) | undefined)?.(e);
      }}
      ref={(el: HTMLElement) => {
        ctx.setTriggerRef(el);
        (refProp as ((el: HTMLElement) => void) | undefined)?.(el);
      }}
      {...forwardProps}
    >
      {props.children}
    </Element>
  );
}

/* ---------- Portal ---------- */

interface DropdownPortalProps {
  children: JSX.Element;
}

/**
 * Portals the children into the document body
 * conditionally when the dropdown is open.
 */
function DropdownPortal(props: DropdownPortalProps) {
  const ctx = useDropdown();

  return <Show when={ctx.isOpen()}>{props.children}</Show>;
}

/* ---------- Content ---------- */

interface DropdownContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: JSX.Element;
  class?: string;
  offset?: number;
  placement?: Placement;
}

/**
 * The dropdown content panel with role="menu" and keyboard navigation.
 * Positioned by Floating UI relative to the trigger.
 */
function DropdownContent(props: DropdownContentProps) {
  const rest = omit(props, "class", "children", "offset", "placement");
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
    const frame = requestAnimationFrame(() => contentRef?.focus());
    return () => cancelAnimationFrame(frame);
  });

  return (
    <Show when={ctx.isOpen()}>
      <Portal>
        <div
          class={cn(
            "pointer-events-auto fixed z-50 w-max origin-top-left",
            "overflow-y-auto overflow-x-hidden rounded-lg",
            "bg-surface p-1 text-on-surface text-xs shadow-md ring-1 ring-on-surface/10",
            "animate-[dropdown-in_100ms_ease-out]",
            props.class
          )}
          onKeyDown={handleKeyDown}
          ref={handleRef}
          role="menu"
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

interface DropdownGroupProps extends JSX.HTMLAttributes<HTMLFieldSetElement> {
  children?: JSX.Element;
  class?: string;
  heading?: string;
}

/**
 * Groups related menu items with an optional heading.
 */
function DropdownGroup(props: DropdownGroupProps) {
  const rest = omit(props, "class", "children", "heading");

  return (
    <fieldset aria-label={props.heading} class={cn(props.class)} {...rest}>
      <Show when={props.heading}>
        <div class="px-2 font-medium text-on-surface-variant text-xs">
          {props.heading}
        </div>
      </Show>
      {props.children}
    </fieldset>
  );
}

/* ---------- Item ---------- */

type DropdownItemProps<T extends ValidComponent = "div"> = {
  as?: T;
  children?: JSX.Element;
  class?: string;
  isDisabled?: boolean;
  inset?: boolean;
  variant?: "default" | "destructive";
  onSelect?: () => void;
} & Omit<
  ComponentProps<T>,
  "as" | "children" | "class" | "isDisabled" | "inset" | "variant" | "onSelect"
>;

/**
 * A single menu item with role="menuitem".
 * Supports inset alignment, destructive variant, disabled state, and polymorphic `as` prop.
 */
function DropdownItem<T extends ValidComponent = "div">(
  props: DropdownItemProps<T>
) {
  const rest = omit(
    props,
    "as",
    "class",
    "children",
    "isDisabled",
    "inset",
    "variant",
    "onSelect"
  );
  const ctx = useDropdown();
  const itemId = `dropdown-item-${Math.random().toString(36).slice(2, 9)}`;

  let itemRef: HTMLElement | undefined;

  onSettled(() => {
    if (itemRef) {
      ctx.registerItem(itemId);
      return () => ctx.unregisterItem(itemId);
    }
  });

  const isActive = () => {
    const items = ctx.itemIds();
    return items.indexOf(itemId) === ctx.activeIndex();
  };

  const handleClick = () => {
    if (props.isDisabled) {
      return;
    }
    props.onSelect?.();
    ctx.close();
  };

  const Element = dynamic(() => props.as ?? "div");

  return (
    <Element
      class={cn(
        "relative flex min-h-7 cursor-pointer select-none items-center gap-1.5 rounded-sm px-2 py-1 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        "pointer-coarse:min-h-11 pointer-coarse:px-3 pointer-coarse:py-2.5",
        "hover:bg-surface-variant hover:text-on-surface",
        "data-[active=true]:bg-surface-variant data-[active=true]:text-on-surface",
        props.inset && "pl-7",
        props.variant === "destructive" &&
          "text-error hover:text-error data-[active=true]:text-error",
        props.isDisabled && "pointer-events-none cursor-default opacity-50",
        props.class
      )}
      data-active={isActive()}
      data-disabled={props.isDisabled}
      data-variant={props.variant}
      onClick={handleClick}
      ref={(el: HTMLElement) => {
        itemRef = el;
      }}
      role="menuitem"
      tabindex={-1}
      {...rest}
    >
      {props.children}
    </Element>
  );
}

/* ---------- CheckboxItem ---------- */

interface DropdownCheckboxItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: JSX.Element;
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
function DropdownCheckboxItem(props: DropdownCheckboxItemProps) {
  const rest = omit(
    props,
    "class",
    "children",
    "isChecked",
    "isDisabled",
    "inset",
    "onCheckedChange"
  );
  const ctx = useDropdown();
  const itemId = `dropdown-checkbox-${Math.random().toString(36).slice(2, 9)}`;

  let itemRef: HTMLDivElement | undefined;

  onSettled(() => {
    if (itemRef) {
      ctx.registerItem(itemId);
      return () => ctx.unregisterItem(itemId);
    }
  });

  const isActive = () => {
    const items = ctx.itemIds();
    return items.indexOf(itemId) === ctx.activeIndex();
  };

  const handleClick = () => {
    if (props.isDisabled) {
      return;
    }
    props.onCheckedChange?.(!props.isChecked);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.isDisabled) {
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      props.onCheckedChange?.(!props.isChecked);
    }
  };

  return (
    <div
      aria-checked={props.isChecked ? "true" : "false"}
      class={cn(
        "relative flex cursor-pointer select-none items-center gap-1.5 rounded-sm py-1 pr-8 pl-1.5 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        "pointer-coarse:min-h-11 pointer-coarse:px-3 pointer-coarse:py-2.5",
        "hover:bg-surface-variant hover:text-on-surface",
        "data-[active=true]:bg-surface-variant data-[active=true]:text-on-surface",
        props.inset && "pl-7",
        props.isDisabled && "pointer-events-none cursor-default opacity-50",
        props.class
      )}
      data-active={isActive()}
      data-disabled={props.isDisabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      ref={(el) => {
        itemRef = el;
      }}
      role="menuitemcheckbox"
      tabindex={-1}
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
    </div>
  );
}

/* ---------- Link ---------- */

type DropdownLinkProps<T extends ValidComponent = "a"> = {
  as?: T;
  children?: JSX.Element;
  class?: string;
  isDisabled?: boolean;
  inset?: boolean;
  onSelect?: () => void;
} & Omit<
  ComponentProps<T>,
  "as" | "children" | "class" | "isDisabled" | "inset" | "onSelect"
>;

/**
 * A navigation link within a dropdown menu, rendering an `<a>` by default.
 * Shares DropdownItem's lifecycle: context registration, keyboard nav, active state.
 *
 * @public
 */
function DropdownLink<T extends ValidComponent = "a">(
  props: DropdownLinkProps<T>
) {
  const rest = omit(
    props,
    "as",
    "class",
    "children",
    "isDisabled",
    "inset",
    "onSelect"
  );
  const ctx = useDropdown();
  const itemId = `dropdown-link-${Math.random().toString(36).slice(2, 9)}`;

  let itemRef: HTMLElement | undefined;

  onSettled(() => {
    if (itemRef) {
      ctx.registerItem(itemId);
      return () => ctx.unregisterItem(itemId);
    }
  });

  const isActive = () => {
    const items = ctx.itemIds();
    return items.indexOf(itemId) === ctx.activeIndex();
  };

  const handleClick = () => {
    if (props.isDisabled) {
      return;
    }
    props.onSelect?.();
    ctx.close();
  };

  const Element = dynamic(() => props.as ?? "a");

  return (
    <Element
      class={cn(
        "relative flex min-h-7 cursor-pointer select-none items-center gap-1.5 rounded-sm px-2 py-1 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        "pointer-coarse:min-h-11 pointer-coarse:px-3 pointer-coarse:py-2.5",
        "hover:bg-surface-variant hover:text-on-surface",
        "data-[active=true]:bg-surface-variant data-[active=true]:text-on-surface",
        props.inset && "pl-7",
        props.isDisabled && "pointer-events-none cursor-default opacity-50",
        props.class
      )}
      data-active={isActive()}
      data-disabled={props.isDisabled}
      onClick={handleClick}
      ref={(el: HTMLElement) => {
        itemRef = el;
      }}
      role="menuitem"
      tabindex={-1}
      {...rest}
    >
      {props.children}
    </Element>
  );
}

/* ---------- Caption ---------- */

interface DropdownCaptionProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: JSX.Element;
  class?: string;
}

/**
 * Non-interactive metadata text with role="presentation".
 * Excluded from keyboard navigation — does not register with dropdown context.
 *
 * @public
 */
function DropdownCaption(props: DropdownCaptionProps) {
  const rest = omit(props, "class", "children");

  return (
    <div
      class={cn("px-2 py-1 text-on-surface-variant text-xs", props.class)}
      role="presentation"
      {...rest}
    >
      {props.children}
    </div>
  );
}

/* ---------- Label ---------- */

interface DropdownLabelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: JSX.Element;
  class?: string;
}

/**
 * Non-interactive section header with role="presentation".
 */
function DropdownLabel(props: DropdownLabelProps) {
  const rest = omit(props, "class", "children");

  return (
    <div
      class={cn(
        "px-2 py-1.5 font-medium text-on-surface-variant text-xs",
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

interface DropdownSeparatorProps extends JSX.HTMLAttributes<HTMLHRElement> {
  class?: string;
}

/**
 * Visual divider between menu items with role="separator".
 */
function DropdownSeparator(props: DropdownSeparatorProps) {
  const rest = omit(props, "class");

  return (
    <hr
      aria-orientation="horizontal"
      class={cn("-mx-1 my-1 h-px border-none bg-outline-variant", props.class)}
      {...rest}
    />
  );
}

/* ---------- Shortcut ---------- */

interface DropdownShortcutProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  children?: JSX.Element;
  class?: string;
}

/**
 * Displays keyboard shortcut hints, right-aligned with muted styling.
 */
function DropdownShortcut(props: DropdownShortcutProps) {
  const rest = omit(props, "class", "children");

  return (
    <span
      class={cn(
        "ml-auto text-on-surface-variant text-xs tracking-widest",
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

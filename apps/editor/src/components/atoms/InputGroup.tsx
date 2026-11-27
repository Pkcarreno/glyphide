import type { JSX } from "@solidjs/web";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { ParentProps, VoidProps } from "solid-js";
import { merge, omit } from "solid-js";
import { cn } from "../../helpers/cn.ts";

/* ---------- InputGroup (Root) ---------- */

interface InputGroupProps
  extends Omit<JSX.HTMLAttributes<HTMLFieldSetElement>, "children"> {
  class?: string;
}

/**
 * Root wrapper for the input group compound component.
 * Uses <fieldset> as the semantic element for grouping form controls.
 * Provides shared focus/invalid styling via CSS group selectors.
 */
function InputGroup(props: ParentProps<InputGroupProps>) {
  const rest = omit(props, "class", "children");

  return (
    <fieldset
      class={cn(
        "group/input-group relative flex h-7 w-full min-w-0 items-center",
        "border-outline-variant bg-surface rounded-sm border",
        "m-0 border-0 p-0",
        "transition-colors outline-none",
        "has-[[data-slot=input-group-control]:focus-visible]:border-ring",
        "has-[[data-slot=input-group-control]:focus-visible]:ring-3",
        "has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50",
        "has-[[data-slot][aria-invalid=true]]:border-destructive",
        "has-[[data-slot][aria-invalid=true]]:ring-3",
        "has-[[data-slot][aria-invalid=true]]:ring-destructive/20",
        "has-[>[data-align=block-end]]:h-auto",
        "has-[>[data-align=block-end]]:flex-col",
        "has-[>[data-align=block-start]]:h-auto",
        "has-[>[data-align=block-start]]:flex-col",
        props.class
      )}
      data-slot="input-group"
      {...rest}
    >
      {props.children}
    </fieldset>
  );
}

/* ---------- InputGroupAddon ---------- */

const inputGroupAddonVariants = cva(
  "text-on-surface-variant flex h-auto cursor-text items-center justify-center gap-1 py-2 text-xs/relaxed font-medium select-none group-data-[disabled=true]/input-group:opacity-50",
  {
    defaultVariants: {
      align: "inline-start",
    },
    variants: {
      align: {
        "block-end": "order-last w-full justify-start px-2 pb-2",
        "block-start": "order-first w-full justify-start px-2 pt-2",
        "inline-end": "order-last pr-2 has-[>button]:mr-[-0.275rem]",
        "inline-start": "order-first pl-2 has-[>button]:ml-[-0.275rem]",
      },
    },
  }
);

interface InputGroupAddonProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof inputGroupAddonVariants> {
  class?: string;
}

/**
 * Addon container that positions content (buttons, text, icons)
 * at the start or end of the input group.
 * This is a visual layout container, not an interactive element.
 */
function InputGroupAddon(rawProps: ParentProps<InputGroupAddonProps>) {
  const props = merge({ align: "inline-start" as const }, rawProps);
  const rest = omit(props, "class", "align", "children");

  return (
    <div
      class={cn(inputGroupAddonVariants({ align: props.align }), props.class)}
      data-align={props.align}
      data-slot="input-group-addon"
      {...rest}
    >
      {props.children}
    </div>
  );
}

/* ---------- InputGroupButton ---------- */

const inputGroupButtonVariants = cva(
  "flex items-center gap-2 rounded-sm text-xs/relaxed shadow-none",
  {
    defaultVariants: {
      size: "xs",
    },
    variants: {
      size: {
        "icon-sm": "size-6 p-0 has-[>svg]:p-0",
        "icon-xs": "size-5 p-0 has-[>svg]:p-0",
        sm: "gap-1",
        xs: "h-5 gap-1 px-1 [&>svg:not([class*='size-'])]:size-3",
      },
    },
  }
);

interface InputGroupButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof inputGroupButtonVariants> {
  class?: string;
}

/**
 * Compact button designed for use inside InputGroupAddon.
 * Uses the project's ghost-button aesthetic by default.
 */
function InputGroupButton(rawProps: ParentProps<InputGroupButtonProps>) {
  const props = merge(
    { size: "xs" as const, type: "button" as const },
    rawProps
  );
  const rest = omit(props, "class", "size", "type", "children");

  return (
    <button
      class={cn(
        inputGroupButtonVariants({ size: props.size }),
        "text-on-surface-variant bg-transparent",
        "hover:bg-surface-variant hover:text-on-surface",
        "disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 cursor-pointer transition-colors outline-none select-none focus-visible:ring-3 aria-invalid:ring-3",
        props.class
      )}
      data-size={props.size}
      type={props.type}
      {...rest}
    >
      {props.children}
    </button>
  );
}

/* ---------- InputGroupText ---------- */

interface InputGroupTextProps
  extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> {
  class?: string;
}

/** Read-only text label rendered inside an InputGroupAddon. */
function InputGroupText(props: ParentProps<InputGroupTextProps>) {
  const rest = omit(props, "class", "children");

  return (
    <span
      class={cn(
        "text-on-surface-variant flex items-center gap-2 text-xs/relaxed",
        "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        props.class
      )}
      {...rest}
    >
      {props.children}
    </span>
  );
}

/* ---------- InputGroupInput ---------- */

interface InputGroupInputProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "children"> {
  class?: string;
}

/**
 * Stripped-down input that inherits the group's border/focus styling.
 * Apply this as the control inside an InputGroup.
 */
function InputGroupInput(rawProps: VoidProps<InputGroupInputProps>) {
  const props = merge({ type: "text" }, rawProps);
  const rest = omit(props, "class", "type");

  return (
    <input
      class={cn(
        "flex flex-1 bg-transparent outline-none",
        "border-0 shadow-none ring-0",
        "focus-visible:ring-0",
        "aria-invalid:ring-0",
        "disabled:cursor-not-allowed disabled:opacity-50",
        props.class
      )}
      data-slot="input-group-control"
      type={props.type}
      {...rest}
    />
  );
}

/** @public */
export {
  InputGroup,
  InputGroupAddon,
  type InputGroupAddonProps,
  InputGroupButton,
  type InputGroupButtonProps,
  InputGroupInput,
  type InputGroupInputProps,
  type InputGroupProps,
  InputGroupText,
  type InputGroupTextProps,
  inputGroupAddonVariants,
  inputGroupButtonVariants,
};

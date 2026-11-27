import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { dynamic } from "@solidjs/web";
import { cva } from "class-variance-authority";
import type { Accessor, FlowProps, ParentProps, VoidProps } from "solid-js";
import {
  createContext,
  createSignal,
  merge,
  omit,
  Show,
  untrack,
  useContext,
} from "solid-js";
import { cn } from "../../helpers/cn.ts";
import { composeEventHandlers } from "../../helpers/compose-event-handlers.ts";

/* ---------- Context ---------- */

interface DialogContextValue {
  close: () => void;
  isOpen: Accessor<boolean>;
  open: () => void;
}

const DialogContext = createContext<DialogContextValue>();

/**
 * Reads the Dialog context.
 * Throws `ContextNotFoundError` when called outside `<Dialog.Root>`.
 */
function useDialog(): DialogContextValue {
  return useContext(DialogContext);
}

/* ---------- Root ---------- */

interface DialogRootProps {
  /** Default open state for uncontrolled usage. */
  defaultOpen?: boolean;
  /** Controlled open state. */
  isOpen?: boolean;
  /** Fires when open state changes. */
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * Dialog root that manages open and close state and provides
 * context to compound children.
 */
function DialogRoot(rawProps: FlowProps<DialogRootProps>) {
  const props = merge({ defaultOpen: false }, rawProps);
  const isControlled = () => props.isOpen !== undefined;
  const [internalOpen, setInternalOpen] = createSignal(
    untrack(() => props.defaultOpen)
  );

  const isOpen = () =>
    isControlled() ? Boolean(props.isOpen) : internalOpen();

  function open() {
    if (!isControlled()) {
      setInternalOpen(true);
    }
    props.onOpenChange?.(true);
  }

  function close() {
    if (!isControlled()) {
      setInternalOpen(false);
    }
    props.onOpenChange?.(false);
  }

  return (
    <DialogContext value={{ close, isOpen, open }}>
      {props.children}
    </DialogContext>
  );
}

/* ---------- Trigger ---------- */

interface DialogTriggerProps
  extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, "children"> {
  class?: string;
}

/** Button that opens the dialog. */
function DialogTrigger(props: ParentProps<DialogTriggerProps>) {
  const rest = omit(props, "class", "children", "onClick", "ref");
  const { open } = useDialog();

  return (
    <button
      class={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 outline-none focus-visible:ring-3 aria-invalid:ring-3",
        props.class
      )}
      onClick={composeEventHandlers(open, props.onClick)}
      ref={props.ref}
      type="button"
      {...rest}
    >
      {props.children}
    </button>
  );
}

/* ---------- Overlay ---------- */

interface DialogOverlayProps
  extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, "children"> {
  class?: string;
  preventBackdropClose?: boolean;
}

/** Backdrop overlay that closes the dialog on click. */
function DialogOverlay(rawProps: VoidProps<DialogOverlayProps>) {
  const props = merge({ preventBackdropClose: false }, rawProps);
  const rest = omit(props, "class", "preventBackdropClose", "onClick", "ref");
  const { close } = useDialog();

  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: Backdrop overlay button is intentionally hidden from assistive tech
    <button
      aria-hidden="true"
      class={cn(
        "fixed inset-0 z-50 m-0 cursor-default border-none bg-transparent p-0",
        props.class
      )}
      onClick={composeEventHandlers(() => {
        if (!props.preventBackdropClose) {
          close();
        }
      }, props.onClick)}
      ref={props.ref}
      tabindex={-1}
      type="button"
      {...rest}
    />
  );
}

/* ---------- Content ---------- */

const dialogPositionerVariants = cva("fixed inset-0 z-50 flex justify-center", {
  defaultVariants: {
    align: "center",
  },
  variants: {
    align: {
      center: "items-center p-4",
      top: "items-start px-4 pt-[15vh]",
    },
  },
});

type DialogContentAlign = "center" | "top";

interface DialogContentProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Vertical placement of the dialog panel in the viewport. Default is "center". */
  align?: DialogContentAlign;
  class?: string;
  /** When true, clicking the backdrop does not close the dialog. */
  preventBackdropClose?: boolean;
}

/** Visible dialog panel. Renders only when open. */
function DialogContent(rawProps: ParentProps<DialogContentProps>) {
  const props = merge(
    { align: "center" as DialogContentAlign, preventBackdropClose: false },
    rawProps
  );
  const rest = omit(
    props,
    "align",
    "class",
    "children",
    "preventBackdropClose"
  );
  const { isOpen } = useDialog();

  return (
    <Show when={isOpen()}>
      <div class={dialogPositionerVariants({ align: props.align })}>
        <DialogOverlay preventBackdropClose={props.preventBackdropClose} />
        <div
          aria-modal="true"
          class={cn(
            "relative z-50",
            "bg-surface ring-on-surface/10 ring-1",
            "overflow-hidden rounded-xl shadow-md",
            "w-full max-w-sm p-4",
            "text-on-surface flex flex-col",
            props.class
          )}
          role="dialog"
          {...rest}
        >
          {props.children}
        </div>
      </div>
    </Show>
  );
}

/* ---------- Header ---------- */

interface DialogHeaderProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  class?: string;
}

/** Header section in the dialog, with a bottom border. */
function DialogHeader(props: ParentProps<DialogHeaderProps>) {
  const rest = omit(props, "class", "children");

  return (
    <div
      class={cn(
        "flex items-center justify-between px-5 py-4",
        "border-outline-variant bg-surface border-b",
        props.class
      )}
      {...rest}
    >
      {props.children}
    </div>
  );
}

/* ---------- Title ---------- */

/**
 * Properties for the DialogTitle component.
 *
 * @public
 */
type DialogTitleProps<T extends ValidComponent = "h2"> = FlowProps<
  {
    /** HTML tag or Solid component for the title. Default is "h2". */
    as?: T;
    /** Optional CSS classes merged with the canonical title typography. */
    class?: string;
  } & Omit<ComponentProps<T>, "as" | "children" | "class">
>;

/**
 * Canonical title atom for modal dialogs. Renders a semantic heading with
 * the standard dialog-title typography.
 *
 * @public
 */
function DialogTitle<T extends ValidComponent = "h2">(
  rawProps: DialogTitleProps<T>
) {
  const props = merge(
    { as: "h2" as const },
    rawProps as DialogTitleProps<"h2">
  );
  const rest = omit(props, "as", "class", "children");
  const Comp = dynamic(() => props.as ?? "h2");

  return (
    <Comp
      class={cn(
        "text-on-surface text-sm font-semibold tracking-wide",
        props.class
      )}
      {...rest}
    >
      {props.children}
    </Comp>
  );
}

/* ---------- Close ---------- */

/**
 * Properties for the DialogClose component.
 *
 * @public
 */
type DialogCloseProps<T extends ValidComponent = "button"> = ParentProps<
  {
    /** HTML tag or Solid component for the close control. Default is "button". */
    as?: T;
    /** Optional CSS classes merged with the close control classes. */
    class?: string;
  } & Omit<ComponentProps<T>, "as" | "children" | "class">
>;

/** Polymorphic control that closes the dialog on click. */
function DialogClose<T extends ValidComponent = "button">(
  rawProps: DialogCloseProps<T>
) {
  const props = merge(
    { as: "button" as T },
    rawProps as DialogCloseProps<"button">
  );
  const rest = omit(props, "as", "class", "children", "onClick", "ref", "type");
  const { close } = useDialog();
  const Comp = dynamic(() => props.as ?? "button");

  const resolvedType = () => {
    if (props.type !== undefined) {
      return props.type;
    }
    return (props.as ?? "button") === "button" ? "button" : undefined;
  };

  return (
    <Comp
      class={cn(
        "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 rounded-lg p-1.5 transition-colors outline-none focus-visible:ring-3 aria-invalid:ring-3",
        "pointer-coarse:min-h-11 pointer-coarse:min-w-11",
        props.class
      )}
      onClick={composeEventHandlers(close, props.onClick)}
      ref={props.ref}
      type={resolvedType()}
      {...rest}
    >
      {props.children}
    </Comp>
  );
}

/* ---------- Unified Namespace ---------- */

/**
 * Composable Dialog compound component.
 *
 * @public
 */
const Dialog = {
  Close: DialogClose,
  Content: DialogContent,
  Header: DialogHeader,
  Overlay: DialogOverlay,
  Root: DialogRoot,
  Title: DialogTitle,
  Trigger: DialogTrigger,
};

/** @public */
export {
  Dialog,
  type DialogCloseProps,
  type DialogContentAlign,
  type DialogContentProps,
  type DialogHeaderProps,
  type DialogOverlayProps,
  type DialogRootProps,
  type DialogTitleProps,
  type DialogTriggerProps,
  useDialog,
};

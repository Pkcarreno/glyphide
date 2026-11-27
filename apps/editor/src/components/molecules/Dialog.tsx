import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { dynamic } from "@solidjs/web";
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
import { ActionTooltip } from "./ActionTooltip.tsx";

/* ---------- Context ---------- */

interface DialogContextValue {
  close: () => void;
  isOpen: Accessor<boolean>;
  open: () => void;
}

const DialogContext = createContext<DialogContextValue>();

function useDialog(): DialogContextValue {
  return useContext(DialogContext);
}

/* ---------- Root ---------- */

interface DialogProps {
  /** Default open state for uncontrolled usage. */
  defaultOpen?: boolean;
  /** Controlled open state. */
  isOpen?: boolean;
  /** Fires when open state changes. */
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * Dialog root that manages open/close state and provides
 * context to compound children (Trigger, Overlay, Content, Header).
 */
function Dialog(rawProps: FlowProps<DialogProps>) {
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

interface DialogContentProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  class?: string;
  /** When true, clicking the backdrop does NOT close the dialog. */
  preventBackdropClose?: boolean;
}

/** The visible dialog panel. Shown only when open. */
function DialogContent(rawProps: ParentProps<DialogContentProps>) {
  const props = merge({ preventBackdropClose: false }, rawProps);
  const rest = omit(props, "class", "children", "preventBackdropClose");
  const { isOpen } = useDialog();

  return (
    <Show when={isOpen()}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
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

/** Header section within the dialog, with a bottom border. */
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
    /** The HTML tag or Solid component to render the title as. Default is "h2". */
    as?: T;
    /** Optional CSS classes merged with the canonical title typography. */
    class?: string;
  } & Omit<ComponentProps<T>, "as" | "children" | "class">
>;

/**
 * Canonical title atom for modal dialogs. Renders a semantic heading with
 * the standard dialog-title typography. The `as` prop lets consumers
 * override the heading level (or, discouraged, switch to a non-heading
 * element) without losing the canonical style.
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
  const Comp = dynamic(() => props.as as "h2");

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

interface DialogCloseProps
  extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, "children"> {
  class?: string;
}

/** Button that closes the dialog. */
function DialogClose(props: ParentProps<DialogCloseProps>) {
  const rest = omit(props, "class", "children", "onClick", "ref");
  const { close } = useDialog();

  return (
    <ActionTooltip
      as="button"
      class={cn(
        "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 rounded-lg p-1.5 transition-colors outline-none focus-visible:ring-3 aria-invalid:ring-3",
        "pointer-coarse:min-h-11 pointer-coarse:min-w-11",
        props.class
      )}
      commandId="close-all-overlays"
      onClick={composeEventHandlers(close, props.onClick)}
      position="bottom"
      ref={props.ref}
      text="Close"
      type="button"
      {...rest}
    >
      {props.children}
    </ActionTooltip>
  );
}

/** @public */
export {
  Dialog,
  DialogClose,
  type DialogCloseProps,
  DialogContent,
  type DialogContentProps,
  DialogHeader,
  type DialogHeaderProps,
  DialogOverlay,
  type DialogProps,
  DialogTitle,
  type DialogTitleProps,
  DialogTrigger,
  type DialogTriggerProps,
  useDialog,
};

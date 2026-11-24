import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { dynamic } from "@solidjs/web";
import type { Accessor } from "solid-js";
import { createContext, createSignal, omit, Show, useContext } from "solid-js";
import { cn } from "../../helpers/cn.ts";
import { ActionTooltip } from "./ActionTooltip.tsx";

/* ---------- Context ---------- */

interface DialogContextValue {
  close: () => void;
  isOpen: Accessor<boolean>;
  open: () => void;
}

const DialogContext = createContext<DialogContextValue>();

function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("Dialog compound components must be used within <Dialog>");
  }
  return ctx;
}

/* ---------- Root ---------- */

interface DialogProps {
  children: JSX.Element;
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
function Dialog(props: DialogProps) {
  const isControlled = () => props.isOpen !== undefined;
  const [internalOpen, setInternalOpen] = createSignal(
    props.defaultOpen ?? false
  );

  const isOpen = () =>
    isControlled() ? (props.isOpen ?? false) : internalOpen();

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

interface DialogTriggerProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  class?: string;
}

/** Button that opens the dialog. */
function DialogTrigger(props: DialogTriggerProps) {
  const rest = omit(props, "class", "children");
  const { open } = useDialog();

  return (
    <button
      class={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 outline-none focus-visible:ring-3 aria-invalid:ring-3",
        props.class
      )}
      onClick={open}
      type="button"
      {...rest}
    >
      {props.children}
    </button>
  );
}

/* ---------- Overlay ---------- */

interface DialogOverlayProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  class?: string;
  preventBackdropClose?: boolean;
}

/** Backdrop overlay that closes the dialog on click. */
function DialogOverlay(props: DialogOverlayProps) {
  const rest = omit(props, "class", "preventBackdropClose");
  const { close } = useDialog();

  function handleClick(e: MouseEvent) {
    if (!props.preventBackdropClose) {
      close();
    }
    if (typeof rest.onClick === "function") {
      rest.onClick(
        e as unknown as Parameters<NonNullable<typeof rest.onClick>>[0]
      );
    }
  }

  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: Backdrop overlay button is intentionally hidden from assistive tech
    <button
      aria-hidden="true"
      class={cn(
        "fixed inset-0 z-50 m-0 cursor-default border-none bg-transparent p-0",
        props.class
      )}
      onClick={handleClick}
      tabindex={-1}
      type="button"
      {...rest}
    />
  );
}

/* ---------- Content ---------- */

interface DialogContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  class?: string;
  /** When true, clicking the backdrop does NOT close the dialog. */
  preventBackdropClose?: boolean;
}

/** The visible dialog panel. Shown only when open. */
function DialogContent(props: DialogContentProps) {
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

interface DialogHeaderProps extends JSX.HTMLAttributes<HTMLDivElement> {
  class?: string;
}

/** Header section within the dialog, with a bottom border. */
function DialogHeader(props: DialogHeaderProps) {
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
type DialogTitleProps<T extends ValidComponent = "h2"> = {
  /** The HTML tag or Solid component to render the title as. Default is "h2". */
  as?: T;
  /** The title text or rich children. */
  children: JSX.Element;
  /** Optional CSS classes merged with the canonical title typography. */
  class?: string;
} & Omit<ComponentProps<T>, "as" | "children" | "class">;

/**
 * Canonical title atom for modal dialogs. Renders a semantic heading with
 * the standard dialog-title typography. The `as` prop lets consumers
 * override the heading level (or, discouraged, switch to a non-heading
 * element) without losing the canonical style.
 *
 * @public
 */
function DialogTitle<T extends ValidComponent = "h2">(
  props: DialogTitleProps<T>
) {
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

interface DialogCloseProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  class?: string;
}

/** Button that closes the dialog. */
function DialogClose(props: DialogCloseProps) {
  const rest = omit(props, "class", "children");
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
      onClick={close}
      position="bottom"
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

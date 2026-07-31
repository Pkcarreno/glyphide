import type { Accessor, ComponentProps, JSX, ValidComponent } from "solid-js";
import {
  createContext,
  createSignal,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { Dynamic } from "solid-js/web";
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
  const [local] = splitProps(props, [
    "isOpen",
    "defaultOpen",
    "onOpenChange",
    "children",
  ]);

  const isControlled = () => local.isOpen !== undefined;
  const [internalOpen, setInternalOpen] = createSignal(
    local.defaultOpen ?? false
  );

  const isOpen = () =>
    isControlled() ? (local.isOpen ?? false) : internalOpen();

  function open() {
    if (!isControlled()) {
      setInternalOpen(true);
    }
    local.onOpenChange?.(true);
  }

  function close() {
    if (!isControlled()) {
      setInternalOpen(false);
    }
    local.onOpenChange?.(false);
  }

  return (
    <DialogContext.Provider value={{ close, isOpen, open }}>
      {local.children}
    </DialogContext.Provider>
  );
}

/* ---------- Trigger ---------- */

interface DialogTriggerProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  class?: string;
}

/** Button that opens the dialog. */
function DialogTrigger(props: DialogTriggerProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  const { open } = useDialog();

  return (
    <button
      class={cn(
        "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        local.class
      )}
      onClick={open}
      type="button"
      {...rest}
    >
      {local.children}
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
  const [local, rest] = splitProps(props, ["class", "preventBackdropClose"]);
  const { close } = useDialog();

  function handleClick(e: MouseEvent) {
    if (!local.preventBackdropClose) {
      close();
    }
    if (typeof rest.onClick === "function") {
      rest.onClick(
        e as unknown as Parameters<NonNullable<typeof rest.onClick>>[0]
      );
    }
  }

  return (
    <button
      aria-hidden="true"
      class={cn(
        "fixed inset-0 z-50 m-0 cursor-default border-none bg-transparent p-0",
        local.class
      )}
      onClick={handleClick}
      tabIndex={-1}
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
  const [local, rest] = splitProps(props, [
    "class",
    "children",
    "preventBackdropClose",
  ]);
  const { isOpen } = useDialog();

  return (
    <Show when={isOpen()}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <DialogOverlay preventBackdropClose={local.preventBackdropClose} />
        <div
          aria-modal="true"
          class={cn(
            "relative z-50",
            "bg-surface ring-1 ring-on-surface/10",
            "overflow-hidden rounded-xl shadow-md",
            "w-full max-w-sm p-4",
            "flex flex-col text-on-surface",
            local.class
          )}
          role="dialog"
          {...rest}
        >
          {local.children}
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
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn(
        "flex items-center justify-between px-5 py-4",
        "border-outline-variant border-b bg-surface",
        local.class
      )}
      {...rest}
    >
      {local.children}
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
  const [local, rest] = splitProps(props, ["as", "class", "children"]);

  return (
    <Dynamic
      class={cn(
        "font-semibold text-on-surface text-sm tracking-wide",
        local.class
      )}
      component={local.as ?? "h2"}
      {...rest}
    >
      {local.children}
    </Dynamic>
  );
}

/* ---------- Close ---------- */

interface DialogCloseProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  class?: string;
}

/** Button that closes the dialog. */
function DialogClose(props: DialogCloseProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  const { close } = useDialog();

  return (
    <ActionTooltip
      action={{ type: "CLOSE_ALL_OVERLAYS" }}
      as="button"
      class={cn(
        "rounded-lg p-1.5 text-on-surface-variant outline-none transition-colors hover:bg-surface-variant hover:text-on-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        "pointer-coarse:min-h-11 pointer-coarse:min-w-11",
        local.class
      )}
      onClick={close}
      position="bottom"
      text="Close"
      type="button"
      {...rest}
    >
      {local.children}
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

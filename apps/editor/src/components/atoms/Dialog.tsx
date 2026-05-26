import {
  createSignal,
  splitProps,
  createContext,
  useContext,
  Show,
} from "solid-js";
import type { JSX, Accessor } from "solid-js";
import { cn } from "../../helpers/cn";

/* ---------- Context ---------- */

interface DialogContextValue {
  isOpen: Accessor<boolean>;
  open: () => void;
  close: () => void;
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
  /** Controlled open state. */
  isOpen?: boolean;
  /** Default open state for uncontrolled usage. */
  defaultOpen?: boolean;
  /** Fires when open state changes. */
  onOpenChange?: (isOpen: boolean) => void;
  children: JSX.Element;
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
    local.defaultOpen ?? false,
  );

  const isOpen = () => (isControlled() ? local.isOpen! : internalOpen());

  function open() {
    if (!isControlled()) setInternalOpen(true);
    local.onOpenChange?.(true);
  }

  function close() {
    if (!isControlled()) setInternalOpen(false);
    local.onOpenChange?.(false);
  }

  return (
    <DialogContext.Provider value={{ isOpen, open, close }}>
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
      type="button"
      onClick={open}
      class={cn(local.class)}
      {...rest}
    >
      {local.children}
    </button>
  );
}

/* ---------- Overlay ---------- */

interface DialogOverlayProps extends JSX.HTMLAttributes<HTMLDivElement> {
  class?: string;
}

/** Backdrop overlay that closes the dialog on click. */
function DialogOverlay(props: DialogOverlayProps) {
  const [local, rest] = splitProps(props, ["class"]);
  const { close } = useDialog();

  return (
    <div
      class={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-md",
        local.class,
      )}
      onClick={close}
      {...rest}
    />
  );
}

/* ---------- Content ---------- */

interface DialogContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  class?: string;
}

/** The visible dialog panel. Shown only when open. */
function DialogContent(props: DialogContentProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  const { isOpen } = useDialog();

  return (
    <Show when={isOpen()}>
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <DialogOverlay />
        <div
          role="dialog"
          aria-modal="true"
          class={cn(
            "relative z-50",
            "bg-surface border border-outline-variant",
            "rounded-sm shadow-none overflow-hidden",
            "w-full max-w-sm",
            "flex flex-col font-sans text-ui-label",
            local.class,
          )}
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
        "flex justify-between items-center p-3",
        "border-b border-outline-variant",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
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
    <button
      type="button"
      onClick={close}
      class={cn(local.class)}
      {...rest}
    >
      {local.children}
    </button>
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogClose,
  useDialog,
  type DialogProps,
  type DialogTriggerProps,
  type DialogContentProps,
  type DialogHeaderProps,
  type DialogCloseProps,
};

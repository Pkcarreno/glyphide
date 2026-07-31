import { cva, type VariantProps } from "class-variance-authority";
import X from "lucide-solid/icons/x";
import type { JSX } from "solid-js";
import { createMemo, createSignal, Show, splitProps } from "solid-js";
import { cn } from "../../helpers/cn.ts";

const fileDropVariants = cva(
  [
    "relative flex items-center justify-center rounded-md border",
    "font-sans text-sm",
    "transition-colors duration-150",
    "active:scale-[0.96]",
    "cursor-pointer select-none",
    "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    defaultVariants: {
      size: "default",
    },
    variants: {
      size: {
        default: "h-34 px-4",
        "full-width": "h-34 w-full px-4",
      },
    },
  }
);

type FileDropVariants = VariantProps<typeof fileDropVariants>;

/** Visual state machine for the drop zone. */
type VisualState = "idle" | "drag-over" | "selected" | "error";

/**
 * Props for the FileDrop atom.
 * @public
 */
export interface FileDropProps {
  /** Comma-separated file extensions accepted by the picker (e.g. ".js,.py"). */
  accept?: string;
  /** Additional CSS classes merged with the variant + state classes. */
  class?: string;
  /** Disables all interactions and dims the zone. */
  disabled?: boolean;
  /** Fires when a file is rejected (invalid extension). */
  onError?: (message: string) => void;
  /** Fires when the selected file is removed (user clicks the X). */
  onFileRemoved?: () => void;
  /** Fires when a file with an accepted extension is selected. */
  onFileSelected: (file: File) => void;
  /** Layout variant. */
  size?: FileDropVariants["size"];
}

const DEFAULT_ACCEPT = ".js,.py";
const INVALID_MESSAGE =
  "Unsupported file type. Please choose a .js or .py file.";

/**
 * Maps a file name to a normalized extension (lowercase, with leading dot).
 */
function extensionOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx).toLowerCase();
}

/**
 * FileDrop atom — a clickable + draggable drop zone for a single file.
 * Owns its visual state (idle → drag-over → selected → error) via internal
 * signals and exposes a normalized callback to parents.
 * @public
 */
export function FileDrop(props: FileDropProps) {
  const [local] = splitProps(props, [
    "accept",
    "class",
    "disabled",
    "onFileSelected",
    "onFileRemoved",
    "onError",
    "size",
  ]);

  const [visualState, setVisualState] = createSignal<VisualState>("idle");
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  // Plain closure counter — never read in JSX, only used to suppress
  // false `dragleave` events that bubble from child elements.
  let dragCounter = 0;
  const inputRef = { current: null as HTMLInputElement | null };

  function clickInput(): void {
    inputRef.current?.click();
  }

  function clearInput(): void {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const acceptList = createMemo(() =>
    (local.accept ?? DEFAULT_ACCEPT)
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );

  function validateAndAccept(file: File): void {
    const ext = extensionOf(file.name);
    if (!acceptList().includes(ext)) {
      setVisualState("error");
      setErrorMessage(INVALID_MESSAGE);
      local.onError?.(INVALID_MESSAGE);
      return;
    }
    setSelectedFile(file);
    setErrorMessage(null);
    setVisualState("selected");
    local.onFileSelected(file);
  }

  function handleClick(): void {
    if (local.disabled) {
      return;
    }
    clickInput();
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (local.disabled) {
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      clickInput();
    }
  }

  function handleDragEnter(e: DragEvent): void {
    if (local.disabled) {
      return;
    }
    e.preventDefault();
    dragCounter += 1;
    setVisualState("drag-over");
  }

  function handleDragLeave(e: DragEvent): void {
    if (local.disabled) {
      return;
    }
    e.preventDefault();
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) {
      setVisualState(selectedFile() ? "selected" : "idle");
    }
  }

  function handleDragOver(e: DragEvent): void {
    if (local.disabled) {
      return;
    }
    e.preventDefault();
  }

  function handleDrop(e: DragEvent): void {
    if (local.disabled) {
      return;
    }
    e.preventDefault();
    dragCounter = 0;
    const file = e.dataTransfer?.files?.[0];
    if (!file) {
      setVisualState("idle");
      return;
    }
    validateAndAccept(file);
  }

  function handleInputChange(e: Event): void {
    const target = e.currentTarget as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      return;
    }
    validateAndAccept(file);
  }

  function handleRemove(e: MouseEvent): void {
    e.stopPropagation();
    setSelectedFile(null);
    setErrorMessage(null);
    setVisualState("idle");
    // Re-arm the input so the same file can be picked again.
    clearInput();
    local.onFileRemoved?.();
  }

  // Visual state classes — derived at render time, not via CVA.
  const stateClasses = createMemo(() => {
    switch (visualState() as VisualState) {
      case "idle":
        return "border-dashed border-outline-variant bg-transparent text-on-surface-variant";
      case "drag-over":
        return "border-solid border-primary bg-primary/10 text-on-surface";
      case "selected":
        return "border-solid border-outline-variant bg-surface-variant text-on-surface";
      case "error":
        return "border-solid border-error bg-transparent text-error";
      default:
        return "";
    }
  });

  return (
    <div class={cn("relative", local.class)} data-testid="file-drop-wrapper">
      <button
        aria-disabled={local.disabled}
        aria-label={
          visualState() === "selected" && selectedFile()
            ? `Selected file: ${selectedFile()?.name}. Press remove to clear.`
            : "Drop zone: click or drop a file to upload"
        }
        class={cn(fileDropVariants({ size: local.size }), stateClasses())}
        data-state={visualState()}
        data-testid="file-drop"
        disabled={local.disabled}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        type="button"
      >
        <Show
          fallback={
            <span
              class="pointer-events-none truncate font-mono text-xs"
              title={selectedFile()?.name}
            >
              {selectedFile()?.name}
            </span>
          }
          when={visualState() !== "selected"}
        >
          <span class="pointer-events-none text-center">
            {errorMessage() ?? "Click or drop a file here"}
          </span>
        </Show>
        <input
          accept={local.accept ?? DEFAULT_ACCEPT}
          aria-hidden="true"
          class="sr-only"
          onChange={handleInputChange}
          ref={(el) => {
            inputRef.current = el;
          }}
          style={{ display: "none" }}
          tabIndex={-1}
          type="file"
        />
      </button>
      <Show when={visualState() === "selected"}>
        <button
          aria-label="Remove file"
          class="absolute top-1 right-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded-sm bg-surface/80 text-on-surface-variant outline-none transition-colors hover:bg-surface hover:text-on-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
          data-testid="file-drop-remove"
          onClick={handleRemove}
          type="button"
        >
          <X size={14} />
        </button>
      </Show>
    </div>
  ) as JSX.Element;
}

import type { JSX } from "solid-js";
import { createSignal } from "solid-js";
import { cn } from "../../helpers/cn.ts";
import { Resizer } from "../atoms/Resizer.tsx";
import { SafeAreaContainer } from "../atoms/SafeAreaContainer.tsx";

interface WorkspaceLayoutProps {
  class?: string;
  /** Output console slot */
  consolePane: JSX.Element;
  /** Main editor slot */
  editorPane: JSX.Element;
  /** Top header slot */
  header: JSX.Element;
  /** Bottom status bar slot */
  statusBar: JSX.Element;
}

/**
 * Main layout template coordinating the Header, Editor, Console, and Status Bar.
 * Handles the responsive resizer logic between the Editor and Console panes via CSS and DOM updates.
 */
function WorkspaceLayout(props: WorkspaceLayoutProps) {
  let containerRef: HTMLElement | undefined;
  const [editorSize, setEditorSize] = createSignal<number>(50); // 50% by default

  // Handle resizing directly (using movementX from the new Resizer)
  function handleResize(deltaX: number) {
    if (!containerRef || window.innerWidth < 768) {
      return;
    }

    // Calculate percentage change
    const containerWidth = containerRef.clientWidth;
    const deltaPercentage = (deltaX / containerWidth) * 100;

    setEditorSize((prev) => {
      const newSize = prev + deltaPercentage;
      // Clamp between 10% and 90% to prevent collapsing panes
      return Math.max(10, Math.min(90, newSize));
    });
  }

  return (
    <div
      class={cn(
        "flex h-dvh w-screen flex-col overflow-hidden bg-background",
        props.class
      )}
      style={{ "--editor-size": `${editorSize()}%` }}
    >
      <SafeAreaContainer class="flex flex-1 flex-col overflow-hidden">
        <div class="relative z-20 shrink-0">{props.header}</div>

        <main
          class="relative z-0 flex flex-1 flex-col overflow-hidden md:flex-row"
          ref={(el) => {
            containerRef = el;
          }}
        >
          {/* Editor Wrapper */}
          <div
            class={cn(
              "flex flex-col overflow-hidden border-outline-variant border-b transition-none md:border-b-0",
              "flex-1 md:flex-none md:basis-(--editor-size)"
            )}
          >
            {props.editorPane}
          </div>

          {/* Resizer - Hidden in mobile, active in desktop */}
          <Resizer class="hidden md:block" onResizeDelta={handleResize} />

          {/* Console Wrapper */}
          <div
            class={cn(
              "flex flex-col overflow-hidden transition-none",
              "flex-1 md:flex-none md:basis-[calc(100%-var(--editor-size)-1px)]",
              "h-1/3 min-h-[200px] md:h-auto"
            )}
          >
            {props.consolePane}
          </div>
        </main>

        <div class="relative z-20 shrink-0">{props.statusBar}</div>
      </SafeAreaContainer>
    </div>
  );
}

/** @public */
export { WorkspaceLayout, type WorkspaceLayoutProps };

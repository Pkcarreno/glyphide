import type { JSX } from "@solidjs/web";
import type { Accessor, ParentProps, VoidProps } from "solid-js";
import {
  createContext,
  createSignal,
  merge,
  omit,
  onCleanup,
  untrack,
  useContext,
} from "solid-js";
import { cn } from "../../helpers/cn.ts";
import type { ResizerProps } from "../atoms/Resizer.tsx";
import { Resizer } from "../atoms/Resizer.tsx";
import { SafeAreaContainer } from "../atoms/SafeAreaContainer.tsx";

const DEFAULT_EDITOR_SIZE_PERCENT = 50;
const MIN_EDITOR_SIZE_PERCENT = 10;
const MAX_EDITOR_SIZE_PERCENT = 90;
const DESKTOP_BREAKPOINT_PX = 768;

function clampEditorSize(size: number): number {
  return Math.max(
    MIN_EDITOR_SIZE_PERCENT,
    Math.min(MAX_EDITOR_SIZE_PERCENT, size)
  );
}

/* ---------- Context ---------- */

interface WorkspaceLayoutContextValue {
  editorSize: Accessor<number>;
  resizeByDelta: (deltaX: number) => void;
  setContainerElement: (el: HTMLElement | undefined) => void;
}

const WorkspaceLayoutContext = createContext<WorkspaceLayoutContextValue>();

/**
 * Retrieves the WorkspaceLayout context.
 * Throws `ContextNotFoundError` when called outside `<WorkspaceLayout.Root>`.
 *
 * @public
 */
function useWorkspaceLayout(): WorkspaceLayoutContextValue {
  return useContext(WorkspaceLayoutContext);
}

/* ---------- Root ---------- */

interface WorkspaceLayoutRootProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  class?: string;
  /** Initial editor width percentage on desktop viewports. Default is 50. */
  defaultEditorSize?: number;
}

/**
 * Root container for the workspace layout.
 * Owns `editorSize` and container measurement while providing context to compound subcomponents.
 */
function WorkspaceLayoutRoot(rawProps: ParentProps<WorkspaceLayoutRootProps>) {
  const props = merge(
    { defaultEditorSize: DEFAULT_EDITOR_SIZE_PERCENT },
    rawProps
  );
  const rest = omit(props, "class", "children", "defaultEditorSize", "style");

  let containerElement: HTMLElement | undefined;
  const [editorSize, setEditorSize] = createSignal<number>(
    untrack(() => clampEditorSize(props.defaultEditorSize))
  );

  function setContainerElement(el: HTMLElement | undefined) {
    containerElement = el;
  }

  function resizeByDelta(deltaX: number) {
    if (!containerElement || window.innerWidth < DESKTOP_BREAKPOINT_PX) {
      return;
    }

    const containerWidth = containerElement.clientWidth;
    if (containerWidth <= 0) {
      return;
    }

    const deltaPercentage = (deltaX / containerWidth) * 100;
    setEditorSize((prev) => clampEditorSize(prev + deltaPercentage));
  }

  const rootStyle = (): JSX.CSSProperties | string => {
    const editorSizeValue = `${editorSize()}%`;
    if (typeof props.style === "string") {
      return `${props.style};--editor-size:${editorSizeValue}`;
    }
    return {
      ...props.style,
      "--editor-size": editorSizeValue,
    };
  };

  return (
    <WorkspaceLayoutContext
      value={{ editorSize, resizeByDelta, setContainerElement }}
    >
      <div
        class={cn(
          "bg-background flex h-dvh w-screen flex-col overflow-hidden",
          props.class
        )}
        style={rootStyle()}
        {...rest}
      >
        <SafeAreaContainer class="flex flex-1 flex-col overflow-hidden">
          {props.children}
        </SafeAreaContainer>
      </div>
    </WorkspaceLayoutContext>
  );
}

/* ---------- Header ---------- */

interface WorkspaceLayoutHeaderProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  class?: string;
}

/** Top header slot inside `<WorkspaceLayout.Root>`. */
function WorkspaceLayoutHeader(props: ParentProps<WorkspaceLayoutHeaderProps>) {
  useWorkspaceLayout();
  const rest = omit(props, "class", "children");

  return (
    <div class={cn("relative z-20 shrink-0", props.class)} {...rest}>
      {props.children}
    </div>
  );
}

/* ---------- Main ---------- */

interface WorkspaceLayoutMainProps
  extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  class?: string;
}

/** Main split container measuring width for desktop pane resizing. */
function WorkspaceLayoutMain(props: ParentProps<WorkspaceLayoutMainProps>) {
  const { setContainerElement } = useWorkspaceLayout();
  const rest = omit(props, "class", "children", "ref");

  onCleanup(() => {
    setContainerElement(undefined);
  });

  return (
    <main
      class={cn(
        "relative z-0 flex flex-1 flex-col overflow-hidden md:flex-row",
        props.class
      )}
      ref={[setContainerElement, props.ref]}
      {...rest}
    >
      {props.children}
    </main>
  );
}

/* ---------- Editor ---------- */

interface WorkspaceLayoutEditorProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  class?: string;
}

/** Primary editor pane inside `<WorkspaceLayout.Main>`. */
function WorkspaceLayoutEditor(props: ParentProps<WorkspaceLayoutEditorProps>) {
  useWorkspaceLayout();
  const rest = omit(props, "class", "children");

  return (
    <div
      class={cn(
        "border-outline-variant flex flex-col overflow-hidden border-b transition-none md:border-b-0",
        "flex-1 md:flex-none md:basis-(--editor-size)",
        props.class
      )}
      {...rest}
    >
      {props.children}
    </div>
  );
}

/* ---------- Resizer ---------- */

type WorkspaceLayoutResizerProps = VoidProps<ResizerProps>;

/** Desktop drag handle connecting pointer deltas to `WorkspaceLayout.Root`. */
function WorkspaceLayoutResizer(props: WorkspaceLayoutResizerProps) {
  const { resizeByDelta } = useWorkspaceLayout();
  const rest = omit(props, "class", "onResizeDelta");

  function handleResizeDelta(deltaX: number) {
    resizeByDelta(deltaX);
    props.onResizeDelta?.(deltaX);
  }

  return (
    <Resizer
      class={cn("hidden md:block", props.class)}
      onResizeDelta={handleResizeDelta}
      {...rest}
    />
  );
}

/* ---------- Console ---------- */

interface WorkspaceLayoutConsoleProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  class?: string;
}

/** Output console pane inside `<WorkspaceLayout.Main>`. */
function WorkspaceLayoutConsole(
  props: ParentProps<WorkspaceLayoutConsoleProps>
) {
  useWorkspaceLayout();
  const rest = omit(props, "class", "children");

  return (
    <div
      class={cn(
        "flex flex-col overflow-hidden transition-none",
        "flex-1 md:flex-none md:basis-[calc(100%-var(--editor-size)-1px)]",
        "h-1/3 min-h-[200px] md:h-auto",
        props.class
      )}
      {...rest}
    >
      {props.children}
    </div>
  );
}

/* ---------- StatusBar ---------- */

interface WorkspaceLayoutStatusBarProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  class?: string;
}

/** Bottom status bar slot inside `<WorkspaceLayout.Root>`. */
function WorkspaceLayoutStatusBar(
  props: ParentProps<WorkspaceLayoutStatusBarProps>
) {
  useWorkspaceLayout();
  const rest = omit(props, "class", "children");

  return (
    <div class={cn("relative z-20 shrink-0", props.class)} {...rest}>
      {props.children}
    </div>
  );
}

/* ---------- Unified Namespace ---------- */

/**
 * Main layout template coordinating Header, Main, Editor, Resizer, Console, and StatusBar.
 * Handles responsive resizer logic between the Editor and Console panes via CSS and context state.
 *
 * @public
 */
const WorkspaceLayout = {
  Console: WorkspaceLayoutConsole,
  Editor: WorkspaceLayoutEditor,
  Header: WorkspaceLayoutHeader,
  Main: WorkspaceLayoutMain,
  Resizer: WorkspaceLayoutResizer,
  Root: WorkspaceLayoutRoot,
  StatusBar: WorkspaceLayoutStatusBar,
};

/** @public */
export {
  useWorkspaceLayout,
  WorkspaceLayout,
  type WorkspaceLayoutConsoleProps,
  type WorkspaceLayoutContextValue,
  type WorkspaceLayoutEditorProps,
  type WorkspaceLayoutHeaderProps,
  type WorkspaceLayoutMainProps,
  type WorkspaceLayoutResizerProps,
  type WorkspaceLayoutRootProps,
  type WorkspaceLayoutStatusBarProps,
};

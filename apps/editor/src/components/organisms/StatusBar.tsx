import RefreshCcw from "lucide-solid/icons/refresh-ccw";
import Settings2 from "lucide-solid/icons/settings-2";
import type { JSX } from "solid-js";
import {
  createEffect,
  createSignal,
  onCleanup,
  Show,
  splitProps,
} from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { cn } from "../../helpers/cn.ts";
import { Icon } from "../atoms/Icon.tsx";
import {
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipRoot,
  TooltipTrigger,
} from "../atoms/Tooltip.tsx";

/**
 * Props for the StatusBar root component.
 */
interface StatusBarProps extends JSX.HTMLAttributes<HTMLElement> {
  class?: string;
}

/**
 * Props for the StatusBarItem component.
 */
interface StatusBarItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
  class?: string;
}

/**
 * Structural wrapper for static items inside the StatusBar.
 * Enforces standardized padding and vertical alignment.
 */
function StatusBarItem(props: StatusBarItemProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn("flex h-full items-center gap-1 px-1.5", local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
}

/**
 * Props for the StatusBarButton component.
 */
interface StatusBarButtonProps
  extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  children: JSX.Element;
  class?: string;
  tooltip?: string;
  tooltipDescription?: string;
  tooltipShortcut?: string;
}

/**
 * Interactive button for the StatusBar.
 * Enforces standard padding, hover effects, and automatic Tooltip integration.
 */
function StatusBarButton(props: StatusBarButtonProps) {
  const [local, rest] = splitProps(props, [
    "class",
    "tooltip",
    "tooltipShortcut",
    "tooltipDescription",
    "children",
  ]);

  const buttonClass = cn(
    "flex h-full items-center gap-1 rounded-md px-1",
    "cursor-pointer transition-colors hover:bg-surface-variant hover:text-on-surface",
    local.class
  );

  return (
    <Show
      fallback={
        <button class={buttonClass} {...rest}>
          {local.children}
        </button>
      }
      when={local.tooltip}
    >
      <TooltipRoot position="top">
        <TooltipTrigger as="button" class={buttonClass} {...rest}>
          {local.children}
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner>
            <TooltipPopup>
              <div class="flex items-start justify-between gap-2">
                <span
                  class={cn(
                    local.tooltipDescription || local.tooltipShortcut
                      ? "text-on-surface-variant"
                      : "text-on-surface"
                  )}
                >
                  {local.tooltip}
                </span>
                <Show when={local.tooltipShortcut}>
                  <span class="mt-0.5 whitespace-nowrap font-medium font-sans text-on-surface-variant text-xs">
                    {local.tooltipShortcut}
                  </span>
                </Show>
              </div>
              <Show when={local.tooltipDescription}>
                <span class="mt-1 text-on-surface-variant">
                  {local.tooltipDescription}
                </span>
              </Show>
            </TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </TooltipRoot>
    </Show>
  );
}

function TerminalStatusIndicator(props: { status: string }) {
  const [frame, setFrame] = createSignal(0);
  const brailleFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  createEffect(() => {
    if (props.status === "running" || props.status === "initializing") {
      const timer = setInterval(
        () => setFrame((f) => (f + 1) % brailleFrames.length),
        80
      );
      onCleanup(() => clearInterval(timer));
    }
  });

  return (
    <div class="flex items-center gap-1.5">
      <span>{props.status}</span>
      <Show
        when={props.status === "running" || props.status === "initializing"}
      >
        <span class="w-3 text-center">{brailleFrames[frame()]}</span>
      </Show>
    </div>
  );
}

/**
 * Bottom status bar compound organism.
 * Shows system state on the left and layout controls on the right.
 *
 * Compound parts: `StatusBar.Item`, `StatusBar.Button`.
 */
function StatusBar(props: StatusBarProps) {
  const [local, rest] = splitProps(props, ["class"]);
  const core = useEditor();

  function openEngineSelector() {
    core.dispatcher.dispatch({
      type: "OPEN_OVERLAY",
      overlayId: "engine-selector",
    });
  }

  return (
    <footer
      class={cn(
        "flex h-status-bar-height items-center justify-between",
        "border-outline-variant border-t bg-background px-padding-x",
        "select-none font-sans text-on-surface-variant text-status-bar uppercase opacity-80",
        local.class
      )}
      {...rest}
    >
      <div class="flex h-full items-center gap-1">
        <StatusBarItem>
          <span class="capitalize">{core.engine.activeLanguage()}</span>
        </StatusBarItem>

        <StatusBarItem class="lowercase">
          <TerminalStatusIndicator status={core.engine.engineStatus()} />
        </StatusBarItem>
      </div>

      <div class="flex h-full items-center gap-1">
        <StatusBarItem>
          <span>
            {core.buffer.cursorPosition().line}:
            {core.buffer.cursorPosition().column}
            <Show when={core.buffer.cursorPosition().selectionLength > 0}>
              {" "}
              ({core.buffer.cursorPosition().selectionLines}l,{" "}
              {core.buffer.cursorPosition().selectionLength}c)
            </Show>
          </span>
        </StatusBarItem>

        <StatusBarButton onClick={openEngineSelector} tooltip="Select Engine">
          <span>{core.engine.activeEngineId()}</span>
        </StatusBarButton>

        {core.engine.engineStatus() === "error" ? (
          <StatusBarButton
            aria-label="Retry engine initialization"
            onClick={() =>
              core.dispatcher.dispatch({ type: "RETRY_ENGINE_INIT" })
            }
            tooltip="Retry Initialization"
          >
            <Icon class="text-red-500" icon={RefreshCcw} size={12} />
          </StatusBarButton>
        ) : (
          <StatusBarButton
            aria-label="Engine settings"
            tooltip="Engine Settings"
          >
            <Icon icon={Settings2} size={12} />
          </StatusBarButton>
        )}
      </div>
    </footer>
  );
}

StatusBar.Item = StatusBarItem;
StatusBar.Button = StatusBarButton;

export {
  StatusBar,
  type StatusBarButtonProps,
  type StatusBarItemProps,
  type StatusBarProps,
};

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
import type { CommandId } from "../../core/shortcuts/registry.ts";
import { cn } from "../../helpers/cn.ts";
import { Icon } from "../atoms/Icon.tsx";
import { ActionTooltip } from "../molecules/ActionTooltip.tsx";

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

interface StatusBarButtonBaseProps
  extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  children: JSX.Element;
  class?: string;
  commandId?: CommandId;
  tooltip?: string;
  tooltipDescription?: string;
  tooltipShortcut?: string;
}

/**
 * Props for the StatusBarButton component.
 */
type StatusBarButtonProps = StatusBarButtonBaseProps;

/**
 * Interactive button for the StatusBar.
 * Enforces standard padding, hover effects, and automatic Tooltip integration.
 */
function StatusBarButton(props: StatusBarButtonProps) {
  const [local, rest] = splitProps(props, [
    "class",
    "commandId",
    "tooltip",
    "tooltipShortcut",
    "tooltipDescription",
    "children",
  ]);

  const buttonClass = cn(
    "flex h-full items-center gap-1 rounded-md px-1 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
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
      <ActionTooltip
        as="button"
        class={buttonClass}
        commandId={local.commandId}
        meta={local.tooltipDescription}
        position="top"
        shortcut={local.tooltipShortcut}
        text={local.tooltip ?? ""}
        {...rest}
      >
        {local.children}
      </ActionTooltip>
    </Show>
  );
}

function TerminalStatusIndicator(props: { status: string; isDirty?: boolean }) {
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
      <Show when={props.isDirty}>
        <span class="rounded bg-amber-500/20 px-1 font-bold text-[10px] text-amber-500 uppercase tracking-wider">
          Execution Stale
        </span>
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
    core.overlays.open("engine-selector");
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
          <TerminalStatusIndicator
            isDirty={core.engine.isDirty()}
            status={core.engine.engineStatus()}
          />
        </StatusBarItem>
      </div>

      <div class="flex h-full items-center gap-1">
        <StatusBarItem>
          <span>
            {core.session.cursorPosition().line}:
            {core.session.cursorPosition().column}
            <Show when={core.session.cursorPosition().selectionLength > 0}>
              {" "}
              ({core.session.cursorPosition().selectionLines}l,{" "}
              {core.session.cursorPosition().selectionLength}c)
            </Show>
          </span>
        </StatusBarItem>

        {/* Hidden on mobile, visible md+ */}
        <StatusBarItem class="hidden md:block">
          <StatusBarButton
            onClick={openEngineSelector}
            tooltip="Select Engine"
            tooltipDescription="Switch the active execution engine."
          >
            <span>{core.engine.activeEngineId()}</span>
          </StatusBarButton>
        </StatusBarItem>

        {core.engine.engineStatus() === "error" ? (
          <StatusBarButton
            aria-label="Retry engine initialization"
            onClick={() => core.commands.retryEngineInit()}
            tooltip="Retry Initialization"
          >
            <Icon class="text-red-500" icon={RefreshCcw} size={12} />
          </StatusBarButton>
        ) : (
          /* Hidden on mobile, visible md+ */
          <span class="hidden md:block">
            <StatusBarButton
              id="engine-settings-trigger"
              onClick={() => core.overlays.open("engine-settings")}
              tooltip="Engine Settings"
            >
              <Icon icon={Settings2} size={14} />
            </StatusBarButton>
          </span>
        )}
      </div>
    </footer>
  );
}

StatusBar.Item = StatusBarItem;
StatusBar.Button = StatusBarButton;

/** @public */
export {
  StatusBar,
  type StatusBarButtonProps,
  type StatusBarItemProps,
  type StatusBarProps,
};

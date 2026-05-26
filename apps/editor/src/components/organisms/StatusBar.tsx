import { splitProps, Show } from "solid-js";
import type { JSX } from "solid-js";
import type { SystemStatus } from "../../types/system";
import { Icon } from "../atoms/Icon";
import ChevronDown from "lucide-solid/icons/chevron-down";
import Settings2 from "lucide-solid/icons/settings-2";
import { cn } from "../../helpers/cn";
import {
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "../atoms/Tooltip";

/**
 * Props for the StatusBar root component.
 */interface StatusBarProps extends JSX.HTMLAttributes<HTMLElement> {
  /** The system status to display */
  status?: SystemStatus;
  class?: string;
}

/**
 * Props for the StatusBarItem component.
 */interface StatusBarItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  class?: string;
  children: JSX.Element;
}

/**
 * Structural wrapper for static items inside the StatusBar.
 * Enforces standardized padding and vertical alignment.
 */
function StatusBarItem(props: StatusBarItemProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn("flex items-center gap-1 h-full px-1.5", local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
}

/**
 * Props for the StatusBarButton component.
 */interface StatusBarButtonProps
  extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  class?: string;
  tooltip?: string;
  tooltipShortcut?: string;
  tooltipDescription?: string;
  children: JSX.Element;
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
    "flex items-center rounded-md gap-1 h-full px-1",
    "cursor-pointer hover:bg-surface-variant hover:text-on-surface transition-colors",
    local.class,
  );

  return (
    <Show
      when={local.tooltip}
      fallback={
        <button class={buttonClass} {...rest}>
          {local.children}
        </button>
      }
    >
      <TooltipRoot position="top">
        <TooltipTrigger
          as="button"
          class={buttonClass}
          {...rest}
        >
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
                      : "text-on-surface",
                  )}
                >
                  {local.tooltip}
                </span>
                <Show when={local.tooltipShortcut}>
                  <span class="text-on-surface-variant font-mono text-section-header mt-0.5 whitespace-nowrap">
                    {local.tooltipShortcut}
                  </span>
                </Show>
              </div>
              <Show when={local.tooltipDescription}>
                <span class="text-on-surface-variant mt-1">
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


/**
 * Bottom status bar compound organism.
 * Shows system state on the left and layout controls on the right.
 *
 * Compound parts: `StatusBar.Item`, `StatusBar.Button`.
 */
function StatusBar(props: StatusBarProps) {
  const [local, rest] = splitProps(props, [
    "status",
    "class",
  ]);

  return (
    <footer
      class={cn(
        "flex h-status-bar-height items-center justify-between",
        "border-t border-outline-variant bg-background px-padding-x",
        "font-mono text-status-bar text-on-surface-variant select-none uppercase opacity-80",
        local.class,
      )}
      {...rest}
    >
      <div class="flex items-center gap-1 h-full">
        <StatusBarItem>
          <span>14:3</span>
        </StatusBarItem>
        <StatusBarItem>
          <span>TypeScript</span>
        </StatusBarItem>
      </div>

      <div class="flex items-center gap-1 h-full">
        <StatusBarButton tooltip="Change Engine">
          <span>QuickJS V8</span>
          <Icon icon={ChevronDown} size={12} />
        </StatusBarButton>

        <StatusBarButton tooltip="Engine Settings" aria-label="Engine settings">
          <Icon icon={Settings2} size={12} />
        </StatusBarButton>

        <StatusBarButton tooltip="System Status">
          <span>{local.status === "running" ? "Running" : "Idle"}</span>
        </StatusBarButton>
      </div>
    </footer>
  );
}

StatusBar.Item = StatusBarItem;
StatusBar.Button = StatusBarButton;

export {
  StatusBar,
  type StatusBarProps,
  type StatusBarItemProps,
  type StatusBarButtonProps,
};

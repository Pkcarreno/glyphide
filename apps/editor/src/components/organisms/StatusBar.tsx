import type { JSX } from "@solidjs/web";
import RefreshCcw from "lucide-solid/icons/refresh-ccw";
import Settings2 from "lucide-solid/icons/settings-2";
import type { FlowProps, VoidProps } from "solid-js";
import {
  createEffect,
  createSignal,
  Errored,
  isPending,
  Loading,
  latest,
  merge,
  omit,
  Show,
} from "solid-js";
import { useEditor } from "../../core/context.tsx";
import type { CommandId } from "../../core/shortcuts/registry.ts";
import { cn } from "../../helpers/cn.ts";
import { Icon } from "../atoms/Icon.tsx";
import { ActionTooltip } from "../molecules/ActionTooltip.tsx";

/**
 * Props for the StatusBar root component.
 */
interface StatusBarProps
  extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  class?: string;
}

/**
 * Props for the StatusBarItem component.
 */
interface StatusBarItemProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  class?: string;
}

/**
 * Structural wrapper for static items inside the StatusBar.
 * Enforces standardized padding and vertical alignment.
 */
function StatusBarItem(props: FlowProps<StatusBarItemProps>) {
  const rest = omit(props, "class", "children");
  return (
    <div
      class={cn("flex h-full items-center gap-1 px-1.5", props.class)}
      {...rest}
    >
      {props.children}
    </div>
  );
}

interface StatusBarButtonBaseProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  class?: string;
  commandId?: CommandId;
  tooltip?: string;
  tooltipDescription?: string;
  tooltipShortcut?: string;
}

/**
 * Props for the StatusBarButton component.
 */
type StatusBarButtonProps = FlowProps<StatusBarButtonBaseProps>;

/**
 * Interactive button for the StatusBar.
 * Enforces standard padding, hover effects, and automatic Tooltip integration.
 */
function StatusBarButton(rawProps: StatusBarButtonProps) {
  const props = merge({ tooltip: "" }, rawProps);
  const rest = omit(
    props,
    "class",
    "commandId",
    "tooltip",
    "tooltipShortcut",
    "tooltipDescription",
    "children"
  );

  const buttonClass = () =>
    cn(
      "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex h-full items-center gap-1 rounded-md px-1 outline-none focus-visible:ring-3 aria-invalid:ring-3",
      "hover:bg-surface-variant hover:text-on-surface cursor-pointer transition-colors",
      props.class
    );

  return (
    <Show
      fallback={
        <button class={buttonClass()} {...rest}>
          {props.children}
        </button>
      }
      when={props.tooltip}
    >
      <ActionTooltip
        as="button"
        class={buttonClass()}
        commandId={props.commandId}
        meta={props.tooltipDescription}
        position="top"
        shortcut={props.tooltipShortcut}
        text={props.tooltip}
        {...rest}
      >
        {props.children}
      </ActionTooltip>
    </Show>
  );
}

function TerminalStatusIndicator(
  rawProps: VoidProps<{
    status: string;
    isDirty?: boolean;
    isSpinning?: boolean;
  }>
) {
  const props = merge({ isDirty: false, isSpinning: false }, rawProps);
  const [frame, setFrame] = createSignal(0);
  const brailleFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  createEffect(
    () => props.isSpinning,
    (isActive) => {
      if (isActive) {
        const timer = setInterval(
          () => setFrame((f) => (f + 1) % brailleFrames.length),
          80
        );
        return () => clearInterval(timer);
      }
    }
  );

  return (
    <div class="flex items-center gap-1.5">
      <span>{props.status}</span>
      <Show when={props.isSpinning}>
        <span aria-hidden="true" class="w-3 text-center">
          {brailleFrames[frame()]}
        </span>
      </Show>
      <Show when={props.isDirty}>
        <span class="rounded bg-amber-500/20 px-1 text-[10px] font-bold tracking-wider text-amber-500 uppercase">
          Execution Stale
        </span>
      </Show>
    </div>
  );
}

function StatusBarEngineLanguage(_props: VoidProps) {
  const core = useEditor();
  return (
    <Errored
      fallback={<span class="capitalize">{core.engine.activeLanguage()}</span>}
    >
      <Loading
        fallback={
          <span class="capitalize">
            {latest(() => core.engine.activeLanguage())}
          </span>
        }
      >
        <span class="capitalize">
          {core.engine.engine()?.language ?? core.engine.activeLanguage()}
        </span>
      </Loading>
    </Errored>
  );
}

function StatusBarEngineStatusContent(_props: VoidProps) {
  const core = useEditor();
  const isEnginePending = () => isPending(() => core.engine.engine());
  const isRunPending = () =>
    isPending(() => core.commands.runState()) ||
    isPending(() => core.engine.executionState()) ||
    core.engine.isRunning();

  const status = (): string => {
    if (isRunPending()) {
      return "running";
    }
    if (isEnginePending()) {
      return "initializing";
    }
    return core.engine.engine() === null ? "blocked" : "ready";
  };

  return (
    <TerminalStatusIndicator
      isDirty={core.engine.isDirty()}
      isSpinning={isRunPending() || isEnginePending()}
      status={status()}
    />
  );
}

function StatusBarEngineStatus(_props: VoidProps) {
  const core = useEditor();
  return (
    <Errored
      fallback={
        <TerminalStatusIndicator
          isDirty={core.engine.isDirty()}
          isSpinning={false}
          status="error"
        />
      }
    >
      <Loading
        fallback={
          <TerminalStatusIndicator
            isDirty={core.engine.isDirty()}
            isSpinning={true}
            status="initializing"
          />
        }
      >
        <StatusBarEngineStatusContent />
      </Loading>
    </Errored>
  );
}

function StatusBarEngineSelector(_props: VoidProps) {
  const core = useEditor();

  function openEngineSelector() {
    core.overlays.open("engine-selector");
  }

  return (
    <StatusBarItem class="hidden md:block">
      <StatusBarButton
        onClick={openEngineSelector}
        tooltip="Select Engine"
        tooltipDescription="Switch the active execution engine."
      >
        <Errored fallback={<span>{core.engine.activeEngineId()}</span>}>
          <Loading
            fallback={<span>{latest(() => core.engine.activeEngineId())}</span>}
          >
            <span>
              {core.engine.engine()?.engineId ?? core.engine.activeEngineId()}
            </span>
          </Loading>
        </Errored>
      </StatusBarButton>
    </StatusBarItem>
  );
}

function StatusBarEngineAction(_props: VoidProps) {
  const core = useEditor();

  const renderSettingsButton = () => (
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
  );

  return (
    <Errored
      fallback={
        <StatusBarButton
          aria-label="Retry engine initialization"
          onClick={() => core.commands.retryEngineInit()}
          tooltip="Retry Initialization"
        >
          <Icon class="text-red-500" icon={RefreshCcw} size={12} />
        </StatusBarButton>
      }
    >
      <Loading fallback={renderSettingsButton()}>
        <Show when={core.engine.engine() !== undefined}>
          {renderSettingsButton()}
        </Show>
      </Loading>
    </Errored>
  );
}

/**
 * Bottom status bar compound organism.
 * Shows system state on the left and layout controls on the right.
 *
 * Compound parts: `StatusBar.Item`, `StatusBar.Button`.
 */
function StatusBar(props: VoidProps<StatusBarProps>) {
  const rest = omit(props, "class");
  const core = useEditor();

  return (
    <footer
      class={cn(
        "h-status-bar-height flex items-center justify-between",
        "border-outline-variant bg-background px-padding-x border-t",
        "text-on-surface-variant text-status-bar font-sans uppercase opacity-80 select-none",
        props.class
      )}
      {...rest}
    >
      <div class="flex h-full items-center gap-1">
        <StatusBarItem>
          <StatusBarEngineLanguage />
        </StatusBarItem>

        <StatusBarItem class="lowercase">
          <StatusBarEngineStatus />
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

        <StatusBarEngineSelector />

        <StatusBarEngineAction />
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

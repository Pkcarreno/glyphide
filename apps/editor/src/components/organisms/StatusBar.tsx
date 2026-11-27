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
  Reveal,
  Show,
} from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { cn } from "../../helpers/cn.ts";
import { Icon } from "../atoms/Icon.tsx";
import type { TooltipPosition } from "../atoms/Tooltip.tsx";
import type { ActionTooltipProps } from "../molecules/ActionTooltip.tsx";
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

/**
 * Props for the StatusBarButton component.
 */
interface StatusBarButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  class?: string;
}

/**
 * Interactive button for the StatusBar.
 * Enforces standard padding and hover effects.
 */
function StatusBarButton(props: FlowProps<StatusBarButtonProps>) {
  const rest = omit(props, "class", "children");

  return (
    <button
      class={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex h-full items-center gap-1 rounded-md px-1 outline-none focus-visible:ring-3 aria-invalid:ring-3",
        "hover:bg-surface-variant hover:text-on-surface cursor-pointer transition-colors",
        props.class
      )}
      type="button"
      {...rest}
    >
      {props.children}
    </button>
  );
}

/**
 * Props for the StatusBarActionButton component.
 */
type StatusBarActionButtonProps = FlowProps<
  Omit<ActionTooltipProps<typeof StatusBarButton>, "as" | "position"> & {
    /** Placement of the tooltip relative to the button. Default is "top". */
    position?: TooltipPosition;
  }
>;

/**
 * StatusBar button composed with ActionTooltip above the bar by default.
 */
function StatusBarActionButton(rawProps: StatusBarActionButtonProps) {
  const props = merge({ position: "top" as TooltipPosition }, rawProps);
  const rest = omit(props, "children", "position");

  return (
    <ActionTooltip as={StatusBarButton} position={props.position} {...rest}>
      {props.children}
    </ActionTooltip>
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

function StatusBarEngineInitializing(_props: VoidProps) {
  const core = useEditor();
  return (
    <TerminalStatusIndicator
      isDirty={core.engine.isDirty()}
      isSpinning={true}
      status="initializing"
    />
  );
}

function StatusBarEngineLanguage(_props: VoidProps) {
  const core = useEditor();
  return (
    <Loading
      fallback={
        <span class="capitalize">
          {latest(() => core.engine.activeLanguage())}
        </span>
      }
    >
      <Errored
        fallback={
          <span class="capitalize">{core.engine.activeLanguage()}</span>
        }
      >
        <span class="capitalize">
          {core.engine.engine()?.language ?? core.engine.activeLanguage()}
        </span>
      </Errored>
    </Loading>
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
    return core.engine.engine() === null ? "blocked" : "ready";
  };

  return (
    <Show
      fallback={<StatusBarEngineInitializing />}
      when={isRunPending() || !isEnginePending()}
    >
      <TerminalStatusIndicator
        isDirty={core.engine.isDirty()}
        isSpinning={isRunPending()}
        status={status()}
      />
    </Show>
  );
}

function StatusBarEngineStatus(_props: VoidProps) {
  const core = useEditor();
  return (
    <Loading fallback={<StatusBarEngineInitializing />}>
      <Errored
        fallback={
          <TerminalStatusIndicator
            isDirty={core.engine.isDirty()}
            isSpinning={false}
            status="error"
          />
        }
      >
        <StatusBarEngineStatusContent />
      </Errored>
    </Loading>
  );
}

function StatusBarEngineSelectorButton(props: VoidProps<{ label: string }>) {
  const core = useEditor();

  return (
    <StatusBarItem class="hidden md:block">
      <StatusBarActionButton
        meta="Switch the active execution engine."
        onClick={() => core.overlays.open("engine-selector")}
        text="Select Engine"
      >
        <span>{props.label}</span>
      </StatusBarActionButton>
    </StatusBarItem>
  );
}

function StatusBarEngineSelector(_props: VoidProps) {
  const core = useEditor();

  return (
    <Errored
      fallback={
        <StatusBarEngineSelectorButton label={core.engine.activeEngineId()} />
      }
    >
      <StatusBarEngineSelectorButton
        label={core.engine.engine()?.engineId ?? core.engine.activeEngineId()}
      />
    </Errored>
  );
}

function StatusBarEngineSettingsButton(_props: VoidProps) {
  const core = useEditor();

  return (
    /* Hidden on mobile, visible md+ */
    <span class="hidden md:block">
      <StatusBarActionButton
        id="engine-settings-trigger"
        onClick={() => core.overlays.open("engine-settings")}
        text="Engine Settings"
      >
        <Icon icon={Settings2} size={14} />
      </StatusBarActionButton>
    </span>
  );
}

function StatusBarEngineAction(_props: VoidProps) {
  const core = useEditor();

  return (
    <Errored
      fallback={
        <StatusBarActionButton
          aria-label="Retry engine initialization"
          onClick={() => core.commands.retryEngineInit()}
          text="Retry Initialization"
        >
          <Icon class="text-red-500" icon={RefreshCcw} size={12} />
        </StatusBarActionButton>
      }
    >
      {(() => {
        core.engine.engine();
        return <StatusBarEngineSettingsButton />;
      })()}
    </Errored>
  );
}

function StatusBarEngineControls(_props: VoidProps) {
  const core = useEditor();

  return (
    <Loading
      fallback={
        <>
          <StatusBarEngineSelectorButton
            label={latest(() => core.engine.activeEngineId())}
          />
          <StatusBarEngineSettingsButton />
        </>
      }
    >
      <StatusBarEngineSelector />
      <StatusBarEngineAction />
    </Loading>
  );
}

/**
 * Bottom status bar compound organism.
 * Shows system state on the left and layout controls on the right.
 *
 * Compound parts: `StatusBar.Item`, `StatusBar.Button`, `StatusBar.ActionButton`.
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
      <Reveal order="together">
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

          <StatusBarEngineControls />
        </div>
      </Reveal>
    </footer>
  );
}

StatusBar.Item = StatusBarItem;
StatusBar.Button = StatusBarButton;
StatusBar.ActionButton = StatusBarActionButton;

/** @public */
export {
  StatusBar,
  type StatusBarActionButtonProps,
  type StatusBarButtonProps,
  type StatusBarItemProps,
  type StatusBarProps,
};

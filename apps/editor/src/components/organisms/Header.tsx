import type { JSX } from "@solidjs/web";
import ChevronDown from "lucide-solid/icons/chevron-down";
import ExternalLink from "lucide-solid/icons/external-link";
import LoaderCircle from "lucide-solid/icons/loader-circle";
import Play from "lucide-solid/icons/play";
import RefreshCw from "lucide-solid/icons/refresh-cw";
import Settings from "lucide-solid/icons/settings";
import Share2 from "lucide-solid/icons/share-2";
import ShieldAlert from "lucide-solid/icons/shield-exclamation-point";
import Square from "lucide-solid/icons/square";
import type { VoidProps } from "solid-js";
import { createSignal, isPending, omit, Show } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { usePwaUpdate } from "../../core/pwa-registration.tsx";
import { cn } from "../../helpers/cn.ts";
import { Button } from "../atoms/Button.tsx";
import { Dropdown } from "../atoms/Dropdown.tsx";
import { Icon } from "../atoms/Icon.tsx";
import { LogoSquare } from "../atoms/LogoSquare.tsx";
import { ActionTooltip } from "../molecules/ActionTooltip.tsx";

interface HeaderProps
  extends Omit<
    JSX.HTMLAttributes<HTMLElement>,
    "children" | "onSettingsClick" | "onShareClick" | "onRunOptionsClick"
  > {
  class?: string;
}

/**
 * Top header organism containing the app logo/title
 * and primary actions (Settings, Share, Run).
 */
function Header(props: VoidProps<HeaderProps>) {
  const rest = omit(props, "class");

  const core = useEditor();
  const pwa = usePwaUpdate();

  const isRunPending = () =>
    isPending(() => core.commands.runState()) ||
    isPending(() => core.engine.executionState()) ||
    core.engine.isRunning();

  function handleSettingsClick() {
    core.overlays.toggle("settings");
  }

  function handleShareClick() {
    core.overlays.open("share");
  }

  const [isUpdating, setIsUpdating] = createSignal(false);

  function handleUpdateClick() {
    setIsUpdating(true);
    pwa.applyUpdate();
  }

  return (
    <header
      class={cn(
        "min-h-header-height flex items-center justify-between",
        "border-outline-variant bg-background px-padding-x border-b py-1",
        props.class
      )}
      {...rest}
    >
      <div class="flex items-center gap-3">
        <Dropdown.Root>
          <ActionTooltip
            aria-label="Menu"
            as="div"
            position="bottom"
            text="Menu"
          >
            <Dropdown.Trigger
              aria-label="Menu"
              as={Button}
              class="pointer-coarse:min-h-11 pointer-coarse:min-w-11"
              variant="ghost"
            >
              <LogoSquare alt="Glyphide Logo" class="size-6!" />
              <ChevronDown class="size-3!" />
            </Dropdown.Trigger>
          </ActionTooltip>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Group>
                <Dropdown.Link href="/" target="_blank">
                  New Project
                </Dropdown.Link>
                <Dropdown.Item onSelect={() => core.overlays.open("load-file")}>
                  Open File
                </Dropdown.Item>
              </Dropdown.Group>
              <Dropdown.Separator class="block md:hidden" />
              <Dropdown.Group class="block md:hidden">
                <Dropdown.Item onSelect={handleSettingsClick}>
                  Settings
                </Dropdown.Item>
                <Dropdown.Item onSelect={handleShareClick}>Share</Dropdown.Item>
              </Dropdown.Group>
              <Dropdown.Separator class="block md:hidden" />
              <Dropdown.Group class="block md:hidden">
                <Dropdown.Item
                  onSelect={() => core.overlays.open("engine-selector")}
                >
                  Select Engine
                </Dropdown.Item>
                <Dropdown.Item
                  onSelect={() => core.overlays.open("engine-settings")}
                >
                  Engine Settings
                </Dropdown.Item>
              </Dropdown.Group>
              <Dropdown.Separator />
              <Dropdown.Group>
                <Dropdown.Link
                  href="https://github.com/pkcarreno/glyphide"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  GitHub
                  <ExternalLink class="ml-auto size-3 opacity-60" />
                </Dropdown.Link>
                <Dropdown.Caption>
                  Glyphide v{import.meta.env.VITE_APP_VERSION}
                </Dropdown.Caption>
              </Dropdown.Group>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>

        <Show when={pwa.updateAvailable()}>
          <ActionTooltip
            aria-label="Reload application for new version"
            as={Button}
            class="border-outline bg-primary text-on-primary hover:bg-primary/90 relative pointer-coarse:min-h-11 pointer-coarse:min-w-11"
            disabled={isUpdating()}
            onClick={handleUpdateClick}
            position="bottom"
            text="New version ready. Reload to apply."
            variant="primary"
          >
            <Icon
              class={cn(isUpdating() && "animate-spin", "md:mr-1")}
              icon={RefreshCw}
            />
            <span class="hidden md:inline">Reload</span>
            <span
              aria-hidden="true"
              class="pointer-events-none absolute -top-1 -right-1 flex size-2.5"
            >
              <span class="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
              <span class="border-outline bg-primary relative inline-flex size-2.5 rounded-full border" />
            </span>
          </ActionTooltip>
        </Show>

        <ActionTooltip
          aria-label="Rename Project"
          as={Button}
          class="text-on-surface font-sans font-semibold tracking-wide"
          onClick={() => core.overlays.open("project-rename")}
          position="bottom"
          text="Rename Project"
          variant="ghost"
        >
          {core.session.displayName()}
        </ActionTooltip>

        <Show when={core.session.isTrustRequired()}>
          <ActionTooltip
            aria-label="Trust Required"
            as={Button}
            class="border-log-warn bg-log-warn/10 text-log-warn hover:bg-log-warn/20"
            meta="Review before running"
            onClick={() => core.overlays.open("trust-required")}
            position="bottom"
            text="Shared Code Detected"
            variant="outline"
          >
            <Icon class="mr-1" icon={ShieldAlert} />
            Trust Required
          </ActionTooltip>
        </Show>
      </div>

      <div class="gap-gap-compact flex items-center">
        {/* Hidden on mobile, visible md+ */}
        <span class="hidden md:block">
          <ActionTooltip
            aria-label="Settings"
            as={Button}
            commandId="toggle-settings"
            onClick={handleSettingsClick}
            position="bottom"
            size="icon"
            text="Settings"
            variant="ghost"
          >
            <Icon icon={Settings} />
          </ActionTooltip>
        </span>
        <span class="hidden md:block">
          <ActionTooltip
            aria-label="Share workspace"
            as={Button}
            onClick={handleShareClick}
            position="bottom"
            text="Share"
            variant="outline"
          >
            <Icon class="mr-1" icon={Share2} />
            Share
          </ActionTooltip>
        </span>
        <div class="flex items-center gap-1">
          <ActionTooltip
            as={Button}
            commandId="run-code"
            disabled={isRunPending()}
            onClick={() => core.commands.runCode()}
            position="bottom"
            text="Run Code"
            variant="primary"
          >
            <Show
              fallback={<Icon class="mr-1" icon={Play} />}
              when={isRunPending()}
            >
              <Icon class="mr-1 animate-spin" icon={LoaderCircle} />
            </Show>{" "}
            Run
          </ActionTooltip>
          <Show when={isRunPending()}>
            <ActionTooltip
              as={Button}
              commandId="interrupt-execution"
              onClick={() => core.commands.interruptExecution()}
              position="bottom"
              text="Stop Execution"
              variant="outline"
            >
              <Icon class="mr-1" icon={Square} /> Stop
            </ActionTooltip>
          </Show>
        </div>
      </div>
    </header>
  );
}

/** @public */
export { Header, type HeaderProps };

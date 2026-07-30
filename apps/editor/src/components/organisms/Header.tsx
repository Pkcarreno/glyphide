import ChevronDown from "lucide-solid/icons/chevron-down";
import ExternalLink from "lucide-solid/icons/external-link";
import Play from "lucide-solid/icons/play";
import RefreshCw from "lucide-solid/icons/refresh-cw";
import Settings from "lucide-solid/icons/settings";
import Share2 from "lucide-solid/icons/share-2";
import ShieldAlert from "lucide-solid/icons/shield-alert";
import Square from "lucide-solid/icons/square";
import type { JSX } from "solid-js";
import { Show, splitProps } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { cn } from "../../helpers/cn.ts";
import { Button } from "../atoms/Button.tsx";
import { Dropdown } from "../atoms/Dropdown.tsx";
import { Icon } from "../atoms/Icon.tsx";
import { LogoSquare } from "../atoms/LogoSquare.tsx";
import { ActionTooltip } from "../molecules/ActionTooltip.tsx";

interface HeaderProps
  extends Omit<
    JSX.HTMLAttributes<HTMLElement>,
    "onSettingsClick" | "onShareClick" | "onRunOptionsClick"
  > {
  class?: string;
}

/**
 * Top header organism containing the app logo/title
 * and primary actions (Settings, Share, Run).
 */
function Header(props: HeaderProps) {
  const [local, rest] = splitProps(props, ["class"]);

  const core = useEditor();

  function handleRunClick() {
    if (core.engine.engineStatus() === "running") {
      core.dispatcher.dispatch({ type: "INTERRUPT_EXECUTION" });
    } else {
      core.dispatcher.dispatch({ type: "RUN_CODE" });
    }
  }

  function handleSettingsClick() {
    core.dispatcher.dispatch({ overlayId: "settings", type: "TOGGLE_OVERLAY" });
  }

  function handleShareClick() {
    core.dispatcher.dispatch({ overlayId: "share", type: "OPEN_OVERLAY" });
  }

  return (
    <header
      class={cn(
        "flex min-h-header-height items-center justify-between",
        "border-outline-variant border-b bg-background px-padding-x py-1",
        local.class
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
                <Dropdown.Item
                  onSelect={() =>
                    core.dispatcher.dispatch({
                      overlayId: "load-file",
                      type: "OPEN_OVERLAY",
                    })
                  }
                >
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
                  onSelect={() =>
                    core.dispatcher.dispatch({
                      overlayId: "engine-selector",
                      type: "OPEN_OVERLAY",
                    })
                  }
                >
                  Select Engine
                </Dropdown.Item>
                <Dropdown.Item
                  onSelect={() =>
                    core.dispatcher.dispatch({
                      overlayId: "engine-settings",
                      type: "OPEN_OVERLAY",
                    })
                  }
                >
                  Engine Settings
                </Dropdown.Item>
              </Dropdown.Group>
              <Show when={core.pwa.updateAvailable()}>
                <Dropdown.Separator class="block md:hidden" />
                <Dropdown.Group class="block md:hidden">
                  <Dropdown.Item onSelect={() => core.pwa.applyUpdate()}>
                    Update App
                  </Dropdown.Item>
                </Dropdown.Group>
              </Show>
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
        <ActionTooltip
          action={{ overlayId: "project-rename", type: "OPEN_OVERLAY" }}
          aria-label="Rename Project"
          as={Button}
          class="font-sans font-semibold text-on-surface tracking-wide"
          onClick={() =>
            core.dispatcher.dispatch({
              overlayId: "project-rename",
              type: "OPEN_OVERLAY",
            })
          }
          position="bottom"
          text="Rename Project"
          variant="ghost"
        >
          {core.project.displayName()}
        </ActionTooltip>

        <Show when={core.trust.isTrustRequired()}>
          <ActionTooltip
            action={{ overlayId: "trust-required", type: "OPEN_OVERLAY" }}
            aria-label="Trust Required"
            as={Button}
            class="border-log-warn bg-log-warn/10 text-log-warn hover:bg-log-warn/20"
            meta="Review before running"
            onClick={() =>
              core.dispatcher.dispatch({
                overlayId: "trust-required",
                type: "OPEN_OVERLAY",
              })
            }
            position="bottom"
            text="Shared Code Detected"
            variant="outline"
          >
            <Icon class="mr-1" icon={ShieldAlert} />
            Trust Required
          </ActionTooltip>
        </Show>

        <Show when={core.pwa.updateAvailable()}>
          <span class="hidden md:flex">
            <ActionTooltip
              aria-label="Update Available"
              as={Button}
              class="border-outline bg-primary text-on-primary hover:bg-primary/90"
              onClick={() => core.pwa.applyUpdate()}
              position="bottom"
              text="New version available"
              variant="primary"
            >
              <Icon class="mr-1" icon={RefreshCw} />
              Update App
            </ActionTooltip>
          </span>
        </Show>
      </div>

      <div class="flex items-center gap-gap-compact">
        {/* Hidden on mobile, visible md+ */}
        <span class="hidden md:block">
          <ActionTooltip
            action={{ overlayId: "settings", type: "TOGGLE_OVERLAY" }}
            aria-label="Settings"
            as={Button}
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
            action={{ overlayId: "share", type: "OPEN_OVERLAY" }}
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
        <ActionTooltip
          action={
            core.engine.engineStatus() === "running"
              ? { type: "INTERRUPT_EXECUTION" }
              : { type: "RUN_CODE" }
          }
          as={Button}
          onClick={handleRunClick}
          position="bottom"
          text={
            core.engine.engineStatus() === "running"
              ? "Stop Execution"
              : "Run Code"
          }
          variant={
            core.engine.engineStatus() === "running" ? "outline" : "primary"
          }
        >
          <Show
            fallback={
              <>
                <Icon class="mr-1" icon={Play} /> Run
              </>
            }
            when={core.engine.engineStatus() === "running"}
          >
            <Icon class="mr-1" icon={Square} /> Stop
          </Show>
        </ActionTooltip>
      </div>
    </header>
  );
}

/** @public */
export { Header, type HeaderProps };

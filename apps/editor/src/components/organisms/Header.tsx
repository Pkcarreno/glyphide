import Play from "lucide-solid/icons/play";
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
    core.dispatcher.dispatch({ type: "TOGGLE_OVERLAY", overlayId: "settings" });
  }

  function handleShareClick() {
    core.dispatcher.dispatch({ type: "OPEN_OVERLAY", overlayId: "share" });
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
            aria-label="Project Menu"
            as={Dropdown.Trigger}
            class="pointer-coarse:min-h-11 pointer-coarse:min-w-11"
            position="bottom"
            text="File / Project Menu"
            variant="ghost"
          >
            <LogoSquare alt="Glyphide Logo" />
          </ActionTooltip>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Group>
                <Dropdown.Item as="a" href="/" target="_blank">
                  New Project
                </Dropdown.Item>
                <Dropdown.Item
                  onSelect={() =>
                    core.dispatcher.dispatch({
                      type: "OPEN_OVERLAY",
                      overlayId: "load-file",
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
                      type: "OPEN_OVERLAY",
                      overlayId: "engine-selector",
                    })
                  }
                >
                  Select Engine
                </Dropdown.Item>
                <Dropdown.Item
                  onSelect={() =>
                    core.dispatcher.dispatch({
                      type: "OPEN_OVERLAY",
                      overlayId: "engine-settings",
                    })
                  }
                >
                  Engine Settings
                </Dropdown.Item>
              </Dropdown.Group>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
        <ActionTooltip
          action={{ type: "OPEN_OVERLAY", overlayId: "project-rename" }}
          aria-label="Rename Project"
          as={Button}
          class="font-sans font-semibold text-on-surface tracking-wide"
          onClick={() =>
            core.dispatcher.dispatch({
              type: "OPEN_OVERLAY",
              overlayId: "project-rename",
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
            action={{ type: "OPEN_OVERLAY", overlayId: "trust-required" }}
            aria-label="Trust Required"
            as={Button}
            class="border-log-warn bg-log-warn/10 text-log-warn hover:bg-log-warn/20"
            meta="Review before running"
            onClick={() =>
              core.dispatcher.dispatch({
                type: "OPEN_OVERLAY",
                overlayId: "trust-required",
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
      </div>

      <div class="flex items-center gap-gap-compact">
        {/* Hidden on mobile, visible md+ */}
        <span class="hidden md:block">
          <ActionTooltip
            action={{ type: "TOGGLE_OVERLAY", overlayId: "settings" }}
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
            action={{ type: "OPEN_OVERLAY", overlayId: "share" }}
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

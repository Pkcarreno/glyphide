import Play from "lucide-solid/icons/play";
import Settings from "lucide-solid/icons/settings";
import Share2 from "lucide-solid/icons/share-2";
import Square from "lucide-solid/icons/square";
import type { JSX } from "solid-js";
import { Show, splitProps } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { cn } from "../../helpers/cn.ts";
import { Button } from "../atoms/Button.tsx";
import { Dropdown } from "../atoms/DropdownPrimitive.tsx";
import { Icon } from "../atoms/Icon.tsx";
import { LogoSquare } from "../atoms/LogoSquare.tsx";
import { Tooltip } from "../molecules/Tooltip.tsx";

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
          <Tooltip
            aria-label="Project Menu"
            as={Dropdown.Trigger}
            position="bottom"
            text="File / Project Menu"
            variant="ghost"
          >
            <LogoSquare alt="Glyphide Logo" />
          </Tooltip>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item as="a" href="/" target="_blank">
                New Project
              </Dropdown.Item>
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
        <Tooltip
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
        </Tooltip>
      </div>

      <div class="flex items-center gap-gap-compact">
        {/* Hidden on mobile, visible md+ */}
        <span class="hidden md:block">
          <Tooltip
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
          </Tooltip>
        </span>
        <span class="hidden md:block">
          <Tooltip
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
          </Tooltip>
        </span>
        <Tooltip
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
        </Tooltip>
      </div>
    </header>
  );
}

export { Header, type HeaderProps };

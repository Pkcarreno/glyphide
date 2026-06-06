import Play from "lucide-solid/icons/play";
import Settings from "lucide-solid/icons/settings";
import Share2 from "lucide-solid/icons/share-2";
import Square from "lucide-solid/icons/square";
import type { JSX } from "solid-js";
import { Show, splitProps } from "solid-js";
import logo from "../../assets/logo-square.svg";
import { useEditor } from "../../core/context.tsx";
import { cn } from "../../helpers/cn.ts";
import { Button } from "../atoms/Button.tsx";
import { Icon } from "../atoms/Icon.tsx";
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
        <img
          alt="Glyphide Logo"
          class="h-6 w-6"
          height="24"
          src={logo}
          width="24"
        />
        <Tooltip
          action={{ type: "OPEN_OVERLAY", overlayId: "project-rename" }}
          aria-label="Rename Project"
          as={Button}
          class="font-sans font-semibold text-on-surface uppercase tracking-widest"
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
          {core.project.name() || "UNTITLED_PROJECT"}
        </Tooltip>
      </div>

      <div class="flex items-center gap-gap-compact">
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

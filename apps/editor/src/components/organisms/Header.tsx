import { splitProps, Show } from "solid-js";
import type { JSX } from "solid-js";
import { Button } from "../atoms/Button";
import { SplitButton } from "../molecules/SplitButton";
import { Icon } from "../atoms/Icon";
import Settings from "lucide-solid/icons/settings";
import Share2 from "lucide-solid/icons/share-2";
import Play from "lucide-solid/icons/play";
import Square from "lucide-solid/icons/square";
import { cn } from "../../helpers/cn";
import logo from "../../assets/logo-square.svg";
import { useEditor } from "../../core/context";

interface HeaderProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "onSettingsClick" | "onShareClick" | "onRunOptionsClick"> {
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
    if (core.engine.status() === "running") {
      core.dispatcher.dispatch({ type: "INTERRUPT_EXECUTION" });
    } else {
      core.dispatcher.dispatch({ type: "RUN_CODE" });
    }
  }

  function handleSettingsClick() {
    core.dispatcher.dispatch({ type: "TOGGLE_OVERLAY", overlayId: "settings" });
  }

  function handleShareClick() {
    alert("Share functionality coming soon!");
  }

  return (
    <header
      class={cn(
        "flex min-h-header-height items-center justify-between",
        "border-b border-outline-variant bg-background px-padding-x py-1",
        local.class,
      )}
      {...rest}
    >
      <div class="flex items-center gap-3">
        <img src={logo} alt="Glyphide Logo" class="h-6 w-6" />
        <Button
          variant="ghost"
          class="font-mono tracking-widest text-on-surface uppercase"
          aria-label="Rename Project"
          onClick={() => core.dispatcher.dispatch({ type: "OPEN_OVERLAY", overlayId: "project-rename" })}
        >
          {core.project.name() || "UNTITLED_PROJECT"}
        </Button>
      </div>

      <div class="flex items-center gap-gap-compact">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          onClick={handleSettingsClick}
        >
          <Icon icon={Settings} />
        </Button>
        <Button
          variant="outline"
          aria-label="Share workspace"
          onClick={handleShareClick}
        >
          <Icon icon={Share2} class="mr-1" />
          Share
        </Button>
        <SplitButton
          variant={core.engine.status() === "running" ? "outline" : "primary"}
          onMainClick={handleRunClick}
          dropdownLabel="Run options"
        >
          <Show
            when={core.engine.status() === "running"}
            fallback={<><Icon icon={Play} class="mr-1" /> Run</>}
          >
            <Icon icon={Square} class="mr-1" /> Stop
          </Show>
        </SplitButton>
      </div>
    </header>
  );
}

export { Header, type HeaderProps };

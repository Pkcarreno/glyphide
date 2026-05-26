import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { Button } from "../atoms/Button";
import { SplitButton } from "../molecules/SplitButton";
import { Icon } from "../atoms/Icon";
import Settings from "lucide-solid/icons/settings";
import Share2 from "lucide-solid/icons/share-2";
import Play from "lucide-solid/icons/play";
import { cn } from "../../helpers/cn";
import logo from "../../assets/logo-square.svg";

interface HeaderProps extends JSX.HTMLAttributes<HTMLElement> {
  onSettingsClick?: () => void;
  onShareClick?: () => void;
  onRunClick?: () => void;
  onRunOptionsClick?: () => void;
  class?: string;
}

/**
 * Top header organism containing the app logo/title
 * and primary actions (Settings, Share, Run).
 */
function Header(props: HeaderProps) {
  const [local, rest] = splitProps(props, [
    "onSettingsClick",
    "onShareClick",
    "onRunClick",
    "onRunOptionsClick",
    "class",
  ]);

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
        <h1 class="font-mono text-ui-label tracking-widest text-on-surface">
          [ UNTITLED_PROJECT ]
        </h1>
      </div>

      <div class="flex items-center gap-gap-compact">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          onClick={local.onSettingsClick}
        >
          <Icon icon={Settings} />
        </Button>
        <Button
          variant="outline"
          aria-label="Share workspace"
          onClick={local.onShareClick}
        >
          <Icon icon={Share2} class="mr-1" />
          Share
        </Button>
        <SplitButton
          variant="primary"
          onMainClick={local.onRunClick}
          onDropdownClick={local.onRunOptionsClick}
          dropdownLabel="Run options"
        >
          <Icon icon={Play} class="mr-1" />
          Run
        </SplitButton>
      </div>
    </header>
  );
}

export { Header, type HeaderProps };

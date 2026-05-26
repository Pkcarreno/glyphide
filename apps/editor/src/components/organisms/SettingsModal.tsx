import { splitProps } from "solid-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogClose,
  DialogOverlay,
} from "../atoms/Dialog";
import { SettingSwitch } from "../molecules/SettingSwitch";
import { Icon } from "../atoms/Icon";
import { X, Monitor, Moon, Sun } from "lucide-solid";
import { cn } from "../../helpers/cn";
import { useTheme, ThemeType } from "../../stores/theme";

/**
 * Props for the SettingsModal component.
 */
interface SettingsModalProps {
  /** Controlled open state. */
  isOpen: boolean;
  /** Fires when open state changes. */
  onOpenChange: (isOpen: boolean) => void;
  class?: string;
}

/**
 * Settings modal organism.
 * Displays application settings using high density components.
 */
function SettingsModal(props: SettingsModalProps) {
  const [local, rest] = splitProps(props, [
    "isOpen",
    "onOpenChange",
    "class",
  ]);

  const { theme, setTheme } = useTheme();

  return (
    <Dialog isOpen={local.isOpen} onOpenChange={local.onOpenChange}>
      <DialogContent class={cn("relative max-w-2xl w-full h-5/6 flex flex-col md:flex-row overflow-hidden p-0", local.class)} {...rest}>
        

        <DialogClose
          aria-label="Close settings"
          class="absolute top-2 right-2 md:hidden p-1.5 z-10 rounded-sm bg-background border border-outline-variant hover:bg-surface-variant transition-colors text-on-surface-variant hover:text-on-surface"
        >
          <Icon icon={X} size={16} />
        </DialogClose>


        <div class="w-full md:w-48 border-b md:border-b-0 md:border-r border-outline-variant bg-surface-variant/30 pt-3 pb-2 px-2 md:p-2 shrink-0 overflow-x-auto md:overflow-x-visible md:overflow-y-auto scrollbar-hide">
          <h2 class="text-section-header text-on-surface-variant uppercase px-3 mb-2">Settings</h2>
          <nav class="flex flex-row md:flex-col gap-1 w-max md:w-auto">
            <button class="text-left px-3 py-1.5 md:py-2 rounded-sm bg-surface-variant text-on-surface font-medium text-xs border border-outline-variant">
              Appearance
            </button>
            <button class="text-left px-3 py-1.5 md:py-2 rounded-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 font-medium text-xs transition-colors">
              Editor
            </button>
            <button class="text-left px-3 py-1.5 md:py-2 rounded-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 font-medium text-xs transition-colors">
              Execution
            </button>
            <button class="text-left px-3 py-1.5 md:py-2 rounded-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 font-medium text-xs transition-colors">
              About
            </button>
          </nav>
        </div>


        <div class="flex-1 flex flex-col min-w-0 bg-background">
          <DialogHeader class="hidden md:flex p-2 border-b border-outline-variant shrink-0 justify-end">
            <DialogClose
              aria-label="Close settings"
              class="p-1 rounded-sm hover:bg-surface-variant transition-colors text-on-surface-variant hover:text-on-surface"
            >
              <Icon icon={X} size={16} />
            </DialogClose>
          </DialogHeader>

          <div class="flex-1 p-5 md:p-6 overflow-y-auto flex flex-col gap-6">
            <div class="space-y-3">
              <h3 class="text-section-header uppercase text-outline mb-2">
                Appearance
              </h3>
              
              <div class="flex flex-col gap-2">
                <span class="text-xs text-on-surface font-medium">Theme Preference</span>
                <div class="flex bg-surface-variant p-0.5 rounded-sm border border-outline-variant max-w-sm">
                  <button 
                    onClick={() => setTheme("light")}
                    class={cn(
                      "flex-1 flex items-center justify-center gap-2 py-1.5 px-2 text-xs font-medium rounded-sm transition-colors",
                      theme() === "light" 
                        ? "bg-surface text-on-surface shadow-sm border border-outline-variant" 
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface/50 border border-transparent"
                    )}
                  >
                    <Icon icon={Sun} size={14} /> Light
                  </button>
                  <button 
                    onClick={() => setTheme("dark")}
                    class={cn(
                      "flex-1 flex items-center justify-center gap-2 py-1.5 px-2 text-xs font-medium rounded-sm transition-colors",
                      theme() === "dark" 
                        ? "bg-surface text-on-surface shadow-sm border border-outline-variant" 
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface/50 border border-transparent"
                    )}
                  >
                    <Icon icon={Moon} size={14} /> Dark
                  </button>
                  <button 
                    onClick={() => setTheme("system")}
                    class={cn(
                      "flex-1 flex items-center justify-center gap-2 py-1.5 px-2 text-xs font-medium rounded-sm transition-colors",
                      theme() === "system" 
                        ? "bg-surface text-on-surface shadow-sm border border-outline-variant" 
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface/50 border border-transparent"
                    )}
                  >
                    <Icon icon={Monitor} size={14} /> Auto
                  </button>
                </div>
              </div>
              
              <div class="flex flex-col divide-y divide-outline-variant pt-2 max-w-sm">
                <SettingSwitch
                  label="Word Wrap"
                  description="Wrap long lines to fit the editor width"
                  defaultChecked={false}
                />
                <SettingSwitch
                  label="Minimap"
                  description="Show a zoomed-out view of your code"
                  defaultChecked={true}
                />
              </div>
            </div>

            <div class="space-y-3">
              <h3 class="text-section-header uppercase text-outline mb-2">
                Execution
              </h3>
              <div class="flex flex-col divide-y divide-outline-variant max-w-sm">
                <SettingSwitch
                  label="Auto-run on type"
                  description="Execute code automatically after a short delay"
                  defaultChecked={false}
                />
                <SettingSwitch
                  label="Clear console on run"
                  description="Wipe previous output before executing"
                  defaultChecked={true}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { SettingsModal, type SettingsModalProps };

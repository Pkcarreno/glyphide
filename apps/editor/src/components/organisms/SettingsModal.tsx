import { splitProps, createSignal, createUniqueId, Show } from "solid-js";
import type { JSX } from "solid-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogClose,
} from "../atoms/Dialog";
import { Switch } from "../atoms/Switch";
import { Select } from "../atoms/Select";
import { Icon } from "../atoms/Icon";
import X from "lucide-solid/icons/x";
import { cn } from "../../helpers/cn";
import { useEditor } from "../../core/context";

/* ---------- Internal Composables ---------- */

interface SettingsItemProps {
  label: string;
  description?: string;
  children?: JSX.Element;
  forId?: string;
  class?: string;
}

function SettingsItem(props: SettingsItemProps) {
  return (
    <div class={cn("flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4", props.class)}>
      <div class="flex flex-col gap-1.5 pr-4">
        <label for={props.forId} class="text-sm font-medium text-on-surface cursor-pointer">
          {props.label}
        </label>
        <Show when={props.description}>
          <span class="text-sm text-on-surface-variant leading-relaxed">
            {props.description}
          </span>
        </Show>
      </div>
      <div class="shrink-0 flex items-center">
        {props.children}
      </div>
    </div>
  );
}

function SettingsSwitchItem(props: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (c: boolean) => void;
  class?: string;
}) {
  const id = createUniqueId();
  return (
    <SettingsItem label={props.label} description={props.description} forId={id} class={props.class}>
      <Switch id={id} checked={props.checked} onCheckedChange={props.onCheckedChange} aria-label={props.label} />
    </SettingsItem>
  );
}

/* ---------- Main Component ---------- */

interface SettingsModalProps {
  class?: string;
}

type TabType = "Appearance" | "Editor" | "Execution" | "About";

/**
 * Settings modal organism.
 * Displays application settings using high density components and internal tabs.
 */
function SettingsModal(props: SettingsModalProps) {
  const [local, rest] = splitProps(props, ["class"]);

  const core = useEditor();
  const [activeTab, setActiveTab] = createSignal<TabType>("Appearance");

  const handleOpenChange = (isOpen: boolean) => {
    core.dispatcher.dispatch({
      type: isOpen ? "OPEN_OVERLAY" : "CLOSE_OVERLAY",
      overlayId: "settings",
    });
  };

  const tabs: TabType[] = ["Appearance", "Editor", "Execution", "About"];

  return (
    <Dialog
      isOpen={core.overlays.isOpen("settings")}
      onOpenChange={handleOpenChange}
    >
      <DialogContent class={cn("relative max-w-3xl w-full h-[80vh] flex flex-col md:flex-row overflow-hidden p-0", local.class)} {...rest}>
        <DialogClose
          aria-label="Close settings"
          class="absolute top-2 right-2 md:hidden p-1.5 z-10 rounded-lg bg-background border border-outline-variant hover:bg-surface-variant transition-colors text-on-surface-variant hover:text-on-surface"
        >
          <Icon icon={X} size={16} />
        </DialogClose>

        <div class="w-full md:w-56 border-b md:border-b-0 md:border-r border-outline-variant bg-surface-variant/30 pt-4 pb-2 px-3 md:p-4 shrink-0 overflow-x-auto md:overflow-x-visible md:overflow-y-auto scrollbar-hide">
          <h2 class="text-xs font-semibold text-on-surface-variant uppercase px-3 mb-3 tracking-wider">Settings</h2>
          <nav class="flex flex-row md:flex-col gap-1 w-max md:w-auto">
            {tabs.map((tab) => (
              <button
                onClick={() => setActiveTab(tab)}
                class={cn(
                  "text-left px-3 py-2 rounded-lg font-medium text-sm transition-colors",
                  activeTab() === tab
                    ? "bg-surface-variant text-on-surface shadow-sm border border-outline-variant"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 border border-transparent"
                )}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div class="flex-1 flex flex-col min-w-0 bg-background">
          <DialogHeader class="hidden md:flex p-3 border-b border-outline-variant shrink-0 justify-end">
            <DialogClose
              aria-label="Close settings"
              class="p-1.5 rounded-lg hover:bg-surface-variant transition-colors text-on-surface-variant hover:text-on-surface"
            >
              <Icon icon={X} size={16} />
            </DialogClose>
          </DialogHeader>

          <div class="flex-1 p-6 md:p-8 overflow-y-auto">
            <Show when={activeTab() === "Appearance"}>
              <div class="max-w-xl flex flex-col gap-8 animate-in fade-in duration-300">
                <section>
                  <div class="flex flex-col divide-y divide-outline-variant/50 border-y border-outline-variant/50">
                    <SettingsItem 
                      label="Theme Preference" 
                      description="Select the color theme for the editor interface."
                      forId="theme-select"
                    >
                      <div class="w-40">
                        <Select
                          id="theme-select"
                          value={core.settings.settings.theme}
                          onChange={(e) => core.settings.updateSettings({ theme: e.currentTarget.value as "light" | "dark" | "system" })}
                        >
                          <option value="system">Auto (System)</option>
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                        </Select>
                      </div>
                    </SettingsItem>
                    
                    <SettingsSwitchItem
                      label="Word Wrap"
                      description="Wrap long lines to fit the editor width."
                      checked={core.settings.settings.isWordWrapEnabled}
                      onCheckedChange={(checked) => core.settings.updateSettings({ isWordWrapEnabled: checked })}
                    />
                  </div>
                </section>
              </div>
            </Show>

            <Show when={activeTab() === "Editor"}>
              <div class="max-w-xl flex flex-col gap-8 animate-in fade-in duration-300">
                <section>
                  <div class="text-sm text-on-surface-variant bg-surface-variant/50 border border-outline-variant rounded-lg p-4">
                    Editor settings coming soon...
                  </div>
                </section>
              </div>
            </Show>

            <Show when={activeTab() === "Execution"}>
              <div class="max-w-xl flex flex-col gap-8 animate-in fade-in duration-300">
                <section>
                  <div class="flex flex-col divide-y divide-outline-variant/50 border-y border-outline-variant/50">
                    <SettingsSwitchItem
                      label="Auto-run on type"
                      description="Execute code automatically after a short delay."
                      checked={core.settings.settings.isAutoRunEnabled}
                      onCheckedChange={(checked) => core.settings.updateSettings({ isAutoRunEnabled: checked })}
                    />
                    <SettingsSwitchItem
                      label="Clear console on run"
                      description="Wipe previous output before executing."
                      checked={core.settings.settings.isClearOnRunEnabled}
                      onCheckedChange={(checked) => core.settings.updateSettings({ isClearOnRunEnabled: checked })}
                    />
                  </div>
                </section>
              </div>
            </Show>

            <Show when={activeTab() === "About"}>
              <div class="max-w-xl flex flex-col gap-8 animate-in fade-in duration-300">
                <section>
                  <div class="text-sm text-on-surface-variant bg-surface-variant/50 border border-outline-variant rounded-lg p-4">
                    Glyphide Editor v1.0.0
                  </div>
                </section>
              </div>
            </Show>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { SettingsModal, type SettingsModalProps };

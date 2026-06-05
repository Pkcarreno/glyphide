import X from "lucide-solid/icons/x";
import type { JSX } from "solid-js";
import { createSignal, createUniqueId, For, Show, splitProps } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { cn } from "../../helpers/cn.ts";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
} from "../atoms/Dialog.tsx";
import { Icon } from "../atoms/Icon.tsx";
import { Select } from "../atoms/Select.tsx";
import { Switch } from "../atoms/Switch.tsx";

/* ---------- Internal Composables ---------- */

interface SettingsItemProps {
  children?: JSX.Element;
  class?: string;
  description?: string;
  forId?: string;
  label: string;
}

function SettingsItem(props: SettingsItemProps) {
  return (
    <div
      class={cn(
        "flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center",
        props.class
      )}
    >
      <div class="flex flex-col gap-1.5 pr-4">
        <label
          class="cursor-pointer font-medium text-on-surface text-sm"
          for={props.forId}
        >
          {props.label}
        </label>
        <Show when={props.description}>
          <span class="text-on-surface-variant text-sm leading-relaxed">
            {props.description}
          </span>
        </Show>
      </div>
      <div class="flex shrink-0 items-center">{props.children}</div>
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
    <SettingsItem
      class={props.class}
      description={props.description}
      forId={id}
      label={props.label}
    >
      <Switch
        aria-label={props.label}
        checked={props.checked}
        id={id}
        onCheckedChange={props.onCheckedChange}
      />
    </SettingsItem>
  );
}

function SettingsNumberItem(props: {
  label: string;
  description?: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onValueChange: (v: number) => void;
  class?: string;
}) {
  const id = createUniqueId();
  const step = props.step ?? 1;

  const handleDecrement = () => {
    const next = Number((props.value - step).toFixed(2));
    if (props.min !== undefined && next < props.min) {
      return;
    }
    props.onValueChange(next);
  };

  const handleIncrement = () => {
    const next = Number((props.value + step).toFixed(2));
    if (props.max !== undefined && next > props.max) {
      return;
    }
    props.onValueChange(next);
  };

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const val = Number.parseFloat(target.value);
    if (!Number.isNaN(val)) {
      props.onValueChange(val);
    }
  };

  return (
    <SettingsItem
      class={props.class}
      description={props.description}
      forId={id}
      label={props.label}
    >
      <div class="flex items-center overflow-hidden rounded-lg border border-outline-variant bg-surface-variant">
        <button
          aria-label="Decrease"
          class="flex h-8 w-8 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface hover:text-on-surface"
          onClick={handleDecrement}
          type="button"
        >
          -
        </button>
        <input
          class="h-8 w-16 bg-transparent text-center text-on-surface text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          id={id}
          max={props.max}
          min={props.min}
          onChange={handleChange}
          step={step}
          type="number"
          value={props.value}
        />
        <button
          aria-label="Increase"
          class="flex h-8 w-8 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface hover:text-on-surface"
          onClick={handleIncrement}
          type="button"
        >
          +
        </button>
      </div>
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
      <DialogContent
        class={cn(
          "relative flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden p-0 md:flex-row",
          local.class
        )}
        {...rest}
      >
        <DialogClose
          aria-label="Close settings"
          class="absolute top-2 right-2 z-10 rounded-lg border border-outline-variant bg-background p-1.5 text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface md:hidden"
        >
          <Icon icon={X} size={16} />
        </DialogClose>

        <div class="scrollbar-hide w-full shrink-0 overflow-x-auto border-outline-variant border-b bg-surface-variant/30 px-3 pt-4 pb-2 md:w-56 md:overflow-y-auto md:overflow-x-visible md:border-r md:border-b-0 md:p-4">
          <h2 class="mb-3 px-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wider">
            Settings
          </h2>
          <nav class="flex w-max flex-row gap-1 md:w-auto md:flex-col">
            <For each={tabs}>
              {(tab) => (
                <button
                  class={cn(
                    "rounded-lg px-3 py-2 text-left font-medium text-sm transition-colors",
                    activeTab() === tab
                      ? "border border-outline-variant bg-surface-variant text-on-surface shadow-sm"
                      : "border border-transparent text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface"
                  )}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {tab}
                </button>
              )}
            </For>
          </nav>
        </div>

        <div class="flex min-w-0 flex-1 flex-col bg-background">
          <DialogHeader class="hidden shrink-0 justify-end border-outline-variant border-b p-3 md:flex">
            <DialogClose
              aria-label="Close settings"
              class="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface"
            >
              <Icon icon={X} size={16} />
            </DialogClose>
          </DialogHeader>

          <div class="flex-1 overflow-y-auto p-6 md:p-8">
            <Show when={activeTab() === "Appearance"}>
              <div class="fade-in flex max-w-xl animate-in flex-col gap-8 duration-300">
                <section>
                  <div class="flex flex-col divide-y divide-outline-variant/50 border-outline-variant/50 border-y">
                    <SettingsItem
                      description="Select the color theme for the editor interface."
                      forId="theme-select"
                      label="Theme Preference"
                    >
                      <div class="w-40">
                        <Select
                          id="theme-select"
                          onChange={(e) =>
                            core.settings.updateSettings({
                              theme: e.currentTarget.value as
                                | "light"
                                | "dark"
                                | "system",
                            })
                          }
                          value={core.settings.settings.theme}
                        >
                          <option value="system">Auto (System)</option>
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                        </Select>
                      </div>
                    </SettingsItem>

                    <SettingsNumberItem
                      description="Base font size for the editor interface (px)."
                      label="Interface Font Size"
                      max={24}
                      min={10}
                      onValueChange={(val) =>
                        core.settings.updateSettings({ uiFontSize: val })
                      }
                      step={1}
                      value={core.settings.settings.uiFontSize}
                    />

                    <SettingsSwitchItem
                      checked={core.settings.settings.isWordWrapEnabled}
                      description="Wrap long lines to fit the editor width."
                      label="Word Wrap"
                      onCheckedChange={(checked) =>
                        core.settings.updateSettings({
                          isWordWrapEnabled: checked,
                        })
                      }
                    />
                  </div>
                </section>
              </div>
            </Show>

            <Show when={activeTab() === "Editor"}>
              <div class="fade-in flex max-w-xl animate-in flex-col gap-8 duration-300">
                <section>
                  <div class="flex flex-col divide-y divide-outline-variant/50 border-outline-variant/50 border-y">
                    <SettingsNumberItem
                      description="Base font size for the code editor (px)."
                      label="Buffer Font Size"
                      max={32}
                      min={8}
                      onValueChange={(val) =>
                        core.settings.updateSettings({ bufferFontSize: val })
                      }
                      step={1}
                      value={core.settings.settings.bufferFontSize}
                    />
                    <SettingsNumberItem
                      description="Line height multiplier for the code editor."
                      label="Buffer Line Height"
                      max={2.5}
                      min={1}
                      onValueChange={(val) =>
                        core.settings.updateSettings({ bufferLineHeight: val })
                      }
                      step={0.1}
                      value={core.settings.settings.bufferLineHeight}
                    />
                  </div>
                </section>
              </div>
            </Show>

            <Show when={activeTab() === "Execution"}>
              <div class="fade-in flex max-w-xl animate-in flex-col gap-8 duration-300">
                <section>
                  <div class="flex flex-col divide-y divide-outline-variant/50 border-outline-variant/50 border-y">
                    <SettingsSwitchItem
                      checked={core.settings.settings.isAutoRunEnabled}
                      description="Execute code automatically after a short delay."
                      label="Auto-run on type"
                      onCheckedChange={(checked) =>
                        core.settings.updateSettings({
                          isAutoRunEnabled: checked,
                        })
                      }
                    />
                    <SettingsSwitchItem
                      checked={core.settings.settings.isClearOnRunEnabled}
                      description="Wipe previous output before executing."
                      label="Clear console on run"
                      onCheckedChange={(checked) =>
                        core.settings.updateSettings({
                          isClearOnRunEnabled: checked,
                        })
                      }
                    />
                  </div>
                </section>
              </div>
            </Show>

            <Show when={activeTab() === "About"}>
              <div class="fade-in flex max-w-xl animate-in flex-col gap-8 duration-300">
                <section>
                  <div class="rounded-lg border border-outline-variant bg-surface-variant/50 p-4 text-on-surface-variant text-sm">
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

import Undo from "lucide-solid/icons/undo-2";
import X from "lucide-solid/icons/x";
import type { JSX } from "solid-js";
import { createSignal, createUniqueId, For, Show, splitProps } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { DEFAULT_SETTINGS } from "../../core/models/settings.ts";
import { cn } from "../../helpers/cn.ts";
import { Icon } from "../atoms/Icon.tsx";
import { Select } from "../atoms/Select.tsx";
import { StepperInput } from "../atoms/StepperInput.tsx";
import { Switch } from "../atoms/Switch.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
} from "../molecules/Dialog.tsx";

/* ---------- Internal Composables ---------- */

interface SettingsItemProps {
  children?: JSX.Element;
  class?: string;
  description?: string;
  forId?: string;
  isModified?: boolean;
  label: string;
  onReset?: () => void;
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
        <div class="flex items-center gap-2">
          <label
            class="cursor-pointer font-medium text-on-surface text-sm"
            for={props.forId}
          >
            {props.label}
          </label>
          <Show when={props.isModified}>
            <button
              aria-label={`Reset ${props.label} to default`}
              class="flex h-5 w-5 items-center justify-center rounded-md text-on-surface-variant/50 transition-colors hover:bg-surface-variant hover:text-on-surface"
              onClick={props.onReset}
              title="Reset to default"
              type="button"
            >
              <Icon icon={Undo} size={12} />
            </button>
          </Show>
        </div>
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
  isModified?: boolean;
  onReset?: () => void;
  class?: string;
}) {
  const id = createUniqueId();
  return (
    <SettingsItem
      class={props.class}
      description={props.description}
      forId={id}
      isModified={props.isModified}
      label={props.label}
      onReset={props.onReset}
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
  isModified?: boolean;
  onReset?: () => void;
  class?: string;
}) {
  const id = createUniqueId();
  return (
    <SettingsItem
      class={props.class}
      description={props.description}
      forId={id}
      isModified={props.isModified}
      label={props.label}
      onReset={props.onReset}
    >
      <StepperInput
        id={id}
        inputAriaLabel={props.label}
        max={props.max}
        min={props.min}
        onValueChange={props.onValueChange}
        step={props.step}
        value={props.value}
      />
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
          class="absolute top-3 right-3 md:hidden"
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
            <DialogClose aria-label="Close settings">
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
                      isModified={
                        core.settings.settings.theme !== DEFAULT_SETTINGS.theme
                      }
                      label="Theme Preference"
                      onReset={() => core.settings.resetSetting("theme")}
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
                      isModified={
                        core.settings.settings.uiFontSize !==
                        DEFAULT_SETTINGS.uiFontSize
                      }
                      label="Interface Font Size"
                      max={24}
                      min={10}
                      onReset={() => core.settings.resetSetting("uiFontSize")}
                      onValueChange={(val) =>
                        core.settings.updateSettings({ uiFontSize: val })
                      }
                      step={1}
                      value={core.settings.settings.uiFontSize}
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
                      isModified={
                        core.settings.settings.bufferFontSize !==
                        DEFAULT_SETTINGS.bufferFontSize
                      }
                      label="Buffer Font Size"
                      max={32}
                      min={8}
                      onReset={() =>
                        core.settings.resetSetting("bufferFontSize")
                      }
                      onValueChange={(val) =>
                        core.settings.updateSettings({ bufferFontSize: val })
                      }
                      step={1}
                      value={core.settings.settings.bufferFontSize}
                    />
                    <SettingsNumberItem
                      description="Line height multiplier for the code editor."
                      isModified={
                        core.settings.settings.bufferLineHeight !==
                        DEFAULT_SETTINGS.bufferLineHeight
                      }
                      label="Buffer Line Height"
                      max={2.5}
                      min={1}
                      onReset={() =>
                        core.settings.resetSetting("bufferLineHeight")
                      }
                      onValueChange={(val) =>
                        core.settings.updateSettings({ bufferLineHeight: val })
                      }
                      step={0.1}
                      value={core.settings.settings.bufferLineHeight}
                    />
                    <SettingsSwitchItem
                      checked={core.settings.settings.isWordWrapEnabled}
                      description="Wrap long lines to fit the editor width."
                      isModified={
                        core.settings.settings.isWordWrapEnabled !==
                        DEFAULT_SETTINGS.isWordWrapEnabled
                      }
                      label="Word Wrap"
                      onCheckedChange={(checked) =>
                        core.settings.updateSettings({
                          isWordWrapEnabled: checked,
                        })
                      }
                      onReset={() =>
                        core.settings.resetSetting("isWordWrapEnabled")
                      }
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
                      isModified={
                        core.settings.settings.isAutoRunEnabled !==
                        DEFAULT_SETTINGS.isAutoRunEnabled
                      }
                      label="Auto-run on type"
                      onCheckedChange={(checked) =>
                        core.settings.updateSettings({
                          isAutoRunEnabled: checked,
                        })
                      }
                      onReset={() =>
                        core.settings.resetSetting("isAutoRunEnabled")
                      }
                    />
                    <SettingsNumberItem
                      description="Delay in milliseconds before executing auto-run."
                      isModified={
                        core.settings.settings.autoRunDelay !==
                        DEFAULT_SETTINGS.autoRunDelay
                      }
                      label="Auto-run delay (ms)"
                      max={5000}
                      min={100}
                      onReset={() => core.settings.resetSetting("autoRunDelay")}
                      onValueChange={(val) =>
                        core.settings.updateSettings({ autoRunDelay: val })
                      }
                      step={50}
                      value={core.settings.settings.autoRunDelay}
                    />
                    <SettingsSwitchItem
                      checked={core.settings.settings.isClearOnRunEnabled}
                      description="Wipe previous output before executing."
                      isModified={
                        core.settings.settings.isClearOnRunEnabled !==
                        DEFAULT_SETTINGS.isClearOnRunEnabled
                      }
                      label="Clear console on run"
                      onCheckedChange={(checked) =>
                        core.settings.updateSettings({
                          isClearOnRunEnabled: checked,
                        })
                      }
                      onReset={() =>
                        core.settings.resetSetting("isClearOnRunEnabled")
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

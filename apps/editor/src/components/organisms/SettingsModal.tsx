import Undo from "lucide-solid/icons/undo-2";
import X from "lucide-solid/icons/x";
import type { ParentProps, VoidProps } from "solid-js";
import { createUniqueId, For, merge, omit, Show } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { DEFAULT_SETTINGS } from "../../core/models/settings.ts";
import { cn } from "../../helpers/cn.ts";
import { Icon } from "../atoms/Icon.tsx";
import { Select } from "../atoms/Select.tsx";
import { StepperInput } from "../atoms/StepperInput.tsx";
import { Switch } from "../atoms/Switch.tsx";
import { Tabs } from "../atoms/Tabs.tsx";
import { OverlayDialog } from "../molecules/OverlayDialog.tsx";

/* ---------- Internal Composables ---------- */

interface SettingsItemProps {
  class?: string;
  description?: string;
  forId?: string;
  isModified?: boolean;
  label: string;
  onReset?: () => void;
}

function SettingsItem(rawProps: ParentProps<SettingsItemProps>) {
  const props = merge({ isModified: false }, rawProps);
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
            class="text-on-surface cursor-pointer text-sm font-medium"
            for={props.forId}
          >
            {props.label}
          </label>
          <Show when={props.isModified}>
            <button
              aria-label={`Reset ${props.label} to default`}
              class="text-on-surface-variant/50 hover:bg-surface-variant hover:text-on-surface focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex h-5 w-5 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-3 aria-invalid:ring-3 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
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

function SettingsSwitchItem(
  rawProps: VoidProps<{
    label: string;
    description?: string;
    checked: boolean;
    onCheckedChange: (c: boolean) => void;
    isModified?: boolean;
    onReset?: () => void;
    class?: string;
  }>
) {
  const props = merge({ isModified: false }, rawProps);
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

function SettingsNumberItem(
  rawProps: VoidProps<{
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
  }>
) {
  const props = merge({ isModified: false }, rawProps);
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

const TABS = ["Appearance", "Editor", "Execution"] as const;

/**
 * Settings modal organism.
 * Displays application settings using high density components and the Tabs primitive.
 */
function SettingsModal(props: VoidProps<SettingsModalProps>) {
  const rest = omit(props, "class");

  const core = useEditor();

  return (
    <OverlayDialog.Root overlayId="settings">
      <OverlayDialog.Content
        class={cn(
          "relative flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden p-0 md:flex-row",
          props.class
        )}
        {...rest}
      >
        <OverlayDialog.Close
          aria-label="Close settings"
          class="absolute top-3 right-3 z-10"
        >
          <Icon icon={X} size={16} />
        </OverlayDialog.Close>

        <Tabs.Root
          class="flex h-full w-full flex-col overflow-hidden md:flex-row"
          defaultValue="Appearance"
        >
          <div class="scrollbar-hide border-outline-variant bg-surface-variant/30 w-full shrink-0 overflow-x-auto border-b px-3 pt-4 pb-2 md:w-56 md:overflow-x-visible md:overflow-y-auto md:border-r md:border-b-0 md:p-4">
            <h2 class="text-on-surface-variant mb-3 px-3 text-xs font-semibold tracking-wider uppercase">
              Settings
            </h2>
            <Tabs.List class="flex-row overflow-x-auto md:flex-col">
              <For each={TABS} keyed={false}>
                {(tab) => (
                  <Tabs.Trigger class="text-center md:text-left" value={tab()}>
                    {tab()}
                  </Tabs.Trigger>
                )}
              </For>
            </Tabs.List>
          </div>

          <div class="bg-background flex min-w-0 flex-1 flex-col">
            <div class="flex w-full flex-1 flex-col overflow-y-auto p-6 pt-8 md:p-8 md:pt-8">
              <Tabs.Content class="w-full" value="Appearance">
                <div class="fade-in animate-in flex w-full flex-col gap-8 duration-300">
                  <section class="w-full">
                    <div class="divide-outline-variant/50 border-outline-variant/50 flex w-full flex-col divide-y border-b">
                      <SettingsItem
                        description="Select the color theme for the editor interface."
                        forId="theme-select"
                        isModified={
                          core.settings.settings.theme !==
                          DEFAULT_SETTINGS.theme
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
              </Tabs.Content>

              <Tabs.Content class="w-full" value="Editor">
                <div class="fade-in animate-in flex w-full flex-col gap-8 duration-300">
                  <section class="w-full">
                    <div class="divide-outline-variant/50 border-outline-variant/50 flex w-full flex-col divide-y border-b">
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
                          core.settings.updateSettings({
                            bufferLineHeight: val,
                          })
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
                      <SettingsSwitchItem
                        checked={core.settings.settings.isDefaultCodeEnabled}
                        description="Show a guided tour snippet in new projects so users can see how to print values."
                        isModified={
                          core.settings.settings.isDefaultCodeEnabled !==
                          DEFAULT_SETTINGS.isDefaultCodeEnabled
                        }
                        label="Default Code on New Project"
                        onCheckedChange={(checked) =>
                          core.settings.updateSettings({
                            isDefaultCodeEnabled: checked,
                          })
                        }
                        onReset={() =>
                          core.settings.resetSetting("isDefaultCodeEnabled")
                        }
                      />
                    </div>
                  </section>
                </div>
              </Tabs.Content>

              <Tabs.Content class="w-full" value="Execution">
                <div class="fade-in animate-in flex w-full flex-col gap-8 duration-300">
                  <section class="w-full">
                    <div class="divide-outline-variant/50 border-outline-variant/50 flex w-full flex-col divide-y border-b">
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
                        onReset={() =>
                          core.settings.resetSetting("autoRunDelay")
                        }
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
              </Tabs.Content>
            </div>
          </div>
        </Tabs.Root>
      </OverlayDialog.Content>
    </OverlayDialog.Root>
  );
}

/** @public */
export { SettingsModal, type SettingsModalProps };

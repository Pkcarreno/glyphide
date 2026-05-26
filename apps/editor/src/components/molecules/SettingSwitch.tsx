import { splitProps, createUniqueId } from "solid-js";
import { Switch, type SwitchProps } from "../atoms/Switch";
import { cn } from "../../helpers/cn";

interface SettingSwitchProps extends Omit<SwitchProps, "id"> {
  /** The primary label text for the setting. */
  label: string;
  /** Optional secondary text describing the setting. */
  description?: string;
  class?: string;
}

/**
 * A composed setting item that pairs a label (and optional description)
 * with a Switch component. Handles accessible linking between the text and the switch.
 */
function SettingSwitch(props: SettingSwitchProps) {
  const [local, rest] = splitProps(props, [
    "label",
    "description",
    "class",
    "disabled",
  ]);

  const id = createUniqueId();
  const descId = local.description ? `${id}-desc` : undefined;

  return (
    <div
      class={cn(
        "flex items-center justify-between py-2 gap-4",
        local.disabled && "opacity-50",
        local.class,
      )}
    >
      <div class="flex flex-col gap-1">
        <label
          for={id}
          class={cn(
            "font-sans text-ui-label text-on-surface",
            !local.disabled && "cursor-pointer",
          )}
        >
          {local.label}
        </label>
        {local.description && (
          <span
            id={descId}
            class="font-sans text-status-bar text-on-surface-variant"
          >
            {local.description}
          </span>
        )}
      </div>
      <Switch
        id={id}
        disabled={local.disabled}
        aria-label={local.label}
        aria-describedby={descId}
        class="shrink-0"
        {...rest}
      />
    </div>
  );
}

export { SettingSwitch, type SettingSwitchProps };

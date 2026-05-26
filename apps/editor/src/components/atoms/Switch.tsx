import { createSignal, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../helpers/cn";

const switchVariants = cva(
  "relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-sm border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      checked: {
        true: "bg-primary",
        false: "bg-surface-variant hover:bg-outline-variant",
      },
    },
    defaultVariants: {
      checked: false,
    },
  }
);

const thumbVariants = cva(
  "pointer-events-none block h-3 w-3 rounded-sm shadow-none ring-0 transition-transform",
  {
    variants: {
      checked: {
        true: "translate-x-[14px] bg-on-primary",
        false: "translate-x-[2px] bg-on-surface",
      },
    },
    defaultVariants: {
      checked: false,
    },
  }
);

/**
 * Props for the Switch component.
 */
interface SwitchProps extends VariantProps<typeof switchVariants> {
  /** Controlled checked state. */
  checked?: boolean;
  /** Default checked state for uncontrolled usage. */
  defaultChecked?: boolean;
  /** Fires when toggle state changes. */
  onCheckedChange?: (checked: boolean) => void;
  /** Disables the switch. */
  disabled?: boolean;
  /** Additional CSS classes. */
  class?: string;
  /** Accessible label for screen readers. */
  "aria-label"?: string;
  id?: string;
}

/**
 * Toggle switch primitive. Renders as a button with role="switch"
 * for accessibility. Supports both controlled and uncontrolled usage.
 */
function Switch(props: SwitchProps) {
  const [local, rest] = splitProps(props, [
    "checked",
    "defaultChecked",
    "onCheckedChange",
    "disabled",
    "class",
  ]);

  const isControlled = () => local.checked !== undefined;
  const [internalChecked, setInternalChecked] = createSignal(
    local.defaultChecked ?? false,
  );

  const isChecked = () =>
    isControlled() ? local.checked! : internalChecked();

  function handleToggle() {
    if (local.disabled) return;
    const next = !isChecked();
    if (!isControlled()) {
      setInternalChecked(next);
    }
    local.onCheckedChange?.(next);
  }

  return (
    <button
      role="switch"
      type="button"
      aria-checked={isChecked()}
      disabled={local.disabled}
      onClick={handleToggle}
      class={cn(switchVariants({ checked: isChecked(), class: local.class }))}
      {...rest}
    >
      <span
        class={cn(thumbVariants({ checked: isChecked() }))}
      />
    </button>
  );
}

export { Switch, type SwitchProps };

import { cva, type VariantProps } from "class-variance-authority";
import { createSignal, splitProps } from "solid-js";
import { cn } from "../../helpers/cn.ts";

const switchVariants = cva(
  "relative inline-flex h-4 pointer-coarse:h-7 pointer-coarse:w-11 w-7 shrink-0 cursor-pointer items-center rounded-sm border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50",
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
  "pointer-events-none block h-3 pointer-coarse:h-4 pointer-coarse:w-4 w-3 rounded-sm shadow-none ring-0 transition-transform",
  {
    variants: {
      checked: {
        true: "pointer-coarse:translate-x-6 translate-x-[14px] bg-on-primary",
        false: "pointer-coarse:translate-x-1 translate-x-[2px] bg-on-surface",
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
  /** Accessible label for screen readers. */
  "aria-label"?: string;
  /** Controlled checked state. */
  checked?: boolean;
  /** Additional CSS classes. */
  class?: string;
  /** Default checked state for uncontrolled usage. */
  defaultChecked?: boolean;
  /** Disables the switch. */
  disabled?: boolean;
  id?: string;
  /** Fires when toggle state changes. */
  onCheckedChange?: (checked: boolean) => void;
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
    local.defaultChecked ?? false
  );

  const isChecked = () =>
    isControlled() ? (local.checked ?? false) : internalChecked();

  function handleToggle() {
    if (local.disabled) {
      return;
    }
    const next = !isChecked();
    if (!isControlled()) {
      setInternalChecked(next);
    }
    local.onCheckedChange?.(next);
  }

  return (
    <button
      aria-checked={isChecked()}
      class={cn(switchVariants({ checked: isChecked(), class: local.class }))}
      disabled={local.disabled}
      onClick={handleToggle}
      role="switch"
      type="button"
      {...rest}
    >
      <span class={cn(thumbVariants({ checked: isChecked() }))} />
    </button>
  );
}

export { Switch, type SwitchProps };

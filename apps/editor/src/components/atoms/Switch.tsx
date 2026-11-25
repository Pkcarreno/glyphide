import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { createSignal, omit, untrack } from "solid-js";
import { cn } from "../../helpers/cn.ts";

const switchVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-offset-surface aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-sm border border-transparent transition-colors outline-none focus-visible:ring-3 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 pointer-coarse:h-7 pointer-coarse:w-11",
  {
    defaultVariants: {
      checked: false,
    },
    variants: {
      checked: {
        false: "bg-surface-variant hover:bg-outline-variant",
        true: "bg-primary",
      },
    },
  }
);

const thumbVariants = cva(
  "pointer-events-none block h-3 w-3 rounded-sm shadow-none ring-0 transition-transform pointer-coarse:h-4 pointer-coarse:w-4",
  {
    defaultVariants: {
      checked: false,
    },
    variants: {
      checked: {
        false: "bg-on-surface translate-x-[2px] pointer-coarse:translate-x-1",
        true: "bg-on-primary translate-x-[14px] pointer-coarse:translate-x-6",
      },
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
  const rest = omit(
    props,
    "checked",
    "defaultChecked",
    "onCheckedChange",
    "disabled",
    "class"
  );

  const isControlled = () => props.checked !== undefined;
  const [internalChecked, setInternalChecked] = createSignal(
    untrack(() => props.defaultChecked ?? false)
  );

  const isChecked = () =>
    isControlled() ? (props.checked ?? false) : internalChecked();

  function handleToggle() {
    if (props.disabled) {
      return;
    }
    const next = !isChecked();
    if (!isControlled()) {
      setInternalChecked(next);
    }
    props.onCheckedChange?.(next);
  }

  return (
    <button
      aria-checked={isChecked() ? "true" : "false"}
      class={cn(switchVariants({ checked: isChecked(), class: props.class }))}
      disabled={props.disabled}
      onClick={handleToggle}
      role="switch"
      type="button"
      {...rest}
    >
      <span class={cn(thumbVariants({ checked: isChecked() }))} />
    </button>
  );
}

/** @public */
export { Switch, type SwitchProps };

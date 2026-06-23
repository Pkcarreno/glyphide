import { splitProps } from "solid-js";
import { cn } from "../../helpers/cn.ts";

/** Properties for the CompactNumberInput component. */
export interface CompactNumberInputProps {
  /** Optional CSS classes to apply to the root element. */
  class?: string;
  /** When true, disables the input and stepper buttons. */
  disabled?: boolean;
  /** Maximum allowed value. */
  max?: number;
  /** Minimum allowed value. */
  min?: number;
  /** Callback fired when the numeric value changes. */
  onValueChange: (v: number) => void;
  /** The step increment/decrement amount. Default: 1. */
  step?: number;
  /** The current numeric value. */
  value: number;
}

/**
 * A compact, stylistically minimal number input component with
 * increment/decrement stepper buttons. Designed for dense UI areas.
 */
export function CompactNumberInput(props: CompactNumberInputProps) {
  const [local] = splitProps(props, [
    "class",
    "disabled",
    "value",
    "onValueChange",
    "min",
    "max",
    "step",
  ]);

  const step = () => local.step ?? 1;

  const handleDecrement = () => {
    const next = Number((local.value - step()).toFixed(2));
    if (local.min !== undefined && next < local.min) {
      return;
    }
    local.onValueChange(next);
  };

  const handleIncrement = () => {
    const next = Number((local.value + step()).toFixed(2));
    if (local.max !== undefined && next > local.max) {
      return;
    }
    local.onValueChange(next);
  };

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const val = Number.parseFloat(target.value);
    if (!Number.isNaN(val)) {
      local.onValueChange(val);
    }
  };

  return (
    <div
      class={cn(
        "flex items-center overflow-hidden rounded border border-outline-variant bg-transparent",
        local.disabled && "disabled:opacity-50",
        local.class
      )}
    >
      <button
        aria-label="Decrease"
        class="flex h-5 w-5 shrink-0 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface disabled:opacity-50"
        disabled={
          local.disabled ||
          (local.min !== undefined && local.value <= local.min)
        }
        onClick={handleDecrement}
        type="button"
      >
        -
      </button>
      <input
        class="h-5 w-10 min-w-0 bg-transparent px-0.5 text-center text-on-surface text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        disabled={local.disabled}
        max={local.max}
        min={local.min}
        onChange={handleChange}
        step={step()}
        type="number"
        value={local.value}
      />
      <button
        aria-label="Increase"
        class="flex h-5 w-5 shrink-0 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface disabled:opacity-50"
        disabled={
          local.disabled ||
          (local.max !== undefined && local.value >= local.max)
        }
        onClick={handleIncrement}
        type="button"
      >
        +
      </button>
    </div>
  );
}

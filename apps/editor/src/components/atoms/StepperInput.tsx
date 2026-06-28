import Minus from "lucide-solid/icons/minus";
import Plus from "lucide-solid/icons/plus";
import { splitProps } from "solid-js";
import { cn } from "../../helpers/cn.ts";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "./InputGroup.tsx";

/** Properties for the StepperInput component. */
export interface StepperInputProps {
  /** Optional CSS classes to apply to the root element. */
  class?: string;
  /** When true, disables the input and stepper buttons. */
  disabled?: boolean;
  /** Optional ID for the input element (useful for label association). */
  id?: string;
  /** Accessible label for the input. Defaults to "Numeric input". */
  inputAriaLabel?: string;
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
 * Numeric input with increment/decrement stepper buttons.
 * Built on top of InputGroup compound component for consistent
 * styling and reusability.
 */
export function StepperInput(props: StepperInputProps) {
  const [local] = splitProps(props, [
    "class",
    "disabled",
    "value",
    "onValueChange",
    "min",
    "max",
    "step",
    "id",
    "inputAriaLabel",
  ]);

  const step = () => local.step ?? 1;
  const isAtMin = () => local.min !== undefined && local.value <= local.min;
  const isAtMax = () => local.max !== undefined && local.value >= local.max;

  const handleDecrement = () => {
    const next = Number((local.value - step()).toFixed(2));
    if (isAtMin()) {
      return;
    }
    local.onValueChange(next);
  };

  const handleIncrement = () => {
    const next = Number((local.value + step()).toFixed(2));
    if (isAtMax()) {
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
    <InputGroup class={cn(local.disabled && "opacity-50", local.class)}>
      <InputGroupAddon align="inline-start">
        <InputGroupButton
          aria-label="Decrease"
          disabled={local.disabled || isAtMin()}
          onClick={handleDecrement}
        >
          <Minus />
        </InputGroupButton>
      </InputGroupAddon>
      <InputGroupInput
        aria-label={local.inputAriaLabel ?? "Numeric input"}
        class="text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        disabled={local.disabled}
        id={local.id}
        max={local.max}
        min={local.min}
        onChange={handleChange}
        role="spinbutton"
        step={step()}
        type="number"
        value={local.value}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-label="Increase"
          disabled={local.disabled || isAtMax()}
          onClick={handleIncrement}
        >
          <Plus />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

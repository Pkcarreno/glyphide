import Minus from "lucide-solid/icons/minus";
import Plus from "lucide-solid/icons/plus";
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
  const step = () => props.step ?? 1;
  const isAtMin = () => props.min !== undefined && props.value <= props.min;
  const isAtMax = () => props.max !== undefined && props.value >= props.max;

  const handleDecrement = () => {
    const next = Number((props.value - step()).toFixed(2));
    if (isAtMin()) {
      return;
    }
    props.onValueChange(next);
  };

  const handleIncrement = () => {
    const next = Number((props.value + step()).toFixed(2));
    if (isAtMax()) {
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
    <InputGroup class={cn(props.disabled && "opacity-50", props.class)}>
      <InputGroupAddon align="inline-start">
        <InputGroupButton
          aria-label="Decrease"
          class="pointer-coarse:size-11 pointer-coarse:justify-center pointer-coarse:p-2"
          disabled={props.disabled || isAtMin()}
          onClick={handleDecrement}
        >
          <Minus />
        </InputGroupButton>
      </InputGroupAddon>
      <InputGroupInput
        aria-label={props.inputAriaLabel ?? "Numeric input"}
        class="[appearance:textfield] text-center tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        disabled={props.disabled}
        id={props.id}
        max={props.max}
        min={props.min}
        onChange={handleChange}
        role="spinbutton"
        step={step()}
        type="number"
        value={props.value}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-label="Increase"
          class="pointer-coarse:size-11 pointer-coarse:justify-center pointer-coarse:p-2"
          disabled={props.disabled || isAtMax()}
          onClick={handleIncrement}
        >
          <Plus />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

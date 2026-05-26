import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { Button, type ButtonProps } from "../atoms/Button";
import { ButtonGroup } from "../atoms/ButtonGroup";
import { Icon } from "../atoms/Icon";
import { ChevronDown } from "lucide-solid";

interface SplitButtonProps extends Omit<ButtonProps, "onClick"> {
  /** Text or element to show on the main button. */
  children: JSX.Element;
  /** Action executed when the main button is clicked. */
  onMainClick?: () => void;
  /** Action executed when the dropdown/secondary button is clicked. */
  onDropdownClick?: () => void;
  /** Accessible label for the dropdown button. */
  dropdownLabel?: string;
  class?: string;
}

/**
 * A composite button with a main action area and a secondary
 * dropdown action area, rendered as a ButtonGroup.
 */
function SplitButton(props: SplitButtonProps) {
  const [local, rest] = splitProps(props, [
    "children",
    "onMainClick",
    "onDropdownClick",
    "dropdownLabel",
    "class",
    "variant",
    "size",
    "disabled",
  ]);

  return (
    <ButtonGroup class={local.class}>
      <Button
        variant={local.variant}
        size={local.size}
        disabled={local.disabled}
        onClick={local.onMainClick}
        {...rest}
      >
        {local.children}
      </Button>
      <Button
        variant={local.variant}
        size="icon"
        disabled={local.disabled}
        onClick={local.onDropdownClick}
        aria-label={local.dropdownLabel ?? "More options"}
      >
        <Icon icon={ChevronDown} />
      </Button>
    </ButtonGroup>
  );
}

export { SplitButton, type SplitButtonProps };

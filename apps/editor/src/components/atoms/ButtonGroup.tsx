import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../../helpers/cn";

interface ButtonGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  class?: string;
}

/**
 * Groups multiple buttons into a single visual unit
 * with a shared border and dividers.
 */
function ButtonGroup(props: ButtonGroupProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      role="group"
      class={cn(
        "inline-flex rounded-sm border border-outline-variant overflow-hidden",
        "bg-surface-variant",
        "[&>*+*]:border-l [&>*+*]:border-outline-variant",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export { ButtonGroup, type ButtonGroupProps };

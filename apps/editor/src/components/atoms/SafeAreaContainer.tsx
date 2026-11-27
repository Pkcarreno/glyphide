import type { JSX } from "@solidjs/web";
import type { ParentProps } from "solid-js";
import { omit } from "solid-js";
import { cn } from "../../helpers/cn.ts";

interface SafeAreaContainerProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  class?: string;
}

/**
 * Atom component that wraps children with safe-area padding for mobile devices.
 * Applies env(safe-area-inset-*) padding to prevent content clipping by notches.
 */
function SafeAreaContainer(props: ParentProps<SafeAreaContainerProps>) {
  const rest = omit(props, "class", "children");

  return (
    <div
      class={cn(
        "pt-safearea-t pr-safearea-r pb-safearea-b pl-safearea-l",
        props.class
      )}
      {...rest}
    >
      {props.children}
    </div>
  );
}

/** @public */
export { SafeAreaContainer, type SafeAreaContainerProps };

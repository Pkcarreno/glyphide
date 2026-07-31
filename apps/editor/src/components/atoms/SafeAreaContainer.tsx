import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../../helpers/cn.ts";

interface SafeAreaContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  class?: string;
}

/**
 * Atom component that wraps children with safe-area padding for mobile devices.
 * Applies env(safe-area-inset-*) padding to prevent content clipping by notches.
 */
function SafeAreaContainer(props: SafeAreaContainerProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn(
        "pt-safearea-t pr-safearea-r pb-safearea-b pl-safearea-l",
        local.class
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

/** @public */
export { SafeAreaContainer, type SafeAreaContainerProps };

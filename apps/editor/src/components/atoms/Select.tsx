import type { JSX } from "@solidjs/web";
import ChevronDown from "lucide-solid/icons/chevron-down";
import type { ParentProps } from "solid-js";
import { omit } from "solid-js";
import { cn } from "../../helpers/cn.ts";
import { Icon } from "./Icon.tsx";

/**
 * Extended HTML select properties for the custom Select component.
 * Maintains native select behavior while allowing custom utility classes.
 */
export interface SelectProps
  extends Omit<JSX.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  class?: string;
}

/**
 * Standard accessible HTML Select component styled for the editor.
 * Uses native `<select>` structure to guarantee a11y compliance and mobile support,
 * whilst overriding the default appearance to match the application's aesthetic.
 */
export function Select(props: ParentProps<SelectProps>) {
  const rest = omit(props, "class", "children", "value");

  return (
    <div class="relative w-full">
      <select
        class={cn(
          "border-outline-variant bg-surface-variant w-full appearance-none border",
          "text-on-surface h-7 rounded-sm px-2 py-1 pr-8 text-xs",
          "pointer-coarse:h-11 pointer-coarse:px-3 pointer-coarse:text-sm",
          "focus:border-ring focus:ring-ring/50 focus:ring-3 focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "hover:bg-surface-variant/80 cursor-pointer transition-colors",
          props.class
        )}
        // @ts-expect-error: SolidJS requires prop:value for select elements to bind correctly before children render, but TS doesn't type namespaces natively.
        prop:value={props.value}
        {...rest}
      >
        {props.children}
      </select>
      <div class="text-on-surface-variant pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
        <Icon icon={ChevronDown} size={16} />
      </div>
    </div>
  );
}

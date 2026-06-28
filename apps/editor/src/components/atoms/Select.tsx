import ChevronDown from "lucide-solid/icons/chevron-down";
import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../../helpers/cn.ts";
import { Icon } from "./Icon.tsx";

/**
 * Extended HTML select properties for the custom Select component.
 * Maintains native select behavior while allowing custom utility classes.
 */
export interface SelectProps
  extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
  class?: string;
}

/**
 * Standard accessible HTML Select component styled for the editor.
 * Uses native `<select>` structure to guarantee a11y compliance and mobile support,
 * whilst overriding the default appearance to match the application's aesthetic.
 */
export function Select(props: SelectProps) {
  const [local, rest] = splitProps(props, ["class", "children", "value"]);

  return (
    <div class="relative w-full">
      <select
        class={cn(
          "w-full appearance-none border border-outline-variant bg-surface-variant",
          "h-7 rounded-sm px-2 py-1 pr-8 text-on-surface text-xs",
          "focus:outline-none focus:ring-2 focus:ring-primary/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "cursor-pointer transition-colors hover:bg-surface-variant/80",
          local.class
        )}
        // @ts-expect-error: SolidJS requires prop:value for select elements to bind correctly before children render, but TS doesn't type namespaces natively.
        prop:value={local.value}
        {...rest}
      >
        {local.children}
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-on-surface-variant">
        <Icon icon={ChevronDown} size={16} />
      </div>
    </div>
  );
}

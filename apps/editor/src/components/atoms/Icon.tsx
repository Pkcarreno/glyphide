import type { LucideProps } from "lucide-solid";
import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../../helpers/cn.ts";

interface IconProps {
  /** Additional CSS classes. */
  class?: string;
  /** The Lucide icon component to render. */
  icon: (props: LucideProps) => JSX.Element;
  /** Accessible label. If omitted, icon is decorative (aria-hidden). */
  label?: string;
  /** Icon size in pixels. Defaults to 14. */
  size?: number;
}

/**
 * Wrapper over lucide-solid icons that standardizes
 * sizing and accessibility attributes.
 */
function Icon(props: IconProps) {
  const [local] = splitProps(props, ["icon", "size", "class", "label"]);

  return (
    <local.icon
      aria-hidden={!local.label}
      aria-label={local.label}
      class={cn("shrink-0", local.class)}
      size={local.size ?? 14}
    />
  );
}

export { Icon, type IconProps };

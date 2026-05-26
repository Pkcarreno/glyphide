import type { LucideProps } from "lucide-solid";
import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../../helpers/cn";

interface IconProps {
  /** The Lucide icon component to render. */
  icon: (props: LucideProps) => JSX.Element;
  /** Icon size in pixels. Defaults to 14. */
  size?: number;
  /** Additional CSS classes. */
  class?: string;
  /** Accessible label. If omitted, icon is decorative (aria-hidden). */
  label?: string;
}

/**
 * Wrapper over lucide-solid icons that standardizes
 * sizing and accessibility attributes.
 */
function Icon(props: IconProps) {
  const [local] = splitProps(props, ["icon", "size", "class", "label"]);

  return (
    <local.icon
      size={local.size ?? 14}
      class={cn("shrink-0", local.class)}
      aria-hidden={!local.label}
      aria-label={local.label}
    />
  );
}

export { Icon, type IconProps };

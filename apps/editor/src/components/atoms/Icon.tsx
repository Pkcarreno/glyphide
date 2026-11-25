import type { JSX } from "@solidjs/web";
import { dynamic } from "@solidjs/web";
import type { LucideProps } from "lucide-solid";
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
  const IconComponent = dynamic(() => props.icon);

  return (
    <IconComponent
      aria-hidden={props.label ? undefined : "true"}
      aria-label={props.label}
      class={cn("shrink-0", props.class)}
      size={props.size ?? 14}
    />
  );
}

/** @public */
export { Icon, type IconProps };

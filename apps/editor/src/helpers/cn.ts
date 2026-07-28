import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-status-bar",
        "text-section-header",
        "text-ui-label",
        "text-code",
      ],
    },
    theme: {
      spacing: ["safearea-t", "safearea-r", "safearea-b", "safearea-l"],
    },
  },
});

/**
 * Combines class names using `clsx` for conditional logic
 * and `tailwind-merge` for resolving Tailwind CSS conflicts.
 *
 * @example
 * cn("px-2 py-1", isActive && "bg-primary", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return customTwMerge(clsx(inputs));
}

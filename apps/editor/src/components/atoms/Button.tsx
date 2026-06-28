import { cva, type VariantProps } from "class-variance-authority";
import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../../helpers/cn.ts";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center rounded-sm",
    "font-medium font-sans",
    "transition-colors duration-200",
    "cursor-pointer select-none",
    "disabled:pointer-events-none disabled:opacity-50",
    "min-h-[var(--ui-target-size)] min-w-[var(--ui-target-size)]",
    "focus-visible:ring-2 focus-visible:ring-primary/30",
    "[&_svg]:size-3.5",
  ],
  {
    variants: {
      variant: {
        primary: [
          "border border-outline-variant bg-surface-variant",
          "text-on-surface",
          "hover:bg-outline-variant",
        ],
        ghost: [
          "bg-transparent",
          "text-on-surface-variant",
          "hover:bg-surface-variant hover:text-on-surface",
        ],
        outline: [
          "border border-outline-variant bg-transparent",
          "text-on-surface-variant",
          "hover:bg-surface-variant hover:text-on-surface",
        ],
      },
      size: {
        sm: "h-6 gap-1 px-1.5 text-xs",
        md: "h-7 gap-1 px-2 text-xs",
        lg: "h-9 gap-1.5 px-3 py-2 text-sm",
        icon: "h-7 w-7 px-1 text-xs",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  }
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

interface ButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "style">,
    ButtonVariants {
  class?: string;
}

/**
 * Base button primitive with variant and size support.
 * Encapsulates all interactive target sizing
 * and visual states via CVA.
 */
function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, [
    "class",
    "variant",
    "size",
    "children",
  ]);

  return (
    <button
      class={cn(
        buttonVariants({ variant: local.variant, size: local.size }),
        local.class
      )}
      {...rest}
    >
      {local.children}
    </button>
  );
}

export { Button, type ButtonProps, buttonVariants };

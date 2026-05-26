import { cva, type VariantProps } from "class-variance-authority";
import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../../helpers/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center rounded-sm",
    "font-sans text-ui-label font-medium",
    "transition-colors duration-200",
    "cursor-pointer select-none",
    "disabled:pointer-events-none disabled:opacity-50",
    "min-h-[var(--ui-target-size)] min-w-[var(--ui-target-size)]",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-surface-variant border border-outline-variant",
          "text-on-surface",
          "hover:bg-outline-variant",
        ],
        ghost: [
          "bg-transparent",
          "text-on-surface-variant",
          "hover:bg-surface-variant hover:text-on-surface",
        ],
        outline: [
          "bg-transparent border border-outline-variant",
          "text-on-surface-variant",
          "hover:bg-surface-variant hover:text-on-surface",
        ],
      },
      size: {
        sm: "gap-1 px-1.5",
        md: "gap-1 px-2",
        lg: "gap-1.5 px-3",
        icon: "px-1",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  },
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
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </button>
  );
}

export { Button, buttonVariants, type ButtonProps };
